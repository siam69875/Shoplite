// Pricing Engine — the single source of truth for every money calculation.
// Used by: Cart, Checkout, Orders (stored totals), Payments (charge amount),
// Loyalty (points base), Admin Reports (revenue).

import { roundTaka } from '../../core/money.js';
import { calculateDiscount } from '../coupons/coupons.service.js';
import { calculateShipping } from '../shipping/shipping.service.js';

export const TAX_RATE = 0.05; // VAT

export function lineTotal(unitPrice, quantity) {
  return unitPrice * quantity;
}

/**
 * @param {{unitPrice:number, quantity:number}[]} items
 * @param {object|null} coupon  a validated coupon row, or null
 *
 * Order of operations (BR-PRC-01):
 *   subtotal → minus coupon discount → VAT on the discounted amount → plus delivery charge
 * VAT is rounded once, on the order level, to the nearest Taka (BR-PRC-02).
 */
export function calculateTotals(items, coupon = null) {
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i.unitPrice, i.quantity), 0);
  const discount = calculateDiscount(coupon, subtotal);
  const taxable = subtotal - discount;
  const tax = roundTaka(taxable * TAX_RATE);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const shipping = calculateShipping({ itemCount, subtotalAfterDiscount: taxable });
  const total = taxable + tax + shipping;

  return { subtotal, discount, tax, shipping, total, itemCount };
}
