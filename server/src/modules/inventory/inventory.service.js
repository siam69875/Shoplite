import { conflict, notFound } from '../../core/errors.js';
import { many, one, run } from '../../db/connection.js';

export const STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

// BR-INV-03: "Only N left" is shown when stock is at or below the low-stock threshold.
export function stockStatus(quantity, lowStockThreshold) {
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= lowStockThreshold) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

export function getStock(productId) {
  const row = one('SELECT quantity FROM inventory WHERE product_id = ?', productId);
  return row ? row.quantity : 0;
}

export function assertAvailable(productId, quantity, productName = 'This product') {
  const available = getStock(productId);
  if (available <= 0) {
    throw conflict('OUT_OF_STOCK', `${productName} is out of stock`);
  }
  if (quantity > available) {
    throw conflict('INSUFFICIENT_STOCK', `Only ${available} of ${productName} available`);
  }
}

// BR-INV-01: stock is deducted when an order is paid (at checkout), never when added to cart.
export function decrementStock(productId, quantity) {
  const { changes } = run(
    `UPDATE inventory SET quantity = quantity - ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE product_id = ? AND quantity >= ?`,
    quantity, productId, quantity,
  );
  if (changes === 0) throw conflict('INSUFFICIENT_STOCK', 'Not enough stock to complete the order');
}

// BR-INV-02: cancelled and refunded orders return their items to stock.
export function restock(productId, quantity) {
  run(
    `UPDATE inventory SET quantity = quantity + ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE product_id = ?`,
    quantity, productId,
  );
}

export function setStock(productId, quantity) {
  const { changes } = run(
    `UPDATE inventory SET quantity = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE product_id = ?`,
    quantity, productId,
  );
  if (changes === 0) throw notFound('Product');
}

export function createStockRecord(productId, quantity, lowStockThreshold = 5) {
  run('INSERT INTO inventory (product_id, quantity, low_stock_threshold) VALUES (?, ?, ?)', productId, quantity, lowStockThreshold);
}

export function lowStockReport() {
  return many(
    `SELECT p.id, p.name, i.quantity, i.low_stock_threshold
     FROM inventory i JOIN products p ON p.id = i.product_id
     WHERE i.quantity <= i.low_stock_threshold
     ORDER BY i.quantity ASC, p.name ASC`,
  ).map((r) => ({ productId: r.id, name: r.name, quantity: r.quantity, threshold: r.low_stock_threshold }));
}
