import { eventBus, EVENTS } from '../../core/eventBus.js';
import { awardPoints, reversePoints } from './loyalty.service.js';

export function registerLoyaltyListeners() {
  eventBus.on(EVENTS.ORDER_DELIVERED, awardPoints);
  eventBus.on(EVENTS.ORDER_REFUNDED, reversePoints);
}
