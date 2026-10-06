import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { badRequest } from '../../core/errors.js';
import { parseId, requireInt } from '../../core/validate.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from '../catalog/catalog.service.js';
import { createCoupon, listCoupons, setCouponActive } from '../coupons/coupons.service.js';
import { setStock } from '../inventory/inventory.service.js';
import { changeStatus, getOrder, listAllOrders } from '../orders/orders.service.js';
import { getSummary } from './reports.service.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// Reports
adminRouter.get('/reports/summary', (req, res) => {
  res.json({ summary: getSummary() });
});

// Orders
adminRouter.get('/orders', (req, res) => {
  res.json({ orders: listAllOrders({ status: req.query.status || undefined }) });
});

adminRouter.get('/orders/:id', (req, res) => {
  res.json({ order: getOrder(parseId(req.params.id, 'order id')) });
});

adminRouter.post('/orders/:id/status', (req, res) => {
  res.json({ order: changeStatus(parseId(req.params.id, 'order id'), req.body?.status, req.user) });
});

// Products & inventory
adminRouter.get('/products', (req, res) => {
  res.json({ products: listProducts({ search: req.query.search }) });
});

adminRouter.post('/products', (req, res) => {
  res.status(201).json({ product: createProduct(req.body ?? {}) });
});

adminRouter.put('/products/:id', (req, res) => {
  res.json({ product: updateProduct(parseId(req.params.id, 'product id'), req.body ?? {}) });
});

adminRouter.delete('/products/:id', (req, res) => {
  deleteProduct(parseId(req.params.id, 'product id'));
  res.status(204).end();
});

adminRouter.patch('/products/:id/stock', (req, res) => {
  const id = parseId(req.params.id, 'product id');
  setStock(id, requireInt(req.body?.quantity, 'Stock quantity', { min: 0, max: 100000 }));
  res.json({ product: getProduct(id) });
});

// Coupons
adminRouter.get('/coupons', (req, res) => {
  res.json({ coupons: listCoupons() });
});

adminRouter.post('/coupons', (req, res) => {
  res.status(201).json({ coupon: createCoupon(req.body ?? {}) });
});

adminRouter.patch('/coupons/:id', (req, res) => {
  if (typeof req.body?.active !== 'boolean') throw badRequest('active must be true or false');
  res.json({ coupon: setCouponActive(parseId(req.params.id, 'coupon id'), req.body.active) });
});
