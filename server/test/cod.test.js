import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COD_DISTRICTS, COD_FEE, COD_MAX_TOTAL, PAYMENT_METHOD_INFO, assertCodAllowed,
} from '../src/modules/payments/payments.service.js';
import { calculateTotals } from '../src/modules/pricing/pricing.service.js';
import { ADDRESS, as, checkout, freshApp, loginAdmin, newCustomer, productId } from './helpers.js';

const COD = { method: 'COD' };

describe('Cash on Delivery: rules', () => {
  it('adds the COD fee after VAT, with no VAT on the fee (BR-COD-01)', () => {
    const t = calculateTotals([{ unitPrice: 1000, quantity: 2 }], null, { paymentMethod: 'COD' });
    assert.deepEqual(t, { subtotal: 2000, discount: 0, tax: 100, shipping: 60, codFee: COD_FEE, total: 2180, itemCount: 2 });
  });

  it('charges no COD fee for other payment methods', () => {
    for (const paymentMethod of ['CARD', 'BKASH', undefined]) {
      assert.equal(calculateTotals([{ unitPrice: 1000, quantity: 1 }], null, { paymentMethod }).codFee, 0);
    }
  });

  it('allows COD up to and including the limit, not one Taka over (BR-COD-02)', () => {
    assert.doesNotThrow(() => assertCodAllowed({ total: COD_MAX_TOTAL, district: 'Dhaka' }));
    assert.throws(() => assertCodAllowed({ total: COD_MAX_TOTAL + 1, district: 'Dhaka' }), { code: 'COD_LIMIT_EXCEEDED' });
  });

  it('allows COD only in the listed districts (BR-COD-03)', () => {
    for (const district of COD_DISTRICTS) assert.doesNotThrow(() => assertCodAllowed({ total: 500, district }));
    assert.throws(() => assertCodAllowed({ total: 500, district: 'Bogura' }), { code: 'COD_NOT_AVAILABLE' });
  });

  it('is offered in the store settings so every page shows it', async () => {
    const { body } = await freshApp().get('/api/store-info');
    assert.ok(body.paymentMethods.some((m) => m.method === 'COD'));
    assert.deepEqual(body.cod, { fee: COD_FEE, maxOrderTotal: COD_MAX_TOTAL, districts: COD_DISTRICTS });
    assert.deepEqual(body.paymentMethods, PAYMENT_METHOD_INFO);
  });
});

describe('Cash on Delivery: orders', () => {
  let api;
  let admin;
  let customer;
  let OIL;

  beforeEach(async () => {
    api = freshApp();
    admin = as(api, await loginAdmin(api));
    customer = as(api, await newCustomer(api));
    OIL = productId('Pure Mustard Oil 1L'); // ৳320
  });

  const stockOf = async (id) => (await api.get(`/api/products/${id}`)).body.product.stock;
  const summary = async () => (await admin.get('/api/admin/reports/summary')).body.summary;
  const inbox = async () => (await customer.get('/api/notifications')).body.notifications;

  async function codOrder(quantity = 1, address = ADDRESS) {
    await customer.post('/api/cart/items', { productId: OIL, quantity });
    const res = await checkout(customer, COD, address);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.order;
  }

  it('places the order without taking money: payment PENDING, fee on the order (BR-COD-04)', async () => {
    const before = await stockOf(OIL);
    const order = await codOrder();
    // ৳320 + VAT ৳16 + delivery ৳60 + COD fee ৳20
    assert.equal(order.codFee, COD_FEE);
    assert.equal(order.total, 416);
    assert.equal(order.status, 'PAID');
    assert.deepEqual([order.payment.method, order.payment.status, order.payment.amount], ['COD', 'PENDING', 416]);
    assert.equal(await stockOf(OIL), before - 1, 'stock is reserved for the order');
    assert.match((await inbox())[0].body, /pay ৳416 in cash when it is delivered/);
  });

  it('counts COD as revenue only after delivery, and shows it as cash to collect until then (BR-RPT-01)', async () => {
    const start = await summary();
    const order = await codOrder();

    const placed = await summary();
    assert.equal(placed.revenue, start.revenue, 'not revenue before the cash is collected');
    assert.equal(placed.cashToCollect - start.cashToCollect, order.total);
    assert.equal(placed.cashToCollectOrders - start.cashToCollectOrders, 1);

    await admin.post(`/api/admin/orders/${order.id}/status`, { status: 'SHIPPED' });
    const delivered = (await admin.post(`/api/admin/orders/${order.id}/status`, { status: 'DELIVERED' })).body.order;
    assert.equal(delivered.payment.status, 'CAPTURED');
    assert.equal(delivered.pointsAwarded, 3, '1 point per ৳100 of ৳320');

    const after = await summary();
    assert.equal(after.revenue - start.revenue, order.total);
    assert.equal(after.cashToCollect, start.cashToCollect);
    assert.match((await inbox())[0].body, /received your cash payment of ৳416/);
  });

  it('cancelling an uncollected COD order refunds nothing and puts the stock back (BR-COD-05)', async () => {
    const before = await stockOf(OIL);
    const start = await summary();
    const order = await codOrder(2);

    const res = await customer.post(`/api/orders/${order.id}/cancel`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.order.payment.status, res.body.order.payment.refundedAmount], ['VOIDED', 0]);
    assert.equal(await stockOf(OIL), before);

    const after = await summary();
    assert.equal(after.refundedAmount, start.refundedAmount, 'nothing was paid, so nothing is refunded');
    assert.equal(after.cashToCollect, start.cashToCollect);
    assert.match((await inbox())[0].body, /No payment was taken/);
  });

  it('a delivered COD order can be refunded like any paid order', async () => {
    const order = await codOrder();
    await admin.post(`/api/admin/orders/${order.id}/status`, { status: 'SHIPPED' });
    await admin.post(`/api/admin/orders/${order.id}/status`, { status: 'DELIVERED' });
    const res = await admin.post(`/api/admin/orders/${order.id}/status`, { status: 'REFUNDED' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.order.payment.status, res.body.order.payment.refundedAmount], ['REFUNDED', order.total]);
  });

  it('rejects COD outside the listed districts, leaving no order and the cart unchanged', async () => {
    await customer.post('/api/cart/items', { productId: OIL, quantity: 1 });
    const before = await stockOf(OIL);
    const res = await checkout(customer, COD, { ...ADDRESS, city: 'Bogura' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'COD_NOT_AVAILABLE');
    assert.equal((await customer.get('/api/orders')).body.orders.length, 0);
    assert.equal((await customer.get('/api/cart')).body.cart.items.length, 1);
    assert.equal(await stockOf(OIL), before);
  });

  it('rejects COD above the limit even when the browser is bypassed', async () => {
    await customer.post('/api/cart/items', { productId: productId('Smartphone 6.5" 128GB'), quantity: 1 }); // ৳18,999
    const res = await checkout(customer, COD);
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'COD_LIMIT_EXCEEDED');
    assert.equal((await customer.get('/api/orders')).body.orders.length, 0);
  });

  it('ignores a COD fee sent by the browser: the server calculates it', async () => {
    await customer.post('/api/cart/items', { productId: OIL, quantity: 1 });
    const res = await checkout(customer, { method: 'COD', codFee: 0, amount: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.order.codFee, COD_FEE);
    assert.equal(res.body.order.total, 416);
  });
});
