import { eventBus, EVENTS } from '../../core/eventBus.js';
import { many } from '../../db/connection.js';
import { restock } from './inventory.service.js';

function returnItemsToStock({ orderId }) {
  const items = many('SELECT product_id, quantity FROM order_items WHERE order_id = ?', orderId);
  for (const item of items) restock(item.product_id, item.quantity);
}

export function registerInventoryListeners() {
  eventBus.on(EVENTS.ORDER_CANCELLED, returnItemsToStock);
  eventBus.on(EVENTS.ORDER_REFUNDED, returnItemsToStock);
}
