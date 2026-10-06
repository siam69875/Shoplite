import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { DISTRICTS, placeOrder } from './checkout.service.js';

export const checkoutRouter = Router();

checkoutRouter.post('/', requireAuth, (req, res) => {
  res.status(201).json({ order: placeOrder(req.user.id, req.body ?? {}) });
});

checkoutRouter.get('/districts', (req, res) => {
  res.json({ districts: DISTRICTS });
});
