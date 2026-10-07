import { fileURLToPath } from 'node:url';

export const config = {
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH || fileURLToPath(new URL('../../data/shoplite.db', import.meta.url)),
  sessionTtlHours: 24,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  // Contact and delivery details shown in the storefront (see GET /api/store-info).
  store: {
    hotline: '09678-123456',
    deliveryDays: '2–5',
    welcomeCoupon: 'WELCOME10',
    // Coupons the storefront advertises (banners, sign-up). Their terms come from the coupons table.
    advertisedCoupons: ['WELCOME10', 'SAVE100', 'BOISHAKH15'],
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
};
