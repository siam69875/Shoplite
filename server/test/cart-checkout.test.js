import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADDRESS, DEMO_BKASH, as, checkout, freshApp, loginAdmin, newCustomer, productId } from './helpers.js';

let api;
let customer;
let P;
beforeEach(async () => {
  api = freshApp();
  customer = as(api, await newCustomer(api));
  P = {
    OIL: productId('Pure Mustard Oil 1L'), // ৳320, stock 148
    PANJABI: productId('Eid Special Cotton Panjabi'), // ৳2200
    DAL: productId('Red Lentils (Masoor Dal) 1kg'), // ৳145
    FAN: productId('Rechargeable Table Fan'), // stock ≥ 10
    TV: productId('Smart LED TV 43"'), // stock 5
    PEN: productId('Premium Fountain Pen'), // stock 3
    TOOTHPASTE: productId('Herbal Neem Toothpaste'), // stock 0
  };
});

const stockOf = async (id) => (await api.get(`/api/products/${id}`)).body.product.stock;

describe('Catalog search', () => {
  it('matches partial, case-insensitive names', async () => {
    const res = await api.get('/api/products?search=jamDANI');
    assert.deepEqual(res.body.products.map((p) => p.name), ['Dhakai Jamdani Saree']);
  });

  it('filters by price range, stock and sale', async () => {
    const { products } = (await api.get('/api/products?minPrice=1000&maxPrice=2000&inStock=1&onSale=1')).body;
    assert.ok(products.length > 0);
    for (const p of products) {
      assert.ok(p.price >= 1000 && p.price <= 2000, p.name);
      assert.ok(p.stock > 0 && p.originalPrice > p.price, p.name);
    }
  });

  it('caps the number of results', async () => {
    assert.equal((await api.get('/api/products?limit=5')).body.products.length, 5);
  });
});

