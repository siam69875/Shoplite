// Store settings shown to shoppers. Every value is read from the module that enforces it,
// so the storefront can never advertise a different number than checkout charges.
import { config } from '../../core/config.js';
import { MAX_QTY_PER_ITEM } from '../cart/cart.service.js';
import { DISTRICTS } from '../checkout/checkout.service.js';
import { findCoupon } from '../coupons/coupons.service.js';
import { TAKA_PER_POINT } from '../loyalty/loyalty.service.js';
import { REFUND_WINDOW_DAYS } from '../orders/order-status.js';
import { BKASH_TEST_OTP } from '../payments/payments.service.js';
import { TAX_RATE } from '../pricing/pricing.service.js';
import { DELIVERY_CHARGE } from '../shipping/shipping.service.js';

// An advertised coupon is only shown while customers can actually use it.
export function activeOffer(code) {
  const c = findCoupon(code);
  if (!c || !c.active) return null;
  if (c.expires_at && new Date(c.expires_at) <= new Date()) return null;
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return null;
  return { code: c.code, type: c.type, value: c.value, minSubtotal: c.min_subtotal };
}

export const welcomeOffer = () => activeOffer(config.store.welcomeCoupon);

export function getStoreInfo() {
  const offers = {};
  for (const code of config.store.advertisedCoupons) {
    const offer = activeOffer(code);
    if (offer) offers[offer.code] = offer;
  }
  return {
    deliveryCharge: DELIVERY_CHARGE,
    deliveryDays: config.store.deliveryDays,
    districtCount: DISTRICTS.length,
    vatPercent: Math.round(TAX_RATE * 100),
    maxQtyPerItem: MAX_QTY_PER_ITEM,
    takaPerPoint: TAKA_PER_POINT,
    refundWindowDays: REFUND_WINDOW_DAYS,
    hotline: config.store.hotline,
    demoBkashOtp: BKASH_TEST_OTP,
    welcomeCoupon: config.store.welcomeCoupon,
    offers,
  };
}
