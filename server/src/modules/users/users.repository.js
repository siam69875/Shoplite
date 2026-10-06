import { one, run } from '../../db/connection.js';

export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

export function findUserById(id) {
  return one('SELECT * FROM users WHERE id = ?', id);
}

export function findUserByEmail(email) {
  return one('SELECT * FROM users WHERE email = ?', email);
}

export function insertUser({ name, email, passwordHash, role = ROLES.CUSTOMER }) {
  return run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    name, email, passwordHash, role,
  ).lastId;
}

export function updateUserName(id, name) {
  run('UPDATE users SET name = ? WHERE id = ?', name, id);
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}
