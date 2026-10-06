import { badRequest, conflict, notFound } from '../../core/errors.js';
import { eventBus } from '../../core/eventBus.js';
import { many, nowIso, one, run, transaction } from '../../db/connection.js';
import { getPayment, refundPayment } from '../payments/payments.service.js';
import { ROLES } from '../users/users.repository.js';
import { ORDER_STATUS, REFUND_WINDOW_DAYS, STATUS_EVENT, canTransition } from './order-status.js';

export function getOrderRow(id) {
  return one('SELECT * FROM orders WHERE id = ?', id) ?? null;
}

function toOrderSummary(o) {
  return {
    id: o.id,
    userId: o.user_id,
    status: o.status,
    subtotal: o.subtotal,
    discount: o.discount,
    tax: o.tax,
    shipping: o.shipping,
    total: o.total,
    couponCode: o.coupon_code,
    pointsAwarded: o.points_awarded,
    deliveredAt: o.delivered_at,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    ...(o.customer_name !== undefined && { customer: { name: o.customer_name, email: o.customer_email } }),
    ...(o.item_count !== undefined && { itemCount: o.item_count }),
  };
}

export function getOrder(id) {
  const o = getOrderRow(id);
  if (!o) throw notFound('Order');
  const items = many('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', id).map((i) => ({
    productId: i.product_id,
    name: i.product_name,
    unitPrice: i.unit_price,
    quantity: i.quantity,
    lineTotal: i.line_total,
  }));
  const history = many(
    'SELECT from_status, to_status, changed_at FROM order_status_history WHERE order_id = ? ORDER BY id',
    id,
  ).map((h) => ({ from: h.from_status, to: h.to_status, at: h.changed_at }));
  const payment = o.payment_id ? getPayment(o.payment_id) : null;

  return {
    ...toOrderSummary(o),
    shippingAddress: JSON.parse(o.shipping_address),
    items,
    history,
    payment,
    canCancel: o.status === ORDER_STATUS.PAID,
  };
}

// Customers can only see their own orders. Admins can see every order.
export function getOrderForUser(id, user) {
  const o = getOrderRow(id);
  if (!o || (o.user_id !== user.id && user.role !== ROLES.ADMIN)) throw notFound('Order');
  return getOrder(id);
}

export function listOrdersForUser(userId) {
  return many(
    `SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC`,
    userId,
  ).map(toOrderSummary);
}

export function listAllOrders({ status } = {}) {
  if (status && !ORDER_STATUS[status]) throw badRequest('Unknown order status');
  return many(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email,
            (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o JOIN users u ON u.id = o.user_id
     ${status ? 'WHERE o.status = ?' : ''}
     ORDER BY o.created_at DESC, o.id DESC`,
    ...(status ? [status] : []),
  ).map(toOrderSummary);
}

function recordHistory(orderId, from, to, actorId) {
  run(
    'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?)',
    orderId, from, to, actorId,
  );
}

export function createOrder({ userId, items, totals, couponCode, shippingAddress, paymentId }) {
  return transaction(() => {
    const { lastId: orderId } = run(
      `INSERT INTO orders (user_id, status, subtotal, discount, tax, shipping,
                           total, coupon_code, shipping_address, payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId, ORDER_STATUS.PAID, totals.subtotal, totals.discount, totals.tax,
      totals.shipping, totals.total, couponCode, JSON.stringify(shippingAddress), paymentId,
    );
    for (const item of items) {
      run(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        orderId, item.productId, item.name, item.unitPrice, item.quantity, item.lineTotal,
      );
    }
    recordHistory(orderId, null, ORDER_STATUS.PAID, userId);
    eventBus.emit(STATUS_EVENT.PAID, { orderId, userId });
    return orderId;
  });
}

function isWithinRefundWindow(deliveredAt) {
  if (!deliveredAt) return false;
  const ageMs = Date.now() - new Date(deliveredAt).getTime();
  return ageMs <= REFUND_WINDOW_DAYS * 24 * 3600 * 1000;
}

export function changeStatus(orderId, toStatus, actor) {
  if (!ORDER_STATUS[toStatus]) throw badRequest('Unknown order status');

  return transaction(() => {
    const order = getOrderRow(orderId);
    if (!order) throw notFound('Order');
    if (!canTransition(order.status, toStatus)) {
      throw conflict('INVALID_STATUS_TRANSITION', `Cannot change order from ${order.status} to ${toStatus}`);
    }
    if (toStatus === ORDER_STATUS.REFUNDED && !isWithinRefundWindow(order.delivered_at)) {
      throw conflict('REFUND_WINDOW_EXPIRED', `Refunds are only possible within ${REFUND_WINDOW_DAYS} days of delivery`);
    }

    // BR-ORD-03: cancelling or refunding returns the full amount paid.
    if (toStatus === ORDER_STATUS.CANCELLED || toStatus === ORDER_STATUS.REFUNDED) {
      refundPayment(order.payment_id);
    }

    const now = nowIso();
    run(
      `UPDATE orders SET status = ?, updated_at = ?,
              delivered_at = CASE WHEN ? = 'DELIVERED' THEN ? ELSE delivered_at END
       WHERE id = ?`,
      toStatus, now, toStatus, now, orderId,
    );
    recordHistory(orderId, order.status, toStatus, actor.id);

    // Listeners: inventory (restock), loyalty (points), notifications (emails).
    eventBus.emit(STATUS_EVENT[toStatus], { orderId, userId: order.user_id, fromStatus: order.status });

    return getOrder(orderId);
  });
}

// BR-ORD-02: customers may cancel their own order only before it ships.
export function cancelByCustomer(orderId, user) {
  const order = getOrderRow(orderId);
  if (!order || order.user_id !== user.id) throw notFound('Order');
  if (order.status !== ORDER_STATUS.PAID) {
    throw conflict('CANNOT_CANCEL', 'Only orders that have not shipped yet can be cancelled');
  }
  return changeStatus(orderId, ORDER_STATUS.CANCELLED, user);
}

export function hasDeliveredPurchase(userId, productId) {
  return Boolean(one(
    `SELECT 1 AS found FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'DELIVERED' LIMIT 1`,
    userId, productId,
  ));
}
