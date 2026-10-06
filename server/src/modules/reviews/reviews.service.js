import { AppError, conflict } from '../../core/errors.js';
import { optionalString, requireInt } from '../../core/validate.js';
import { many, one, run } from '../../db/connection.js';
import { getProduct } from '../catalog/catalog.service.js';
import { hasDeliveredPurchase } from '../orders/orders.service.js';

export function listReviews(productId) {
  getProduct(productId);
  return many(
    `SELECT r.*, u.name AS author FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? ORDER BY r.created_at DESC, r.id DESC`,
    productId,
  ).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    author: r.author,
    userId: r.user_id,
    createdAt: r.created_at,
  }));
}

function existingReview(userId, productId) {
  return one('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?', userId, productId);
}

// BR-REV-01: only customers with a DELIVERED order containing the product may review it.
// BR-REV-02: one review per customer per product.
export function getEligibility(userId, productId) {
  getProduct(productId);
  if (existingReview(userId, productId)) return { canReview: false, reason: 'You have already reviewed this product' };
  if (!hasDeliveredPurchase(userId, productId)) {
    return { canReview: false, reason: 'Only customers who received this product can review it' };
  }
  return { canReview: true, reason: null };
}

export function createReview(userId, productId, input = {}) {
  getProduct(productId);
  const rating = requireInt(input.rating, 'Rating', { min: 1, max: 5 });
  const comment = optionalString(input.comment, 'Comment', { max: 500 });

  if (!hasDeliveredPurchase(userId, productId)) {
    throw new AppError(403, 'NOT_VERIFIED_BUYER', 'Only customers who received this product can review it');
  }
  if (existingReview(userId, productId)) throw conflict('ALREADY_REVIEWED', 'You have already reviewed this product');

  run('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)', productId, userId, rating, comment);
  return listReviews(productId);
}
