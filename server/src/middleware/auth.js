import { forbidden, unauthorized } from '../core/errors.js';
import { getUserForToken } from '../modules/auth/auth.service.js';
import { ROLES } from '../modules/users/users.repository.js';

export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw unauthorized();

  const user = getUserForToken(token);
  if (!user) throw unauthorized('Your session has expired. Please log in again.');

  req.user = user;
  req.token = token;
  next();
}

// Staff-only area. Customers are never allowed in.
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role === ROLES.CUSTOMER) throw forbidden('Admin access required');
  next();
}
