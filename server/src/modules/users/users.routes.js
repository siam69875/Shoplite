import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireString } from '../../core/validate.js';
import { findUserById, toPublicUser, updateUserName } from './users.repository.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

usersRouter.patch('/me', requireAuth, (req, res) => {
  const name = requireString(req.body.name, 'Name', { min: 2, max: 50 });
  updateUserName(req.user.id, name);
  res.json({ user: toPublicUser(findUserById(req.user.id)) });
});
