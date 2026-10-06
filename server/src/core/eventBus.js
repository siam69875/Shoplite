// In-process, synchronous event bus.
// Listeners run inside the caller's database transaction, so a failing
// listener rolls back the whole operation that emitted the event.

const listeners = new Map();

export const eventBus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  },

  emit(event, payload) {
    for (const handler of listeners.get(event) ?? []) {
      handler(payload, event);
    }
  },

  listenerCount(event) {
    return listeners.get(event)?.size ?? 0;
  },
};

export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',
};
