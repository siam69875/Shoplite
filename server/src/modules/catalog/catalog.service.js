import { badRequest, conflict, notFound } from '../../core/errors.js';
import { optionalString, requireInt, requireString } from '../../core/validate.js';
import { many, one, run, transaction } from '../../db/connection.js';
import { createStockRecord, stockStatus } from '../inventory/inventory.service.js';

const PRODUCT_SELECT = `
  SELECT p.*, i.quantity AS stock, i.low_stock_threshold,
         (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id) AS avg_rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count,
         (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = p.id AND o.status IN ('PAID', 'SHIPPED', 'DELIVERED')) AS sold_count
  FROM products p
  JOIN inventory i ON i.product_id = p.id`;

const SORTS = {
  name: 'p.name ASC',
  price_asc: 'p.price ASC, p.name ASC',
  price_desc: 'p.price DESC, p.name ASC',
  newest: 'p.created_at DESC, p.id DESC',
  popular: 'sold_count DESC, review_count DESC, p.name ASC',
  rating: 'avg_rating IS NULL, avg_rating DESC, review_count DESC, p.name ASC',
  discount: '(CAST(p.original_price - p.price AS REAL) / p.original_price) DESC, p.name ASC',
};

export const MAX_PAGE_SIZE = 100;

// BR-CAT-04: discount % shown on sale items = (original − price) / original, rounded down.
export function discountPercent(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.floor(((originalPrice - price) / originalPrice) * 100);
}

export function toProductDto(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    originalPrice: p.original_price,
    discountPercent: discountPercent(p.price, p.original_price),
    image: p.image,
    stock: p.stock,
    stockStatus: stockStatus(p.stock, p.low_stock_threshold),
    lowStockThreshold: p.low_stock_threshold,
    avgRating: p.avg_rating,
    reviewCount: p.review_count,
    soldCount: p.sold_count,
    createdAt: p.created_at,
  };
}

const toInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export function listProducts({ search, category, sort, minPrice, maxPrice, inStock, onSale, limit } = {}) {
  const where = [];
  const params = [];
  if (search && String(search).trim()) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)');
    const term = `%${String(search).trim()}%`;
    params.push(term, term, term);
  }
  if (category && String(category).trim()) {
    where.push('p.category = ?');
    params.push(String(category).trim());
  }
  const min = toInt(minPrice);
  const max = toInt(maxPrice);
  if (min !== null) { where.push('p.price >= ?'); params.push(min); }
  if (max !== null) { where.push('p.price <= ?'); params.push(max); }
  if (inStock === true || inStock === 'true' || inStock === '1') where.push('i.quantity > 0');
  if (onSale === true || onSale === 'true' || onSale === '1') where.push('p.original_price > p.price');

  const orderBy = SORTS[sort] ?? SORTS.name;
  const pageSize = Math.min(Math.max(toInt(limit) ?? MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const sql = `${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy} LIMIT ${pageSize}`;
  return many(sql, ...params).map(toProductDto);
}

export function getProduct(id) {
  const row = one(`${PRODUCT_SELECT} WHERE p.id = ?`, id);
  if (!row) throw notFound('Product');
  return toProductDto(row);
}

export function listCategories() {
  return many('SELECT category AS name, COUNT(*) AS count FROM products GROUP BY category ORDER BY category');
}

function validateProductInput(input) {
  return {
    name: requireString(input.name, 'Name', { min: 2, max: 80 }),
    description: optionalString(input.description, 'Description', { max: 1000 }),
    category: requireString(input.category, 'Category', { min: 2, max: 40 }),
    price: requireInt(input.price, 'Price (Taka)', { min: 1, max: 10000000 }),
    originalPrice: input.originalPrice == null || input.originalPrice === ''
      ? null
      : requireInt(input.originalPrice, 'Original price (Taka)', { min: 1, max: 10000000 }),
    image: optionalString(input.image, 'Image', { max: 8 }) || '📦',
  };
}

function assertSalePrice(p) {
  if (p.originalPrice !== null && p.originalPrice <= p.price) {
    throw badRequest('Original price must be higher than the selling price');
  }
}

export function createProduct(input) {
  const p = validateProductInput(input);
  assertSalePrice(p);
  const stock = requireInt(input.stock ?? 0, 'Stock', { min: 0, max: 100000 });
  return transaction(() => {
    const { lastId } = run(
      'INSERT INTO products (name, description, category, price, original_price, image) VALUES (?, ?, ?, ?, ?, ?)',
      p.name, p.description, p.category, p.price, p.originalPrice, p.image,
    );
    createStockRecord(lastId, stock);
    return getProduct(lastId);
  });
}

export function updateProduct(id, input) {
  getProduct(id);
  const p = validateProductInput(input);
  assertSalePrice(p);
  run(
    'UPDATE products SET name = ?, description = ?, category = ?, price = ?, original_price = ?, image = ? WHERE id = ?',
    p.name, p.description, p.category, p.price, p.originalPrice, p.image, id,
  );
  return getProduct(id);
}

// BR-CAT-02: products that appear in any order cannot be deleted (order history must stay intact).
export function deleteProduct(id) {
  getProduct(id);
  const ordered = one('SELECT 1 AS found FROM order_items WHERE product_id = ? LIMIT 1', id);
  if (ordered) throw conflict('PRODUCT_IN_ORDERS', 'This product has been ordered and cannot be deleted');
  // Deleting a product also removes it from carts, inventory and reviews (ON DELETE CASCADE).
  run('DELETE FROM products WHERE id = ?', id);
}

export function assertProductExists(id) {
  if (!Number.isInteger(id)) throw badRequest('Invalid product id');
  return getProduct(id);
}
