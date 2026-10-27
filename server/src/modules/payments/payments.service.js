// Mock payment gateway. No real money moves.
//
// CARD   4242 4242 4242 4242            → approved
//        any 16-digit card ending 0002   → declined
// BKASH  any valid BD mobile number + OTP 123456 → approved
//        a wallet number ending 000      → insufficient balance
// COD    nothing is charged at checkout; the payment stays PENDING until the order is delivered

import { AppError, badRequest, conflict, notFound } from '../../core/errors.js';
import { formatMoney } from '../../core/money.js';
import { one, run } from '../../db/connection.js';

// PENDING: cash on delivery not collected yet. VOIDED: a pending payment that was cancelled (nothing to refund).
export const PAYMENT_STATUS = { PENDING: 'PENDING', CAPTURED: 'CAPTURED', REFUNDED: 'REFUNDED', VOIDED: 'VOIDED' };
export const PAYMENT_METHODS = { CARD: 'CARD', BKASH: 'BKASH', COD: 'COD' };

// How each accepted method is named to shoppers, in the order the storefront shows them.
// Adding a method here makes it appear in the header, footer, home page and checkout.
export const PAYMENT_METHOD_INFO = [
  { method: PAYMENT_METHODS.BKASH, label: 'bKash', account: 'bKash account', brands: ['bKash'] },
  { method: PAYMENT_METHODS.CARD, label: 'Card', account: 'card', brands: ['Visa', 'Mastercard'] },
  { method: PAYMENT_METHODS.COD, label: 'Cash on Delivery', account: 'cash payment', brands: ['Cash on Delivery'] },
];

// BR-COD-01: a flat Cash on Delivery fee, added after VAT (no VAT on the fee).
export const COD_FEE = 20;
// BR-COD-02: COD only for orders up to this total (fee included).
export const COD_MAX_TOTAL = 10000;
// BR-COD-03: districts where couriers collect cash.
export const COD_DISTRICTS = ['Dhaka', 'Gazipur', 'Narayanganj', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi'];

export function assertCodAllowed({ total, district }) {
  if (!COD_DISTRICTS.includes(district)) {
    throw new AppError(400, 'COD_NOT_AVAILABLE', `Cash on Delivery is not available in ${district}. Please pay with bKash or card.`);
  }
  if (total > COD_MAX_TOTAL) {
    throw new AppError(400, 'COD_LIMIT_EXCEEDED', `Cash on Delivery is only available for orders up to ${formatMoney(COD_MAX_TOTAL)}. Please pay with bKash or card.`);
  }
}
export const BKASH_TEST_OTP = '123456';

export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

export function validateCard(card = {}) {
  const number = String(card.cardNumber ?? '').replace(/[\s-]/g, '');
  if (!/^\d{16}$/.test(number)) throw badRequest('Card number must be 16 digits');

  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(card.expiry ?? '').trim());
  if (!match) throw badRequest('Expiry must be in MM/YY format');
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const endOfExpiryMonth = new Date(Date.UTC(year, month, 1)); // first moment after the expiry month
  if (endOfExpiryMonth <= new Date()) throw badRequest('Card has expired');

  if (!/^\d{3}$/.test(String(card.cvc ?? ''))) throw badRequest('CVC must be 3 digits');
  return number;
}

export function validateBkash(wallet = {}) {
  const number = String(wallet.walletNumber ?? '').replace(/[\s-]/g, '');
  if (!BD_MOBILE_RE.test(number)) throw badRequest('bKash number must be a valid 11-digit mobile number (01XXXXXXXXX)');
  if (String(wallet.otp ?? '') !== BKASH_TEST_OTP) throw badRequest('Incorrect bKash verification code');
  return number;
}

function authorize(payment) {
  const method = payment.method ?? PAYMENT_METHODS.CARD;
  if (method === PAYMENT_METHODS.CARD) {
    const number = validateCard(payment);
    if (number.endsWith('0002')) {
      throw new AppError(402, 'PAYMENT_DECLINED', 'Your card was declined. Please use a different card.');
    }
    return { method, last4: number.slice(-4) };
  }
  if (method === PAYMENT_METHODS.BKASH) {
    const number = validateBkash(payment);
    if (number.endsWith('000')) {
      throw new AppError(402, 'PAYMENT_DECLINED', 'Insufficient bKash balance. Please use another account.');
    }
    return { method, last4: number.slice(-4) };
  }
  if (method === PAYMENT_METHODS.COD) return { method, last4: '' };
  throw badRequest('Payment method must be CARD, BKASH or COD');
}

export function chargePayment({ userId, amount, payment = {} }) {
  const { method, last4 } = authorize(payment);
  const { lastId } = run(
    'INSERT INTO payments (user_id, amount, status, method, account_last4) VALUES (?, ?, ?, ?, ?)',
    userId, amount, method === PAYMENT_METHODS.COD ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.CAPTURED, method, last4,
  );
  return getPayment(lastId);
}

// BR-COD-04: the courier collects the cash when the order is delivered.
export function collectPayment(paymentId) {
  const payment = getPayment(paymentId);
  if (payment.status === PAYMENT_STATUS.PENDING) {
    run('UPDATE payments SET status = ? WHERE id = ?', PAYMENT_STATUS.CAPTURED, paymentId);
  }
  return getPayment(paymentId);
}

// Full refund of the captured amount. An uncollected cash payment is voided instead (BR-COD-05).
export function refundPayment(paymentId) {
  const payment = getPayment(paymentId);
  if (payment.status === PAYMENT_STATUS.REFUNDED || payment.status === PAYMENT_STATUS.VOIDED) {
    throw conflict('ALREADY_REFUNDED', 'This payment has already been refunded');
  }
  if (payment.status === PAYMENT_STATUS.PENDING) {
    run('UPDATE payments SET status = ?, refunded_amount = 0 WHERE id = ?', PAYMENT_STATUS.VOIDED, paymentId);
    return getPayment(paymentId);
  }
  run('UPDATE payments SET status = ?, refunded_amount = amount WHERE id = ?', PAYMENT_STATUS.REFUNDED, paymentId);
  return getPayment(paymentId);
}

export function getPayment(id) {
  const p = one('SELECT * FROM payments WHERE id = ?', id);
  if (!p) throw notFound('Payment');
  return {
    id: p.id,
    amount: p.amount,
    status: p.status,
    method: p.method,
    accountLast4: p.account_last4,
    refundedAmount: p.refunded_amount,
    createdAt: p.created_at,
  };
}
