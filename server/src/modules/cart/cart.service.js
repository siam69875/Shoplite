import { AppError, badRequest, notFound } from '../../core/errors.js';
import { requireInt, requireString } from '../../core/validate.js';
import { many, one, run } from '../../db/connection.js';
import { assertProductExists } from '../catalog/catalog.service.js';
import { validateCoupon } from '../coupons/coupons.service.js';
import { assertAvailable } from '../inventory/inventory.service.js';
import { calculateTotals, lineTotal } from '../pricing/pricing.service.js';

// BR-CART-01: quantity per item must be between 1 and 10.
export const MAX_QTY_PER_ITEM = 10;

function ensureCart(userId) {
  run('INSERT OR IGNORE INTO carts (user_id) VALUES (?)', userId);
}

function loadItems(userId) {
  return many(
    `SELECT ci.product_id, ci.quantity, p.name, p.category, p.price, p.image, i.quantity AS stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN inventory i ON i.product_id = p.id
     WHERE ci.user_id = ?
     ORDER BY ci.added_at, p.id`,
    userId,
  ).map((r) => ({
    productId: r.product_id,
    name: r.name,
    category: r.category,
    image: r.image,
    unitPrice: r.price,
    quantity: r.quantity,
    lineTotal: lineTotal(r.price, r.quantity),
    stock: r.stock,
    available: r.quantity <= r.stock,
  }));
}

export function getCart(userId) {
  ensureCart(userId);
  const items = loadItems(userId);
  const { coupon_code: couponCode } = one('SELECT coupon_code FROM carts WHERE user_id = ?', userId);

  let coupon = null;
  let couponError = null;
  if (couponCode) {
    try {
      coupon = validateCoupon(couponCode, calculateTotals(items).subtotal);
    } catch (err) {
      if (err.code !== 'COUPON_INVALID') throw err;
      couponError = err.message;
    }
  }

  return {
    items,
    couponCode,
    couponError,
    totals: calculateTotals(items, coupon),
  };
}

function quantityInput(value) {
  if (!Number.isInteger(value)) throw badRequest('Quantity must be a whole number');
  if (value < 1) throw badRequest('Quantity must be at least 1');
  if (value > MAX_QTY_PER_ITEM) {
    throw new AppError(400, 'MAX_QUANTITY_EXCEEDED', `You can buy at most ${MAX_QTY_PER_ITEM} of each item`);
  }
  return value;
}

function findItem(userId, productId) {
  return one('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', userId, productId);
}

export function addItem(userId, productId, quantity = 1) {
  requireInt(productId, 'Product id', { min: 1 });
  quantityInput(quantity);
  const product = assertProductExists(productId);
  ensureCart(userId);

  const existing = findItem(userId, productId);
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  quantityInput(newQuantity);
  assertAvailable(productId, newQuantity, product.name);

  if (existing) {
    run('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', newQuantity, userId, productId);
  } else {
    run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', userId, productId, newQuantity);
  }
  return getCart(userId);
}

export function updateItem(userId, productId, quantity) {
  quantityInput(quantity);
  if (!findItem(userId, productId)) throw notFound('Cart item');
  const product = assertProductExists(productId);
  assertAvailable(productId, quantity, product.name);
  run('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', quantity, userId, productId);
  return getCart(userId);
}

export function removeItem(userId, productId) {
  const { changes } = run('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', userId, productId);
  if (changes === 0) throw notFound('Cart item');
  return getCart(userId);
}

// BR-CPN-01: only one coupon per order. Applying a new coupon replaces the previous one.
export function applyCoupon(userId, code) {
  const cleanCode = requireString(code, 'Coupon code', { max: 20 });
  const cart = getCart(userId);
  if (cart.items.length === 0) throw badRequest('Add items to your cart before applying a coupon');
  const coupon = validateCoupon(cleanCode, cart.totals.subtotal);
  run('UPDATE carts SET coupon_code = ? WHERE user_id = ?', coupon.code, userId);
  return getCart(userId);
}

export function removeCoupon(userId) {
  ensureCart(userId);
  run('UPDATE carts SET coupon_code = NULL WHERE user_id = ?', userId);
  return getCart(userId);
}

export function clearCart(userId) {
  run('DELETE FROM cart_items WHERE user_id = ?', userId);
  run('UPDATE carts SET coupon_code = NULL WHERE user_id = ?', userId);
}
