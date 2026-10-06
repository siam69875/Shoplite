// Checkout orchestrates the purchase across modules:
//   Cart → Inventory (availability) → Coupons (re-validate) → Pricing (totals)
//   → Payments (charge) → Inventory (deduct) → Coupons (redeem) → Orders (create) → Cart (clear)
// Everything runs in one transaction: any failure leaves no order, no charge and no stock change.

import { badRequest } from '../../core/errors.js';
import { requireString } from '../../core/validate.js';
import { transaction } from '../../db/connection.js';
import { clearCart, getCart } from '../cart/cart.service.js';
import { redeemCoupon, validateCoupon } from '../coupons/coupons.service.js';
import { assertAvailable, decrementStock } from '../inventory/inventory.service.js';
import { createOrder, getOrder } from '../orders/orders.service.js';
import { BD_MOBILE_RE, chargePayment } from '../payments/payments.service.js';
import { calculateTotals } from '../pricing/pricing.service.js';

// BR-CHK-01: Bangladeshi delivery address — mobile number 01XXXXXXXXX, 4-digit postcode, a known district.
export const DISTRICTS = [
  'Dhaka', 'Gazipur', 'Narayanganj', 'Chattogram', "Cox's Bazar", 'Cumilla', 'Sylhet', 'Moulvibazar',
  'Rajshahi', 'Bogura', 'Khulna', 'Jashore', 'Barishal', 'Rangpur', 'Dinajpur', 'Mymensingh', 'Tangail', 'Faridpur',
];

export function validateAddress(address = {}) {
  const phone = requireString(address.phone, 'Mobile number', { max: 14 }).replace(/[\s-]/g, '');
  if (!BD_MOBILE_RE.test(phone)) throw badRequest('Mobile number must be 11 digits and start with 01 (e.g. 01712345678)');
  const postalCode = requireString(address.postalCode, 'Postcode', { max: 4 });
  if (!/^\d{4}$/.test(postalCode)) throw badRequest('Postcode must be 4 digits');
  const city = requireString(address.city, 'District', { max: 60 });
  if (!DISTRICTS.includes(city)) throw badRequest('Please choose a district we deliver to');
  return {
    fullName: requireString(address.fullName, 'Full name', { min: 2, max: 60 }),
    phone,
    line1: requireString(address.line1, 'Address', { min: 3, max: 120 }),
    city,
    postalCode,
  };
}

export function placeOrder(userId, { shippingAddress, payment } = {}) {
  const address = validateAddress(shippingAddress);

  return transaction(() => {
    const cart = getCart(userId);
    if (cart.items.length === 0) throw badRequest('Your cart is empty');

    for (const item of cart.items) {
      assertAvailable(item.productId, item.quantity, item.name);
    }

    const coupon = cart.couponCode ? validateCoupon(cart.couponCode, cart.totals.subtotal) : null;
    const totals = calculateTotals(cart.items, coupon);

    const charge = chargePayment({ userId, amount: totals.total, payment });

    for (const item of cart.items) {
      decrementStock(item.productId, item.quantity);
    }
    if (coupon) redeemCoupon(coupon.code);

    const orderId = createOrder({
      userId,
      items: cart.items,
      totals,
      couponCode: coupon?.code ?? null,
      shippingAddress: address,
      paymentId: charge.id,
    });

    clearCart(userId);
    return getOrder(orderId);
  });
}
