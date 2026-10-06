import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { parseId } from '../../core/validate.js';
import { addItem, applyCoupon, getCart, removeCoupon, removeItem, updateItem } from './cart.service.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get('/', (req, res) => {
  res.json({ cart: getCart(req.user.id) });
});

cartRouter.post('/items', (req, res) => {
  const { productId, quantity = 1 } = req.body ?? {};
  res.status(201).json({ cart: addItem(req.user.id, productId, quantity) });
});

cartRouter.patch('/items/:productId', (req, res) => {
  res.json({ cart: updateItem(req.user.id, parseId(req.params.productId, 'product id'), req.body?.quantity) });
});

cartRouter.delete('/items/:productId', (req, res) => {
  res.json({ cart: removeItem(req.user.id, parseId(req.params.productId, 'product id')) });
});

cartRouter.post('/coupon', (req, res) => {
  res.json({ cart: applyCoupon(req.user.id, req.body?.code) });
});

cartRouter.delete('/coupon', (req, res) => {
  res.json({ cart: removeCoupon(req.user.id) });
});
