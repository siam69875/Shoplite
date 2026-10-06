import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { parseId } from '../../core/validate.js';
import { cancelByCustomer, getOrderForUser, listOrdersForUser } from './orders.service.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get('/', (req, res) => {
  res.json({ orders: listOrdersForUser(req.user.id) });
});

ordersRouter.get('/:id', (req, res) => {
  res.json({ order: getOrderForUser(parseId(req.params.id, 'order id'), req.user) });
});

ordersRouter.post('/:id/cancel', (req, res) => {
  res.json({ order: cancelByCustomer(parseId(req.params.id, 'order id'), req.user) });
});
