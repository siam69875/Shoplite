import { many, one, run } from '../../db/connection.js';
import { findUserById } from '../users/users.repository.js';
import { ORDER_TEMPLATES, welcomeTemplate } from './notifications.templates.js';

// Emails are not really sent: they are stored in the `notifications` table (an outbox)
// and shown to the user under Account → Inbox.

function saveNotification({ userId, toEmail, event, subject, body }) {
  run(
    'INSERT INTO notifications (user_id, to_email, event, subject, body) VALUES (?, ?, ?, ?, ?)',
    userId, toEmail, event, subject, body,
  );
}

export function sendOrderEmail({ orderId }, event) {
  const order = one(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    orderId,
  );
  const { subject, body } = ORDER_TEMPLATES[event](order);
  saveNotification({ userId: order.user_id, toEmail: order.customer_email, event, subject, body });
}

export function sendWelcomeEmail({ userId }, event) {
  const user = findUserById(userId);
  saveNotification({ userId, toEmail: user.email, event, ...welcomeTemplate(user) });
}

export function listNotifications(userId) {
  return many(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC',
    userId,
  ).map((n) => ({
    id: n.id,
    toEmail: n.to_email,
    event: n.event,
    subject: n.subject,
    body: n.body,
    createdAt: n.created_at,
  }));
}
