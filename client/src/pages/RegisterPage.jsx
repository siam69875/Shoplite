import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorMessage } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { useStoreInfo, offerText } from '../storeInfo.jsx';
import { useToast } from '../toast.jsx';

export default function RegisterPage() {
  const store = useStoreInfo();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { signIn } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(await api('/auth/register', { method: 'POST', body: form }));
      const offer = store.welcomeOffer;
      toast(offer ? `Account created! Use ${offer.code} for ${offerText(offer)}.` : 'Account created!', { icon: '🎉' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-visual auth-visual-alt" aria-hidden="true">
        <span>🎁</span><span>🏏</span><span>🍵</span><span>🧸</span>
        <h2>Join ShopLite</h2>
        <p>{store.welcomeOffer
          ? `Get ${offerText(store.welcomeOffer)} your first order with code ${store.welcomeOffer.code}, plus loyalty points on every purchase.`
          : 'Earn loyalty points on every purchase.'}</p>
      </div>
      <form className="card auth-form" onSubmit={submit} data-testid="register-form">
        <h1>Create your account</h1>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="name-input" required />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="email-input" required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="password-input" required />
          <span className="muted small">At least 8 characters, with a letter and a number.</span>
        </label>
        <ErrorMessage error={error} />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy} data-testid="register-button">{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted small">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
