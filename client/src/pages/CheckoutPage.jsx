import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, MapPin, Smartphone } from 'lucide-react';
import { api, money } from '../api.js';
import { ErrorMessage, Totals } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { useStoreInfo } from '../storeInfo.jsx';
import { useToast } from '../toast.jsx';

export default function CheckoutPage() {
  const store = useStoreInfo();
  const { user, refreshCart } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [address, setAddress] = useState({ fullName: user?.name ?? '', phone: '', line1: '', city: 'Dhaka', postalCode: '' });
  const [method, setMethod] = useState('BKASH');
  const [card, setCard] = useState({ cardNumber: '', expiry: '', cvc: '' });
  const [bkash, setBkash] = useState({ walletNumber: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/cart').then((d) => setCart(d.cart)).catch((e) => setError(e.message));
    api('/checkout/districts').then((d) => setDistricts(d.districts)).catch(() => {});
  }, []);

  async function placeOrder(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payment = method === 'CARD' ? { method, ...card } : { method, ...bkash };
    try {
      const { order } = await api('/checkout', { method: 'POST', body: { shippingAddress: address, payment } });
      await refreshCart();
      toast(`Order #${order.id} placed!`, { icon: '🎉' });
      navigate(`/orders/${order.id}`, { state: { placed: true } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!cart) return <div className="container"><div className="skeleton skeleton-hero" /></div>;
  if (cart.items.length === 0) return <Navigate to="/cart" replace />;

  const field = (obj, set, key, label, props = {}) => (
    <label>
      {label}
      <input value={obj[key]} onChange={(e) => set({ ...obj, [key]: e.target.value })} data-testid={`${key}-input`} required {...props} />
    </label>
  );

  return (
    <div className="container">
      <ol className="checkout-steps">
        <li className="done">Cart</li><li className="current">Delivery & payment</li><li>Confirmation</li>
      </ol>
      <form className="two-col" onSubmit={placeOrder} data-testid="checkout-form">
        <div>
          <fieldset className="card">
            <legend><MapPin size={18} /> Delivery address</legend>
            <div className="row">
              {field(address, setAddress, 'fullName', 'Full name')}
              {field(address, setAddress, 'phone', 'Mobile number', { inputMode: 'tel', placeholder: '01712345678' })}
            </div>
            {field(address, setAddress, 'line1', 'Address', { placeholder: 'House, road, area' })}
            <div className="row">
              <label>
                District
                <select value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} data-testid="city-input">
                  {districts.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              {field(address, setAddress, 'postalCode', 'Postcode', { inputMode: 'numeric', placeholder: '1205' })}
            </div>
          </fieldset>

          <fieldset className="card">
            <legend><Lock size={18} /> Payment</legend>
            <div className="pay-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={method === 'BKASH'} className={`pay-tab bkash ${method === 'BKASH' ? 'active' : ''}`} onClick={() => setMethod('BKASH')} data-testid="pay-bkash">
                <Smartphone size={20} /> bKash
              </button>
              <button type="button" role="tab" aria-selected={method === 'CARD'} className={`pay-tab ${method === 'CARD' ? 'active' : ''}`} onClick={() => setMethod('CARD')} data-testid="pay-card">
                <CreditCard size={20} /> Card
              </button>
            </div>

            {method === 'BKASH' ? (
              <div className="pay-panel bkash-panel">
                <div className="row">
                  {field(bkash, setBkash, 'walletNumber', 'bKash account number', { inputMode: 'tel', placeholder: '01XXXXXXXXX' })}
                  <label>
                    Verification code
                    <div className="otp-row">
                      <input value={bkash.otp} onChange={(e) => setBkash({ ...bkash, otp: e.target.value })} inputMode="numeric" placeholder="6-digit code" data-testid="otp-input" required />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtpSent(true)} data-testid="send-otp">{otpSent ? 'Resend' : 'Send code'}</button>
                    </div>
                  </label>
                </div>
                {otpSent && <p className="small hint">📩 Demo: the code is <code>{store.demoBkashOtp}</code>. Numbers ending in <code>000</code> have insufficient balance.</p>}
              </div>
            ) : (
              <div className="pay-panel">
                {field(card, setCard, 'cardNumber', 'Card number', { inputMode: 'numeric', placeholder: '4242 4242 4242 4242' })}
                <div className="row">
                  {field(card, setCard, 'expiry', 'Expiry (MM/YY)', { placeholder: '12/30' })}
                  {field(card, setCard, 'cvc', 'CVC', { inputMode: 'numeric', placeholder: '123' })}
                </div>
                <p className="small hint">Test cards: <code>4242 4242 4242 4242</code> is approved, <code>4000 0000 0000 0002</code> is declined.</p>
              </div>
            )}
          </fieldset>
        </div>

        <aside className="card summary">
          <h2>Your order</h2>
          <ul className="summary-items">
            {cart.items.map((i) => (
              <li key={i.productId}><span className="summary-emoji">{i.image}</span> {i.quantity} × {i.name} <span className="right">{money(i.lineTotal)}</span></li>
            ))}
          </ul>
          {cart.couponCode && !cart.couponError && <p className="small">🎟️ Coupon <strong>{cart.couponCode}</strong> applied</p>}
          {cart.couponError && <p className="alert alert-error small">{cart.couponCode}: {cart.couponError}</p>}
          <Totals totals={cart.totals} />
          <ErrorMessage error={error} />
          <button type="submit" className={`btn btn-block ${method === 'BKASH' ? 'btn-bkash' : 'btn-primary'}`} disabled={busy} data-testid="place-order">
            {busy ? 'Processing…' : `Pay ${money(cart.totals.total)}${method === 'BKASH' ? ' with bKash' : ''}`}
          </button>
          <p className="muted small center"><Lock size={12} /> Secure checkout. Demo payments only.</p>
        </aside>
      </form>
    </div>
  );
}
