import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Home, Package, PartyPopper, Smartphone, Truck } from 'lucide-react';
import { api, formatDate, money } from '../api.js';
import { ErrorMessage, StatusBadge, Totals } from '../components/ui.jsx';
import { useToast } from '../toast.jsx';

const STEPS = [
  ['PAID', 'Order placed', Package],
  ['SHIPPED', 'Shipped', Truck],
  ['DELIVERED', 'Delivered', Home],
];

function Tracker({ order }) {
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return (
      <div className={`tracker-banner ${order.status.toLowerCase()}`} data-testid="tracker">
        {order.status === 'CANCELLED' ? '❌ This order was cancelled.' : '↩️ This order was refunded.'}{' '}
        {order.payment && <>{money(order.payment.refundedAmount)} has been returned to your {order.payment.method === 'BKASH' ? 'bKash account' : 'card'}.</>}
      </div>
    );
  }
  const reached = STEPS.findIndex(([s]) => s === order.status);
  return (
    <ol className="tracker" data-testid="tracker">
      {STEPS.map(([status, label, Icon], i) => {
        const at = order.history.find((h) => h.to === status)?.at;
        return (
          <li key={status} className={i <= reached ? 'done' : ''}>
            <span className="tracker-dot"><Icon size={18} /></span>
            <span className="tracker-label">{label}</span>
            <span className="muted small">{at ? formatDate(at) : ' '}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [id]);

  async function cancel() {
    setError(null);
    try {
      const { order: updated } = await api(`/orders/${id}/cancel`, { method: 'POST' });
      setOrder(updated);
      setConfirming(false);
      toast('Order cancelled and refunded', { icon: '↩️' });
    } catch (e) {
      setError(e.message);
    }
  }

  if (!order) return <div className="container">{error ? <ErrorMessage error={error} /> : <div className="skeleton skeleton-hero" />}</div>;

  return (
    <div className="container">
      <p><Link to="/orders">← My orders</Link></p>
      {location.state?.placed && (
        <div className="success-banner" data-testid="order-success">
          <PartyPopper size={28} />
          <div><strong>Thank you! Your order has been placed.</strong><br /><span>We will send updates to your inbox.</span></div>
          <span className="confetti" aria-hidden="true">🎉</span>
        </div>
      )}
      <div className="title-row">
        <h1 data-testid="order-title">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="muted">Placed on {formatDate(order.createdAt)}</p>
      <div className="card"><Tracker order={order} /></div>
      <ErrorMessage error={error} />

      <div className="two-col">
        <div>
          <div className="card">
            <h2>Items</h2>
            <table className="table" data-testid="order-items">
              <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.productId}>
                    <td><Link to={`/products/${i.productId}`}>{i.name}</Link></td>
                    <td>{money(i.unitPrice)}</td>
                    <td>{i.quantity}</td>
                    <td>{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Delivery address</h2>
            <p>
              <strong>{order.shippingAddress.fullName}</strong> · {order.shippingAddress.phone}<br />
              {order.shippingAddress.line1}<br />
              {order.shippingAddress.city} {order.shippingAddress.postalCode}
            </p>
          </div>
        </div>

        <aside className="card summary">
          <h2>Payment</h2>
          {order.couponCode && <p className="small">🎟️ Coupon <strong>{order.couponCode}</strong></p>}
          <Totals totals={order} testId="order-totals" />
          {order.payment && (
            <p className="payment-line" data-testid="payment-info">
              {order.payment.method === 'BKASH' ? <Smartphone size={16} /> : <CreditCard size={16} />}
              {order.payment.method === 'BKASH' ? 'bKash' : 'Card'} ••{order.payment.accountLast4} · {order.payment.status}
            </p>
          )}
          {order.pointsAwarded > 0 && <p className="small points-line"><CheckCircle2 size={16} /> Earned {order.pointsAwarded} loyalty points</p>}
          {order.canCancel && !confirming && (
            <button type="button" className="btn btn-danger-ghost btn-block" onClick={() => setConfirming(true)} data-testid="cancel-order">Cancel order</button>
          )}
          {confirming && (
            <div className="confirm" data-testid="cancel-confirm">
              <p>Cancel this order? {money(order.total)} will be refunded.</p>
              <button type="button" className="btn btn-danger" onClick={cancel} data-testid="confirm-cancel">Yes, cancel</button>{' '}
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep order</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
