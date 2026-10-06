import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { as, freshApp, loginAlice } from './helpers.js';

let api;
beforeEach(() => { api = freshApp(); });

describe('Registration', () => {
  it('creates an account and sends a welcome email', async () => {
    const res = await api.post('/api/auth/register').send({ name: 'Carol', email: 'Carol@Test.dev', password: 'Secret123' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'carol@test.dev');
    assert.equal(res.body.user.role, 'customer');
    const inbox = await as(api, res.body.token).get('/api/notifications');
    assert.equal(inbox.body.notifications[0].subject, 'Welcome to ShopLite!');
  });

  for (const [password, reason] of [['short1', 'too short'], ['allletters', 'no number'], ['12345678', 'no letter']]) {
    it(`rejects a weak password (${reason})`, async () => {
      const res = await api.post('/api/auth/register').send({ name: 'Carol', email: 'c@test.dev', password });
      assert.equal(res.status, 400);
    });
  }

  it('rejects a duplicate email regardless of case', async () => {
    const res = await api.post('/api/auth/register').send({ name: 'Alice', email: 'ALICE@shoplite.test', password: 'Secret123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_TAKEN');
  });
});

describe('Login', () => {
  it('returns the same message for unknown email and wrong password', async () => {
    const a = await api.post('/api/auth/login').send({ email: 'nobody@test.dev', password: 'x' });
    const b = await api.post('/api/auth/login').send({ email: 'alice@shoplite.test', password: 'wrong' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.error.message, b.body.error.message);
  });

  it('locks the account after 5 failed attempts (BR-AUTH-03)', async () => {
    for (let i = 1; i <= 4; i++) {
      const res = await api.post('/api/auth/login').send({ email: 'alice@shoplite.test', password: 'wrong' });
      assert.equal(res.status, 401, `attempt ${i}`);
    }
    const fifth = await api.post('/api/auth/login').send({ email: 'alice@shoplite.test', password: 'wrong' });
    assert.equal(fifth.status, 423);
    const correct = await api.post('/api/auth/login').send({ email: 'alice@shoplite.test', password: 'Alice@123' });
    assert.equal(correct.status, 423, 'even the right password is refused while locked');
  });

  it('logout invalidates the token', async () => {
    const token = await loginAlice(api);
    assert.equal((await as(api, token).post('/api/auth/logout')).status, 204);
    assert.equal((await as(api, token).get('/api/auth/me')).status, 401);
  });
});

describe('Admin access', () => {
  it('blocks customers from admin endpoints', async () => {
    const token = await loginAlice(api);
    const res = await as(api, token).get('/api/admin/reports/summary');
    assert.equal(res.status, 403);
  });

  it('blocks anonymous users from admin endpoints', async () => {
    assert.equal((await api.get('/api/admin/orders')).status, 401);
  });
});
