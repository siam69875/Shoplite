import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals } from '../src/modules/pricing/pricing.service.js';
import { calculateDiscount } from '../src/modules/coupons/coupons.service.js';
import { discountPercent } from '../src/modules/catalog/catalog.service.js';
import { formatMoney } from '../src/core/money.js';

const percent = (value) => ({ type: 'PERCENT', value });
const fixed = (value) => ({ type: 'FIXED', value });

describe('Pricing engine (BDT)', () => {
  it('adds 5% VAT and the ৳60 delivery charge to the subtotal', () => {
    const t = calculateTotals([{ unitPrice: 1000, quantity: 2 }]);
    assert.deepEqual(t, { subtotal: 2000, discount: 0, tax: 100, shipping: 60, total: 2160, itemCount: 2 });
  });

  it('charges no delivery for an empty cart', () => {
    assert.equal(calculateTotals([]).total, 0);
  });

  it('applies the coupon discount to the order total', () => {
    const t = calculateTotals([{ unitPrice: 10000, quantity: 1 }], percent(10));
    assert.equal(t.discount, 1000);
    assert.equal(t.tax, 500); // VAT shown on the line
    assert.equal(t.total, 9000 + 500 + 60);
  });

  it('rounds VAT for a cart line', () => {
    // 3 × ৳145 = ৳435 → VAT 21.75 → ৳22. Per-line rounding would give 3 × ৳7 = ৳21.
    const t = calculateTotals([{ unitPrice: 145, quantity: 3 }]);
    assert.equal(t.tax, 22);
  });

  it('never lets a fixed discount exceed the subtotal (BR-CPN-03)', () => {
    assert.equal(calculateDiscount(fixed(5000), 1200), 1200);
    const t = calculateTotals([{ unitPrice: 1200, quantity: 1 }], fixed(5000));
    assert.equal(t.tax, 60);
    assert.equal(t.total, 120);
  });

  it('rounds percentage discounts to the nearest Taka', () => {
    assert.equal(calculateDiscount(percent(10), 1005), 101); // 100.5 → 101
  });
});

describe('Money display', () => {
  it('uses the Taka sign and Bangladeshi digit grouping', () => {
    assert.equal(formatMoney(100000), '৳1,00,000');
    assert.equal(formatMoney(1250), '৳1,250');
  });

  it('shows sale discount percentage rounded down (BR-CAT-04)', () => {
    assert.equal(discountPercent(8500, 9500), 10); // 10.5% → 10
    assert.equal(discountPercent(500, null), 0);
    assert.equal(discountPercent(500, 400), 0);
  });
});
