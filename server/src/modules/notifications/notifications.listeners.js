import { eventBus, EVENTS } from '../../core/eventBus.js';
import { STATUS_EVENT } from '../orders/order-status.js';
import { sendOrderEmail, sendWelcomeEmail } from './notifications.service.js';

export function registerNotificationListeners() {
  eventBus.on(EVENTS.USER_REGISTERED, sendWelcomeEmail);
  // Every order status has a customer email.
  for (const event of Object.values(STATUS_EVENT)) {
    eventBus.on(event, sendOrderEmail);
  }
}
