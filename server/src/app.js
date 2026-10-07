import express from 'express';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { checkoutRouter } from './modules/checkout/checkout.routes.js';
import { registerInventoryListeners } from './modules/inventory/inventory.listeners.js';
import { registerLoyaltyListeners } from './modules/loyalty/loyalty.listeners.js';
import { loyaltyRouter } from './modules/loyalty/loyalty.routes.js';
import { registerNotificationListeners } from './modules/notifications/notifications.listeners.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { reviewsRouter } from './modules/reviews/reviews.routes.js';
import { storeRouter } from './modules/store/store.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function registerListeners() {
  registerInventoryListeners();
  registerLoyaltyListeners();
  registerNotificationListeners();
}

export function createApp() {
  registerListeners();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/store-info', storeRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/products/:productId/reviews', reviewsRouter);
  app.use('/api/products', catalogRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/loyalty', loyaltyRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', notFoundHandler);

  // Serve the built React client when it exists (npm run build).
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api).*/, (req, res) => res.sendFile('index.html', { root: clientDist }));
  }

  app.use(errorHandler);
  return app;
}
