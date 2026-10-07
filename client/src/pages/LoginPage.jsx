import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorMessage } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { useStoreInfo } from '../storeInfo.jsx';
import { useToast } from '../toast.jsx';

const DEMO = [
  ['Admin', 'admin@shoplite.test', 'Admin@123'],
  ['Alice', 'alice@shoplite.test', 'Alice@123'],
  ['Bob', 'bob@shoplite.test', 'Bob@1234'],
];

export default function LoginPage() {
  const store = useStoreInfo();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { signIn } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api('/auth/login', { method: 'POST', body: form });
      signIn(session);
      toast(`Welcome back, ${session.user.name.split(' ')[0]}!`, { icon: '👋' });
      navigate(location.state?.from ?? (session.user.role === 'admin' ? '/admin' : '/'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-visual" aria-hidden="true">
        <span>🛍️</span><span>🥻</span><span>📱</span><span>🍯</span>
        <h2>Welcome back to {store.name}</h2>
        <p>Your favourite deshi products, one click away.</p>
      </div>
      <form className="card auth-form" onSubmit={submit} data-testid="login-form">
        <h1>Log in</h1>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="email-input" required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="password-input" required />
        </label>
        <ErrorMessage error={error} />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy} data-testid="login-button">{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted small">New here? <Link to="/register">Create an account</Link></p>
        <div className="demo-accounts">
          <span className="muted small">Demo accounts (click to fill):</span>
          <div className="demo-chips">
            {DEMO.map(([label, email, password]) => (
              <button key={email} type="button" className="chip" onClick={() => setForm({ email, password })}>{label}</button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
