import { EVENTS } from '../../core/eventBus.js';

export const ORDER_STATUS = {
  PAID: 'PAID',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  ON_HOLD: 'ON_HOLD',
};

// BR-ORD-01: allowed status transitions.
export const ALLOWED_TRANSITIONS = {
  PAID: ['SHIPPED', 'CANCELLED', 'ON_HOLD'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  // Held for a manual check (e.g. suspected fraud), then released to shipping.
  ON_HOLD: ['SHIPPED'],
};

// Every status change publishes exactly one event.
export const STATUS_EVENT = {
  PAID: EVENTS.ORDER_PAID,
  SHIPPED: EVENTS.ORDER_SHIPPED,
  DELIVERED: EVENTS.ORDER_DELIVERED,
  CANCELLED: EVENTS.ORDER_CANCELLED,
  REFUNDED: EVENTS.ORDER_REFUNDED,
  ON_HOLD: EVENTS.ORDER_ON_HOLD,
};

// BR-ORD-04: refunds are allowed up to 30 days after delivery.
export const REFUND_WINDOW_DAYS = 30;

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
