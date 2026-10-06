import request from 'supertest';
import { createApp } from '../src/app.js';
import { one, openDatabase } from '../src/db/connection.js';
import { DEMO_ADDRESS, DEMO_BKASH, DEMO_CARD, seed } from '../src/db/seed.js';

export { DEMO_BKASH, DEMO_CARD };
export const ADDRESS = DEMO_ADDRESS;

/** Fresh in-memory database with demo data, plus a supertest client. */
export function freshApp() {
  openDatabase(':memory:');
  seed();
  return request(createApp());
}

/** Looks up a seeded product id by its exact name. */
export function productId(name) {
  const row = one('SELECT id FROM products WHERE name = ?', name);
  if (!row) throw new Error(`No product named ${name}`);
  return row.id;
}

export async function login(api, email, password) {
  const res = await api.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

export const loginAdmin = (api) => login(api, 'admin@shoplite.test', 'Admin@123');
export const loginAlice = (api) => login(api, 'alice@shoplite.test', 'Alice@123');
export const loginBob = (api) => login(api, 'bob@shoplite.test', 'Bob@1234');

export async function newCustomer(api, email = `user${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.dev`) {
  const res = await api.post('/api/auth/register').send({ name: 'New Customer', email, password: 'Passw0rd!' });
  return res.body.token;
}

export function as(api, token) {
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (url) => auth(api.get(url)),
    post: (url, body) => auth(api.post(url)).send(body ?? {}),
    patch: (url, body) => auth(api.patch(url)).send(body ?? {}),
    put: (url, body) => auth(api.put(url)).send(body ?? {}),
    delete: (url) => auth(api.delete(url)),
  };
}

export async function checkout(client, payment = DEMO_CARD, shippingAddress = ADDRESS) {
  return client.post('/api/checkout', { shippingAddress, payment });
}
