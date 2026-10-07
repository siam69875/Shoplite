import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { api, formatDate } from '../api.js';
import { ErrorMessage } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { useStoreInfo } from '../storeInfo.jsx';
import { useToast } from '../toast.jsx';

const REASON_LABEL = { ORDER_DELIVERED: 'Order delivered', ORDER_REFUNDED: 'Order refunded' };

function tierFor(points) {
  if (points >= 500) return ['Gold', '🥇'];
  if (points >= 100) return ['Silver', '🥈'];
  return ['Bronze', '🥉'];
}

export default function AccountPage() {
  const store = useStoreInfo();
  const { user, setUser } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [loyalty, setLoyalty] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/loyalty').then(setLoyalty).catch((e) => setError(e.message));
    api('/notifications').then((d) => setInbox(d.notifications)).catch((e) => setError(e.message));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError(null);
    try {
      const { user: updated } = await api('/users/me', { method: 'PATCH', body: { name } });
      setUser(updated);
      toast('Profile saved');
    } catch (err) {
      setError(err.message);
    }
  }

  const [tier, medal] = tierFor(loyalty?.balance ?? 0);

  return (
    <div className="container">
      <h1 className="page-title">Hello, {user.name.split(' ')[0]} 👋</h1>
      <ErrorMessage error={error} />
      <div className="two-col even">
        <section className="loyalty-card" data-testid="loyalty-card">
          <div className="loyalty-top">
            <span>{store.name} Rewards</span>
            <span className="loyalty-tier">{medal} {tier}</span>
          </div>
          <div className="loyalty-points"><span data-testid="loyalty-balance">{loyalty?.balance ?? '—'}</span> points</div>
          <p>Earn 1 point for every {store.perPoint} spent. Points are credited when your order is delivered.</p>
          <div className="loyalty-name">{user.name}</div>
        </section>

        <form className="card" onSubmit={saveProfile} data-testid="profile-form">
          <h2>Profile</h2>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" />
          </label>
          <label>
            Email
            <input value={user.email} disabled />
          </label>
          <button type="submit" className="btn btn-primary" data-testid="save-profile">Save changes</button>
        </form>
      </div>

      {loyalty?.ledger.length > 0 && (
        <section className="card">
          <h2>Points history</h2>
          <ul className="ledger" data-testid="loyalty-ledger">
            {loyalty.ledger.map((e) => (
              <li key={e.id}>
                <span className={e.points > 0 ? 'positive' : 'negative'}>{e.points > 0 ? '+' : ''}{e.points}</span>
                <span>{REASON_LABEL[e.reason] ?? e.reason} · <Link to={`/orders/${e.orderId}`}>Order #{e.orderId}</Link></span>
                <span className="muted small right">{formatDate(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2><Mail size={20} /> Inbox</h2>
        <p className="muted small">Emails {store.name} sent you (simulated).</p>
        {inbox.length === 0 ? <p className="muted">No messages.</p> : (
          <ul className="inbox" data-testid="inbox">
            {inbox.map((n) => (
              <li key={n.id} className="card inbox-item">
                <div className="title-row">
                  <strong>{n.subject}</strong>
                  <span className="muted small">{formatDate(n.createdAt)}</span>
                </div>
                <p>{n.body}</p>
                <p className="muted small">To: {n.toEmail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
