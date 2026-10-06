import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { toPublicUser } from '../users/users.repository.js';
import { login, logout, register } from './auth.service.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  res.status(201).json(register(req.body ?? {}));
});

authRouter.post('/login', (req, res) => {
  res.json(login(req.body ?? {}));
});

authRouter.post('/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});
