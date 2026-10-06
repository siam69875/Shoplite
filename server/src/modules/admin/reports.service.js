// Admin reports read the orders tables directly (shared data, no service calls).

import { many, one } from '../../db/connection.js';
import { lowStockReport } from '../inventory/inventory.service.js';

// Orders that count as revenue: money was taken and not given back.
const REVENUE_STATUSES = "('PAID', 'SHIPPED', 'DELIVERED')";

export function getSummary() {
  const revenue = one(
    `SELECT COUNT(*) AS orders,
            COALESCE(SUM(total), 0)    AS revenue,
            COALESCE(SUM(tax), 0)      AS tax,
            COALESCE(SUM(discount), 0) AS discount
     FROM orders WHERE status IN ${REVENUE_STATUSES}`,
  );
  const refunded = one(
    `SELECT COALESCE(SUM(total), 0) AS refunded_amount
     FROM orders WHERE status IN ('CANCELLED', 'REFUNDED')`,
  );
  const byStatus = Object.fromEntries(
    many('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').map((r) => [r.status, r.count]),
  );
  const topProducts = many(
    `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) AS units, SUM(oi.line_total) AS sales
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status IN ${REVENUE_STATUSES}
     GROUP BY oi.product_id ORDER BY units DESC, sales DESC LIMIT 5`,
  ).map((r) => ({ productId: r.product_id, name: r.product_name, units: r.units, sales: r.sales }));
  const customers = one("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'").count;

  return {
    revenue: revenue.revenue,
    taxCollected: revenue.tax,
    discountsGiven: revenue.discount,
    refundedAmount: refunded.refunded_amount,
    paidOrderCount: revenue.orders,
    averageOrderValue: revenue.orders ? Math.round(revenue.revenue / revenue.orders) : 0,
    ordersByStatus: byStatus,
    topProducts,
    lowStock: lowStockReport(),
    customerCount: customers,
  };
}
