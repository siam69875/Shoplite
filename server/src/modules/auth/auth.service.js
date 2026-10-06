import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../core/config.js';
import { AppError, badRequest, conflict } from '../../core/errors.js';
import { eventBus, EVENTS } from '../../core/eventBus.js';
import { requireEmail, requireString } from '../../core/validate.js';
import { one, run, transaction } from '../../db/connection.js';
import { findUserByEmail, findUserById, insertUser, toPublicUser } from '../users/users.repository.js';

// BR-AUTH-01: at least 8 characters, containing at least one letter and one number.
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw badRequest('Password must be at least 8 characters');
  }
  if (password.length > 72) {
    throw badRequest('Password must be at most 72 characters');
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw badRequest('Password must contain at least one letter and one number');
  }
  return password;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600 * 1000).toISOString();
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', token, userId, expiresAt);
  return token;
}

export function register({ name, email, password }) {
  const cleanName = requireString(name, 'Name', { min: 2, max: 50 });
  const cleanEmail = requireEmail(email);
  validatePassword(password);

  return transaction(() => {
    if (findUserByEmail(cleanEmail)) {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    }
    const userId = insertUser({
      name: cleanName,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, config.bcryptRounds),
    });
    const user = findUserById(userId);
    eventBus.emit(EVENTS.USER_REGISTERED, { userId });
    return { token: createSession(userId), user: toPublicUser(user) };
  });
}

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

export function login({ email, password }) {
  if (typeof email !== 'string' || typeof password !== 'string') throw invalidCredentials();
  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user) throw invalidCredentials();

  // BR-AUTH-03: account is locked for 15 minutes after 5 consecutive failed attempts.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked. Please try again later.');
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    const attempts = user.failed_login_attempts + 1;
    if (attempts >= config.maxFailedLogins) {
      const lockedUntil = new Date(Date.now() + config.lockoutMinutes * 60 * 1000).toISOString();
      run('UPDATE users SET failed_login_attempts = 0, locked_until = ? WHERE id = ?', lockedUntil, user.id);
      throw new AppError(423, 'ACCOUNT_LOCKED', 'Too many failed attempts. Account locked for 15 minutes.');
    }
    run('UPDATE users SET failed_login_attempts = ? WHERE id = ?', attempts, user.id);
    throw invalidCredentials();
  }

  run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', user.id);
  return { token: createSession(user.id), user: toPublicUser(user) };
}

export function logout(token) {
  run('DELETE FROM sessions WHERE token = ?', token);
}

export function getUserForToken(token) {
  const session = one('SELECT * FROM sessions WHERE token = ?', token);
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) {
    logout(token);
    return null;
  }
  return findUserById(session.user_id) ?? null;
}
