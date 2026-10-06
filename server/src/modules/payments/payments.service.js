// Mock payment gateway. No real money moves.
//
// CARD   4242 4242 4242 4242            → approved
//        any 16-digit card ending 0002   → declined
// BKASH  any valid BD mobile number + OTP 123456 → approved
//        a wallet number ending 000      → insufficient balance

import { AppError, badRequest, conflict, notFound } from '../../core/errors.js';
import { one, run } from '../../db/connection.js';

export const PAYMENT_STATUS = { CAPTURED: 'CAPTURED', REFUNDED: 'REFUNDED' };
export const PAYMENT_METHODS = { CARD: 'CARD', BKASH: 'BKASH' };
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
  throw badRequest('Payment method must be CARD or BKASH');
}

export function chargePayment({ userId, amount, payment = {} }) {
  const { method, last4 } = authorize(payment);
  const { lastId } = run(
    'INSERT INTO payments (user_id, amount, status, method, account_last4) VALUES (?, ?, ?, ?, ?)',
    userId, amount, PAYMENT_STATUS.CAPTURED, method, last4,
  );
  return getPayment(lastId);
}

// Full refund of the captured amount.
export function refundPayment(paymentId) {
  const payment = getPayment(paymentId);
  if (payment.status === PAYMENT_STATUS.REFUNDED) {
    throw conflict('ALREADY_REFUNDED', 'This payment has already been refunded');
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