describe('Cart', () => {
  for (const quantity of [0, -1, 11, 1.5]) {
    it(`rejects quantity ${quantity} (BR-CART-01)`, async () => {
      const res = await customer.post('/api/cart/items', { productId: P.OIL, quantity });
      assert.equal(res.status, 400);
    });
  }

  it('enforces the 10-per-item limit across repeated adds', async () => {
    assert.equal((await customer.post('/api/cart/items', { productId: P.OIL, quantity: 6 })).status, 201);
    const res = await customer.post('/api/cart/items', { productId: P.OIL, quantity: 5 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'MAX_QUANTITY_EXCEEDED');
  });

  it('refuses out-of-stock and over-stock quantities (BR-CART-02)', async () => {
    const out = await customer.post('/api/cart/items', { productId: P.TOOTHPASTE, quantity: 1 });
    assert.equal(out.status, 409);
    const over = await customer.post('/api/cart/items', { productId: P.TV, quantity: 6 });
    assert.equal(over.status, 409);
  });

  it('does not reserve stock when adding to cart (BR-INV-01)', async () => {
    const before = await stockOf(P.FAN);
    await customer.post('/api/cart/items', { productId: P.FAN, quantity: 2 });
    assert.equal(await stockOf(P.FAN), before);
  });
});

describe('Coupons', () => {
  beforeEach(async () => {
    await customer.post('/api/cart/items', { productId: P.OIL, quantity: 1 }); // ৳320
  });

  it('rejects an expired coupon', async () => {
    const res = await customer.post('/api/cart/coupon', { code: 'EXPIRED15' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Coupon expired');
  });

  it('rejects a coupon below its minimum order', async () => {
    const res = await customer.post('/api/cart/coupon', { code: 'SAVE100' }); // min ৳1,000
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Minimum order of ৳1,000 required for this coupon');
  });

  it('rejects an inactive coupon', async () => {
    assert.equal((await customer.post('/api/cart/coupon', { code: 'RETIRED50' })).status, 400);
  });

  it('keeps only one coupon: a new code replaces the old one (BR-CPN-01)', async () => {
    await customer.post('/api/cart/items', { productId: P.PANJABI, quantity: 1 }); // subtotal ৳2,520
    await customer.post('/api/cart/coupon', { code: 'WELCOME10' });
    const res = await customer.post('/api/cart/coupon', { code: 'SAVE100' });
    assert.equal(res.body.cart.couponCode, 'SAVE100');
    assert.equal(res.body.cart.totals.discount, 100);
  });

  it('flags a coupon that stops qualifying when items are removed', async () => {
    await customer.post('/api/cart/items', { productId: P.PANJABI, quantity: 1 });
    await customer.post('/api/cart/coupon', { code: 'SAVE100' });
    const res = await customer.delete(`/api/cart/items/${P.PANJABI}`);
    assert.equal(res.body.cart.totals.discount, 0);
    assert.match(res.body.cart.couponError, /Minimum order/);
  });

  it('a single-use coupon cannot be used twice', async () => {
    await customer.post('/api/cart/coupon', { code: 'ONETIME' });
    assert.equal((await checkout(customer)).status, 201);
    await customer.post('/api/cart/items', { productId: P.OIL, quantity: 1 });
    const res = await customer.post('/api/cart/coupon', { code: 'ONETIME' });
    assert.equal(res.body.error.message, 'Coupon usage limit reached');
  });
});

describe('Checkout', () => {
  it('order totals equal the cart totals the customer saw (invariant INV-01)', async () => {
    await customer.post('/api/cart/items', { productId: P.DAL, quantity: 3 });
    await customer.post('/api/cart/items', { productId: P.PANJABI, quantity: 2 });
    const cart = (await customer.post('/api/cart/coupon', { code: 'WELCOME10' })).body.cart;
    const res = await checkout(customer);
    assert.equal(res.status, 201);
    const { order } = res.body;
    for (const key of ['subtotal', 'discount', 'tax', 'shipping', 'total']) {
      assert.equal(order[key], cart.totals[key], key);
    }
    assert.equal(order.payment.amount, order.total, 'charged amount equals order total');
  });

  it('deducts stock and empties the cart', async () => {
    const before = await stockOf(P.FAN);
    await customer.post('/api/cart/items', { productId: P.FAN, quantity: 2 });
    await checkout(customer);
    assert.equal(await stockOf(P.FAN), before - 2);
    assert.equal((await customer.get('/api/cart')).body.cart.items.length, 0);
  });

  it('accepts bKash payments', async () => {
    await customer.post('/api/cart/items', { productId: P.OIL, quantity: 1 });
    const res = await checkout(customer, DEMO_BKASH);
    assert.equal(res.status, 201);
    assert.equal(res.body.order.payment.method, 'BKASH');
    assert.equal(res.body.order.payment.accountLast4, '5678');
  });

  for (const [label, payment, status] of [
    ['declined card', { method: 'CARD', cardNumber: '4000000000000002', expiry: '12/30', cvc: '123' }, 402],
    ['bKash insufficient balance', { method: 'BKASH', walletNumber: '01712345000', otp: '123456' }, 402],
    ['wrong bKash OTP', { method: 'BKASH', walletNumber: '01712345678', otp: '000000' }, 400],
  ]) {
    it(`a failed payment (${label}) creates no order and changes no stock`, async () => {
      const before = await stockOf(P.FAN);
      await customer.post('/api/cart/items', { productId: P.FAN, quantity: 1 });
      const res = await checkout(customer, payment);
      assert.equal(res.status, status);
      assert.equal(await stockOf(P.FAN), before);
      assert.equal((await customer.get('/api/orders')).body.orders.length, 0);
      assert.equal((await customer.get('/api/cart')).body.cart.items.length, 1, 'cart is kept');
    });
  }

  for (const [label, override] of [
    ['invalid mobile number', { phone: '0171234567' }],
    ['non-BD mobile prefix', { phone: '01212345678' }],
    ['5-digit postcode', { postalCode: '12050' }],
    ['unknown district', { city: 'Atlantis' }],
  ]) {
    it(`rejects an address with ${label} (BR-CHK-01)`, async () => {
      await customer.post('/api/cart/items', { productId: P.OIL, quantity: 1 });
      const res = await checkout(customer, undefined, { ...ADDRESS, ...override });
      assert.equal(res.status, 400);
    });
  }

  it('fails if stock ran out after the item was added', async () => {
    await customer.post('/api/cart/items', { productId: P.PEN, quantity: 3 });
    const admin = as(api, await loginAdmin(api));
    await admin.patch(`/api/admin/products/${P.PEN}/stock`, { quantity: 1 });
    const res = await checkout(customer);
    assert.equal(res.status, 409);
  });

  it('rejects an expired card', async () => {
    await customer.post('/api/cart/items', { productId: P.OIL, quantity: 1 });
    const res = await checkout(customer, { method: 'CARD', cardNumber: '4242424242424242', expiry: '01/20', cvc: '123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Card has expired');
  });

  it('rejects checkout with an empty cart', async () => {
    assert.equal((await checkout(customer)).status, 400);
  });
});
