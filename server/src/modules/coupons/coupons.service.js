import { AppError, badRequest, conflict, notFound } from '../../core/errors.js';
import { formatMoney, roundTaka } from '../../core/money.js';
import { requireInt, requireString } from '../../core/validate.js';
import { many, one, run } from '../../db/connection.js';

export const COUPON_TYPES = { PERCENT: 'PERCENT', FIXED: 'FIXED' };

const couponError = (message) => new AppError(400, 'COUPON_INVALID', message);

export function findCoupon(code) {
  if (!code) return null;
  return one('SELECT * FROM coupons WHERE code = ?', String(code).trim()) ?? null;
}

// Validates a coupon against the current cart subtotal (BR-CPN-02, 04, 05, 06).
export function validateCoupon(code, subtotal) {
  const coupon = findCoupon(code);
  if (!coupon || !coupon.active) throw couponError('Invalid coupon code');
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) throw couponError('Coupon expired');
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    throw couponError('Coupon usage limit reached');
  }
  if (subtotal < coupon.min_subtotal) {
    throw couponError(`Minimum order of ${formatMoney(coupon.min_subtotal)} required for this coupon`);
  }
  return coupon;
}

// BR-CPN-03: a discount can never exceed the subtotal.
export function calculateDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const raw = coupon.type === COUPON_TYPES.PERCENT
    ? roundTaka((subtotal * coupon.value) / 100)
    : coupon.value;
  return Math.min(raw, subtotal);
}

export function redeemCoupon(code) {
  const { changes } = run(
    `UPDATE coupons SET used_count = used_count + 1
     WHERE code = ? AND (usage_limit IS NULL OR used_count < usage_limit)`,
    code,
  );
  if (changes === 0) throw couponError('Coupon usage limit reached');
}

export function toCouponDto(c) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.min_subtotal,
    expiresAt: c.expires_at,
    usageLimit: c.usage_limit,
    usedCount: c.used_count,
    active: Boolean(c.active),
  };
}

export function listCoupons() {
  return many('SELECT * FROM coupons ORDER BY created_at DESC, id DESC').map(toCouponDto);
}

export function createCoupon(input) {
  const code = requireString(input.code, 'Code', { min: 3, max: 20 }).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) throw badRequest('Code may only contain letters and numbers');
  if (!Object.values(COUPON_TYPES).includes(input.type)) throw badRequest('Type must be PERCENT or FIXED');
  const value = input.type === COUPON_TYPES.PERCENT
    ? requireInt(input.value, 'Percent value', { min: 1, max: 100 })
    : requireInt(input.value, 'Fixed value (Taka)', { min: 1, max: 100000 });
  const minSubtotal = requireInt(input.minSubtotal ?? 0, 'Minimum subtotal', { min: 0, max: 10000000 });
  const usageLimit = input.usageLimit == null ? null : requireInt(input.usageLimit, 'Usage limit', { min: 1, max: 1000000 });
  let expiresAt = null;
  if (input.expiresAt) {
    const date = new Date(input.expiresAt);
    if (Number.isNaN(date.getTime())) throw badRequest('Expiry date is not valid');
    expiresAt = date.toISOString();
  }
  if (findCoupon(code)) throw conflict('COUPON_EXISTS', 'A coupon with this code already exists');

  const { lastId } = run(
    `INSERT INTO coupons (code, type, value, min_subtotal, expires_at, usage_limit)
     VALUES (?, ?, ?, ?, ?, ?)`,
    code, input.type, value, minSubtotal, expiresAt, usageLimit,
  );
  return toCouponDto(one('SELECT * FROM coupons WHERE id = ?', lastId));
}

export function setCouponActive(id, active) {
  const { changes } = run('UPDATE coupons SET active = ? WHERE id = ?', active ? 1 : 0, id);
  if (changes === 0) throw notFound('Coupon');
  return toCouponDto(one('SELECT * FROM coupons WHERE id = ?', id));
}
