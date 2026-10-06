import { fileURLToPath } from 'node:url';

export const config = {
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH || fileURLToPath(new URL('../../data/shoplite.db', import.meta.url)),
  sessionTtlHours: 24,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
};
