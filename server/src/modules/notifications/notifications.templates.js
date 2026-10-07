import { config } from '../../core/config.js';
import { EVENTS } from '../../core/eventBus.js';
import { formatMoney } from '../../core/money.js';
import { pointsForOrder } from '../loyalty/loyalty.service.js';
import { welcomeOffer } from '../store/store.service.js';

// One email template per order event. `o` is an order row joined with the customer's name.
export const ORDER_TEMPLATES = {
  [EVENTS.ORDER_PAID]: (o) => ({
    subject: `Order #${o.id} confirmed`,
    body: `Hi ${o.customer_name}, thanks for your order! We charged ${formatMoney(o.total)} to your account.`,
  }),
  [EVENTS.ORDER_SHIPPED]: (o) => ({
    subject: `Order #${o.id} has shipped`,
    body: `Hi ${o.customer_name}, good news: your order is on its way.`,
  }),
  [EVENTS.ORDER_DELIVERED]: (o) => ({
    subject: `Order #${o.id} delivered`,
    body: `Hi ${o.customer_name}, your order was delivered. You earned ${pointsForOrder(o)} loyalty points.`,
  }),
  [EVENTS.ORDER_CANCELLED]: (o) => ({
    subject: `Order #${o.id} cancelled`,
    body: `Hi ${o.customer_name}, your order was cancelled and ${formatMoney(o.total)} was refunded to your account.`,
  }),
  [EVENTS.ORDER_REFUNDED]: (o) => ({
    subject: `Refund issued for order #${o.id}`,
    body: `Hi ${o.customer_name}, we refunded ${formatMoney(o.total)}. ${o.points_awarded} loyalty points were deducted.`,
  }),
};

const offerText = (o) => (o.type === 'PERCENT' ? `${o.value}% off` : `${formatMoney(o.value)} off`);

export function welcomeTemplate(user) {
  const offer = welcomeOffer();
  const promo = offer ? ` Use code ${offer.code} for ${offerText(offer)} your first order.` : '';
  return { subject: `Welcome to ${config.store.name}!`, body: `Hi ${user.name}, your account is ready.${promo}` };
}
