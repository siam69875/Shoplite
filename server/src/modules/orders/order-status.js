import { EVENTS } from '../../core/eventBus.js';

export const ORDER_STATUS = {
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

// BR-ORD-01: allowed status transitions.
export const ALLOWED_TRANSITIONS = {
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Every status change publishes exactly one event.
export const STATUS_EVENT = {
  PAID: EVENTS.ORDER_PAID,
  SHIPPED: EVENTS.ORDER_SHIPPED,
  DELIVERED: EVENTS.ORDER_DELIVERED,
  CANCELLED: EVENTS.ORDER_CANCELLED,
  REFUNDED: EVENTS.ORDER_REFUNDED,
};

// BR-ORD-04: refunds are allowed up to 30 days after delivery.
export const REFUND_WINDOW_DAYS = 30;

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
