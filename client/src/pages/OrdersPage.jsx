import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api, formatDate, money } from '../api.js';
import { ErrorMessage, Reveal, StatusBadge } from '../components/ui.jsx';

export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container"><ErrorMessage error={error} /></div>;
  if (!orders) return <div className="container"><div className="skeleton skeleton-hero" /></div>;

  return (
    <div className="container narrow">
      <h1 className="page-title">My orders</h1>
      {orders.length === 0 ? (
        <div className="empty-state" data-testid="no-orders">
          <div className="empty-emoji">📦</div>
          <h2>No orders yet</h2>
          <Link to="/" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="order-list" data-testid="orders-table">
          {orders.map((o, i) => (
            <Reveal key={o.id} delay={i * 50}>
              <Link to={`/orders/${o.id}`} className="card order-row" data-testid={`order-row-${o.id}`}>
                <div className="order-row-icon">📦</div>
                <div>
                  <strong>Order #{o.id}</strong>
                  <div className="muted small">{formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}</div>
                </div>
                <StatusBadge status={o.status} />
                <strong className="order-row-total">{money(o.total)}</strong>
                <ChevronRight size={18} className="muted" />
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
