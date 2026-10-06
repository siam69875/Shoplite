import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, Trash2 } from 'lucide-react';
import { api, money } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import { ErrorMessage, QtyStepper, Totals } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { useToast } from '../toast.jsx';

const COUPON_HINTS = ['WELCOME10', 'SAVE100', 'BOISHAKH15'];

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [error, setError] = useState(null);
  const { refreshCart } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api('/cart').then((d) => setCart(d.cart)).catch((e) => setError(e.message));
  }, []);

  async function act(path, options, success) {
    setError(null);
    try {
      const { cart: next } = await api(path, options);
      setCart(next);
      refreshCart();
      if (success) toast(success.message, { icon: success.icon });
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  if (!cart) return <div className="container">{error ? <ErrorMessage error={error} /> : <div className="skeleton skeleton-hero" />}</div>;

  if (cart.items.length === 0) {
    return (
      <div className="container empty-state" data-testid="empty-cart">
        <div className="empty-emoji bounce">🛒</div>
        <h1>Your cart is empty</h1>
        <p className="muted">Discover handpicked deshi products and great deals.</p>
        <Link to="/" className="btn btn-primary">Start shopping <ArrowRight size={18} /></Link>
      </div>
    );
  }

  const blocked = cart.items.some((i) => !i.available);
  const itemCount = cart.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="container">
      <h1 className="page-title">Shopping cart <span className="muted">({itemCount} item{itemCount === 1 ? '' : 's'})</span></h1>
      <ErrorMessage error={error} />
      <div className="two-col">
        <div className="cart-items" data-testid="cart-table">
          {cart.items.map((item) => (
            <div key={item.productId} className="card cart-item" data-testid={`cart-row-${item.productId}`}>
              <Link to={`/products/${item.productId}`} className="cart-thumb" style={{ background: metaFor(item.category).tile }}>{item.image}</Link>
              <div className="cart-item-info">
                <Link to={`/products/${item.productId}`} className="cart-item-name">{item.name}</Link>
                <span className="muted small">{money(item.unitPrice)} each · VAT {money(item.vat)}</span>
                {!item.available && <span className="badge stock-out_of_stock">Only {item.stock} in stock</span>}
              </div>
              <QtyStepper
                value={item.quantity}
                max={Math.max(1, Math.min(10, item.stock))}
                onChange={(q) => act(`/cart/items/${item.productId}`, { method: 'PATCH', body: { quantity: q } })}
                testId="cart-qty"
              />
              <strong className="cart-line-total" data-testid="line-total">{money(item.lineTotal)}</strong>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Remove ${item.name}`}
                onClick={() => act(`/cart/items/${item.productId}`, { method: 'DELETE' }, { message: `${item.name} removed`, icon: '🗑️' })}
                data-testid="remove-item"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <aside className="card summary">
          <h2>Order summary</h2>
          {cart.couponCode ? (
            <div className={`coupon-applied ${cart.couponError ? 'invalid' : ''}`} data-testid="applied-coupon">
              <Tag size={16} />
              <span>Coupon <strong>{cart.couponCode}</strong></span>
              <button type="button" className="link-button" onClick={() => act('/cart/coupon', { method: 'DELETE' })} data-testid="remove-coupon">Remove</button>
              {cart.couponError && <p className="coupon-error" data-testid="coupon-error">{cart.couponError}</p>}
            </div>
          ) : (
            <>
              <form
                className="coupon-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act('/cart/coupon', { method: 'POST', body: { code: couponInput } }, { message: 'Coupon applied!', icon: '🎟️' })) setCouponInput('');
                }}
              >
                <input placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} data-testid="coupon-input" aria-label="Coupon code" />
                <button type="submit" className="btn btn-ghost" data-testid="apply-coupon">Apply</button>
              </form>
              <div className="coupon-hints">
                {COUPON_HINTS.map((c) => (
                  <button key={c} type="button" className="chip chip-sm" onClick={() => setCouponInput(c)}>🎟️ {c}</button>
                ))}
              </div>
            </>
          )}
          <Totals totals={cart.totals} />
          <button type="button" className="btn btn-primary btn-block" disabled={blocked} onClick={() => navigate('/checkout')} data-testid="go-to-checkout">
            Proceed to checkout <ArrowRight size={18} />
          </button>
          <Link to="/" className="continue-link">← Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
