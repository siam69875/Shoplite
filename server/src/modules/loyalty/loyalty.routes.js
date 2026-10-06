import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getBalance, getLedger } from './loyalty.service.js';

export const loyaltyRouter = Router();

loyaltyRouter.get('/', requireAuth, (req, res) => {
  res.json({ balance: getBalance(req.user.id), ledger: getLedger(req.user.id) });
});
