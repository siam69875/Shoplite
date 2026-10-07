import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_QTY_PER_ITEM } from '../src/modules/cart/cart.service.js';
import { DISTRICTS } from '../src/modules/checkout/checkout.service.js';
import { TAKA_PER_POINT } from '../src/modules/loyalty/loyalty.service.js';
import { REFUND_WINDOW_DAYS } from '../src/modules/orders/order-status.js';
import { TAX_RATE } from '../src/modules/pricing/pricing.service.js';
import { DELIVERY_CHARGE } from '../src/modules/shipping/shipping.service.js';
import { BKASH_TEST_OTP, PAYMENT_METHOD_INFO, PAYMENT_METHODS } from '../src/modules/payments/payments.service.js';
import { as, freshApp, loginAdmin, newCustomer, productId } from './helpers.js';

test('store info is public and matches the values the server enforces', async () => {
  const api = freshApp();
  const res = await api.get('/api/store-info');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    storeName: 'ShopLite',
    region: 'Bangladesh',
    paymentMethods: PAYMENT_METHOD_INFO,
    refundNote: 'Full refund after delivery',
    deliveryCharge: DELIVERY_CHARGE,
    deliveryDays: '2–5',
    districtCount: DISTRICTS.length,
    vatPercent: TAX_RATE * 100,
    maxQtyPerItem: MAX_QTY_PER_ITEM,
    takaPerPoint: TAKA_PER_POINT,
    refundWindowDays: REFUND_WINDOW_DAYS,
    hotline: '09678-123456',
    demoBkashOtp: BKASH_TEST_OTP,
    welcomeCoupon: 'WELCOME10',
    offers: {
      WELCOME10: { code: 'WELCOME10', type: 'PERCENT', value: 10, minSubtotal: 0 },
      SAVE100: { code: 'SAVE100', type: 'FIXED', value: 100, minSubtotal: 1000 },
      BOISHAKH15: { code: 'BOISHAKH15', type: 'PERCENT', value: 15, minSubtotal: 2000 },
    },
  });
});

test('the advertised delivery charge is what the cart charges', async () => {
  const api = freshApp();
  const customer = as(api, await newCustomer(api));
  const { body: info } = await api.get('/api/store-info');
  const res = await customer.post('/api/cart/items', { productId: productId('Pure Mustard Oil 1L'), quantity: 1 });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.cart.totals.shipping, info.deliveryCharge);
});

test('a disabled coupon is no longer advertised, in the store info or the welcome email', async () => {
  const api = freshApp();
  const admin = as(api, await loginAdmin(api));
  const { coupons } = (await admin.get('/api/admin/coupons')).body;
  const welcome = coupons.find((c) => c.code === 'WELCOME10');
  assert.equal((await admin.patch(`/api/admin/coupons/${welcome.id}`, { active: false })).status, 200);

  const { body: info } = await api.get('/api/store-info');
  assert.equal(info.offers.WELCOME10, undefined);

  const customer = as(api, await newCustomer(api));
  const { notifications } = (await customer.get('/api/notifications')).body;
  const email = notifications.find((n) => n.subject === 'Welcome to ShopLite!');
  assert.ok(email && !email.body.includes('WELCOME10'), email?.body);
});

test('every payment method checkout accepts has a shopper-facing name, and no others', () => {
  assert.deepEqual(PAYMENT_METHOD_INFO.map((m) => m.method).sort(), Object.values(PAYMENT_METHODS).sort());
});
