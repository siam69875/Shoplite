import { badRequest } from './errors.js';

export function requireString(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string') throw badRequest(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function optionalString(value, field, { max = 255 } = {}) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw badRequest(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function requireInt(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value)) throw badRequest(`${field} must be a whole number`);
  if (value < min || value > max) throw badRequest(`${field} must be between ${min} and ${max}`);
  return value;
}

export function parseId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid ${field}`);
  return id;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value) {
  const email = requireString(value, 'Email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw badRequest('Email address is not valid');
  return email;
}
