import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/db/connection.js';
import { as, productId, checkout, freshApp, loginAdmin, loginAlice, loginBob, newCustomer } from './helpers.js';

let api;
let admin;
let customer;
beforeEach(async () => {
  api = freshApp();
  admin = as(api, await loginAdmin(api));
  customer = as(api, await newCustomer(api));
});

async function placeOrder(lines) {
  for (const [productId, quantity] of lines) await customer.post('/api/cart/items', { productId, quantity });
  return (await checkout(customer)).body.order;
}
const setStatus = (id, status) => admin.post(`/api/admin/orders/${id}/status`, { status });
const stockOf = async (id) => (await api.get(`/api/products/${id}`)).body.product.stock;
const points = async (client) => (await client.get('/api/loyalty')).body.balance;

describe('Order access', () => {
  it('a customer cannot view another customer\'s order (IDOR)', async () => {
    const bob = as(api, await loginBob(api));
    const alicesOrders = (await as(api, await loginAlice(api)).get('/api/orders')).body.orders;
    const res = await bob.get(`/api/orders/${alicesOrders[0].id}`);
    assert.equal(res.status, 404);
  });

  it('a customer cannot cancel another customer\'s order', async () => {
    const bob = as(api, await loginBob(api));
    const alicesOrders = (await as(api, await loginAlice(api)).get('/api/orders')).body.orders;
    assert.equal((await bob.post(`/api/orders/${alicesOrders[0].id}/cancel`)).status, 404);
  });
});

describe('Order status lifecycle', () => {
  it('follows PAID → SHIPPED → DELIVERED and rejects skipping steps', async () => {
    const order = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    assert.equal((await setStatus(order.id, 'DELIVERED')).status, 409);
    assert.equal((await setStatus(order.id, 'SHIPPED')).status, 200);
    assert.equal((await setStatus(order.id, 'CANCELLED')).status, 409, 'cannot cancel after shipping');
    assert.equal((await setStatus(order.id, 'DELIVERED')).status, 200);
  });

  it('customer cancel refunds the payment, restocks items and emails the customer', async () => {
    const before = await stockOf(productId('Rechargeable Table Fan'));
    const order = await placeOrder([[productId('Rechargeable Table Fan'), 2]]);
    const res = await customer.post(`/api/orders/${order.id}/cancel`);
    assert.equal(res.status, 200);
    assert.equal(res.body.order.status, 'CANCELLED');
    assert.equal(res.body.order.payment.status, 'REFUNDED');
    assert.equal(res.body.order.payment.refundedAmount, order.total);
    assert.equal(await stockOf(productId('Rechargeable Table Fan')), before);
    const inbox = (await customer.get('/api/notifications')).body.notifications;
    assert.equal(inbox[0].subject, `Order #${order.id} cancelled`);
  });

  it('customer cannot cancel once shipped (BR-ORD-02)', async () => {
    const order = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    await setStatus(order.id, 'SHIPPED');
    assert.equal((await customer.post(`/api/orders/${order.id}/cancel`)).status, 409);
  });
});

describe('Order hold', () => {
  it('admin can put a paid order on hold and release it to shipping', async () => {
    const order = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    assert.equal((await setStatus(order.id, 'ON_HOLD')).body.order.status, 'ON_HOLD');
    const inbox = (await customer.get('/api/notifications')).body.notifications;
    assert.equal(inbox[0].subject, `Order #${order.id} is on hold`);
    assert.equal((await setStatus(order.id, 'SHIPPED')).body.order.status, 'SHIPPED');
  });
});

describe('Loyalty points', () => {
  it('awards 1 point per ৳100 of discounted subtotal on delivery, and reverses on refund', async () => {
    const order = await placeOrder([[productId('Smartphone 6.5" 128GB'), 1]]); // ৳18,999 → 189 points
    assert.equal(await points(customer), 0, 'no points before delivery');
    await setStatus(order.id, 'SHIPPED');
    await setStatus(order.id, 'DELIVERED');
    assert.equal(await points(customer), 189);
    await setStatus(order.id, 'REFUNDED');
    assert.equal(await points(customer), 0);
  });

  it('cancelled orders never earn points', async () => {
    const order = await placeOrder([[productId('Smartphone 6.5" 128GB'), 1]]);
    await customer.post(`/api/orders/${order.id}/cancel`);
    assert.equal(await points(customer), 0);
  });
});

describe('Refunds', () => {
  it('are refused more than 30 days after delivery (BR-ORD-04)', async () => {
    const order = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    await setStatus(order.id, 'SHIPPED');
    await setStatus(order.id, 'DELIVERED');
    const longAgo = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
    run('UPDATE orders SET delivered_at = ? WHERE id = ?', longAgo, order.id);
    const res = await setStatus(order.id, 'REFUNDED');
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'REFUND_WINDOW_EXPIRED');
  });
});

describe('Reviews', () => {
  it('only verified buyers with a delivered order can review (BR-REV-01)', async () => {
    const order = await placeOrder([[productId('Attar Non-alcoholic Perfume'), 1]]);
    const early = await customer.post(`/api/products/${productId('Attar Non-alcoholic Perfume')}/reviews`, { rating: 4 });
    assert.equal(early.status, 403, 'paid but not delivered');
    await setStatus(order.id, 'SHIPPED');
    await setStatus(order.id, 'DELIVERED');
    const ok = await customer.post(`/api/products/${productId('Attar Non-alcoholic Perfume')}/reviews`, { rating: 4, comment: 'Nice' });
    assert.equal(ok.status, 201);
    const again = await customer.post(`/api/products/${productId('Attar Non-alcoholic Perfume')}/reviews`, { rating: 5 });
    assert.equal(again.status, 409, 'one review per product (BR-REV-02)');
  });

  it('rejects ratings outside 1–5', async () => {
    const bob = as(api, await loginBob(api)); // Bob has a delivered, unreviewed mustard oil
    for (const rating of [0, 6, 3.5]) {
      assert.equal((await bob.post(`/api/products/${productId('Pure Mustard Oil 1L')}/reviews`, { rating })).status, 400, `rating ${rating}`);
    }
  });
});

describe('Admin reports', () => {
  it('revenue counts only orders that kept their money', async () => {
    const { summary: before } = (await admin.get('/api/admin/reports/summary')).body;
    const kept = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    const cancelled = await placeOrder([[productId('Pure Mustard Oil 1L'), 1]]);
    await customer.post(`/api/orders/${cancelled.id}/cancel`);
    const { summary: after } = (await admin.get('/api/admin/reports/summary')).body;
    assert.equal(after.revenue - before.revenue, kept.total);
    assert.equal(after.refundedAmount - before.refundedAmount, cancelled.total);
  });

  it('a product that was ordered cannot be deleted (BR-CAT-02)', async () => {
    const res = await admin.delete(`/api/admin/products/${productId('Pure Mustard Oil 1L')}`);
    assert.equal(res.status, 409);
  });
});
