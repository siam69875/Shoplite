import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listNotifications } from './notifications.service.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, (req, res) => {
  res.json({ notifications: listNotifications(req.user.id) });
});
