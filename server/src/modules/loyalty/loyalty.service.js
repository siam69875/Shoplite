import { many, one, run } from '../../db/connection.js';

// BR-LOY-01: 1 point per full ৳100 of the discounted subtotal (VAT and delivery excluded).
export const TAKA_PER_POINT = 100;

export function pointsForOrder(order) {
  const eligible = order.subtotal - order.discount;
  return Math.floor(eligible / TAKA_PER_POINT);
}

// BR-LOY-02: points are awarded once, when the order is delivered.
export function awardPoints({ orderId }) {
  const order = one('SELECT * FROM orders WHERE id = ?', orderId);
  if (!order || order.points_awarded > 0) return;
  const points = pointsForOrder(order);
  if (points <= 0) return;
  run('INSERT INTO loyalty_ledger (user_id, order_id, points, reason) VALUES (?, ?, ?, ?)',
    order.user_id, orderId, points, 'ORDER_DELIVERED');
  run('UPDATE orders SET points_awarded = ? WHERE id = ?', points, orderId);
}

// BR-LOY-03: points earned from an order are taken back when it is refunded.
export function reversePoints({ orderId }) {
  const order = one('SELECT * FROM orders WHERE id = ?', orderId);
  if (!order || order.points_awarded <= 0) return;
  run('INSERT INTO loyalty_ledger (user_id, order_id, points, reason) VALUES (?, ?, ?, ?)',
    order.user_id, orderId, -order.points_awarded, 'ORDER_REFUNDED');
}

export function getBalance(userId) {
  return one('SELECT COALESCE(SUM(points), 0) AS balance FROM loyalty_ledger WHERE user_id = ?', userId).balance;
}

export function getLedger(userId) {
  return many(
    'SELECT * FROM loyalty_ledger WHERE user_id = ? ORDER BY created_at DESC, id DESC',
    userId,
  ).map((e) => ({ id: e.id, orderId: e.order_id, points: e.points, reason: e.reason, createdAt: e.created_at }));
}
