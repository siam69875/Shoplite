import { EVENTS } from '../../core/eventBus.js';
import { formatMoney } from '../../core/money.js';
import { pointsForOrder } from '../loyalty/loyalty.service.js';

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
  [EVENTS.ORDER_ON_HOLD]: (o) => ({
    subject: `Order #${o.id} is on hold`,
    body: `Hi ${o.customer_name}, we are doing a quick check on your order before it ships. We will email you when it is on its way.`,
  }),
  [EVENTS.ORDER_REFUNDED]: (o) => ({
    subject: `Refund issued for order #${o.id}`,
    body: `Hi ${o.customer_name}, we refunded ${formatMoney(o.total)}. ${o.points_awarded} loyalty points were deducted.`,
  }),
};

export const welcomeTemplate = (user) => ({
  subject: 'Welcome to ShopLite!',
  body: `Hi ${user.name}, your account is ready. Use code WELCOME10 for 10% off your first order.`,
});
