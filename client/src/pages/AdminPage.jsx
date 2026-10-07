import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgePercent, Banknote, LayoutDashboard, Package, ReceiptText, ShoppingBag, Tag, Undo2, Users } from 'lucide-react';
import { api, formatDate, money } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import { ErrorMessage, StatusBadge, StockBadge } from '../components/ui.jsx';
import { useToast } from '../toast.jsx';

const TABS = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', ShoppingBag],
  ['products', 'Products', Package],
  ['coupons', 'Coupons', Tag],
];

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([t]) => t === params.get('tab')) ? params.get('tab') : 'dashboard';

  return (
    <div className="container admin">
      <h1 className="page-title">Admin console</h1>
      <div className="tabs" role="tablist">
        {TABS.map(([t, label, Icon]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'tab active' : 'tab'}
            onClick={() => setParams({ tab: t })}
            data-testid={`admin-tab-${t}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'orders' && <Orders />}
      {tab === 'products' && <Products />}
      {tab === 'coupons' && <Coupons />}
    </div>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api('/admin/reports/summary').then((d) => setSummary(d.summary)).catch((e) => setError(e.message));
  }, []);
  if (error) return <ErrorMessage error={error} />;
  if (!summary) return <div className="skeleton skeleton-hero" />;

  const stats = [
    ['Revenue', money(summary.revenue), 'stat-revenue', Banknote, 'g-green'],
    ['Paid orders', summary.paidOrderCount, 'stat-orders', ShoppingBag, 'g-purple'],
    ['Avg. order', money(summary.averageOrderValue), 'stat-aov', ReceiptText, 'g-blue'],
    ['Refunded', money(summary.refundedAmount), 'stat-refunded', Undo2, 'g-red'],
    ['VAT collected', money(summary.taxCollected), 'stat-tax', ReceiptText, 'g-orange'],
    ['Discounts given', money(summary.discountsGiven), 'stat-discounts', BadgePercent, 'g-pink'],
    ['Customers', summary.customerCount, 'stat-customers', Users, 'g-teal'],
  ];
  const maxUnits = Math.max(1, ...summary.topProducts.map((p) => p.units));

  return (
    <>
      <div className="stats">
        {stats.map(([label, value, id, Icon, tone]) => (
          <div key={id} className={`stat ${tone}`} data-testid={id}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="two-col even">
        <section className="card">
          <h2>Top products</h2>
          <ul className="bar-list">
            {summary.topProducts.map((p) => (
              <li key={p.productId}>
                <span>{p.name}</span>
                <span className="bar"><span style={{ width: `${(p.units / maxUnits) * 100}%` }} /></span>
                <span className="muted small">{p.units} sold · {money(p.sales)}</span>
              </li>
            ))}
          </ul>
          <h2>Orders by status</h2>
          <div className="status-row">
            {Object.entries(summary.ordersByStatus).map(([status, count]) => (
              <span key={status} className="status-count"><StatusBadge status={status} /> {count}</span>
            ))}
          </div>
        </section>
        <section className="card" data-testid="low-stock">
          <h2>Low stock alerts</h2>
          {summary.lowStock.length === 0 ? <p className="muted">All products are well stocked.</p> : (
            <ul className="plain">
              {summary.lowStock.map((p) => (
                <li key={p.productId}>{p.name} <span className={`right badge ${p.quantity === 0 ? 'stock-out_of_stock' : 'stock-low_stock'}`}>{p.quantity} left</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const NEXT_ACTIONS = {
  PAID: [['SHIPPED', 'Mark shipped'], ['ON_HOLD', 'Put on hold'], ['CANCELLED', 'Cancel']],
  ON_HOLD: [['SHIPPED', 'Release & ship']],
  SHIPPED: [['DELIVERED', 'Mark delivered']],
  DELIVERED: [['REFUNDED', 'Refund']],
};

function Orders() {
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    api(`/admin/orders${status ? `?status=${status}` : ''}`).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function changeStatus(orderId, next) {
    setError(null);
    try {
      await api(`/admin/orders/${orderId}/status`, { method: 'POST', body: { status: next } });
      toast(`Order #${orderId} → ${next}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="admin-order-filter" aria-label="Filter by status">
          <option value="">All statuses</option>
          {['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ErrorMessage error={error} />
      {!orders ? <div className="skeleton skeleton-hero" /> : (
        <div className="table-wrap">
          <table className="table" data-testid="admin-orders-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} data-testid={`admin-order-${o.id}`}>
                  <td>#{o.id}</td>
                  <td>{o.customer.name}<div className="muted small">{o.customer.email}</div></td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>{money(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="actions">
                    {(NEXT_ACTIONS[o.status] ?? []).map(([next, label]) => (
                      <button
                        key={next}
                        type="button"
                        className={`btn btn-sm ${next === 'CANCELLED' || next === 'REFUNDED' ? 'btn-danger-ghost' : 'btn-primary'}`}
                        onClick={() => changeStatus(o.id, next)}
                        data-testid={`set-${next.toLowerCase()}`}
                      >
                        {label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const EMPTY_PRODUCT = { name: '', category: '', price: '', originalPrice: '', stock: '', image: '📦', description: '' };

function Products() {
  const [products, setProducts] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [stockEdits, setStockEdits] = useState({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    api('/admin/products').then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function run(fn, message) {
    setError(null);
    try {
      await fn();
      toast(message);
      load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name,
      category: form.category,
      description: form.description,
      image: form.image,
      price: Number(form.price),
      originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
      ...(editingId ? {} : { stock: Number(form.stock) }),
    };
    const ok = await run(
      () => api(editingId ? `/admin/products/${editingId}` : '/admin/products', { method: editingId ? 'PUT' : 'POST', body }),
      editingId ? 'Product updated' : 'Product created',
    );
    if (ok) { setForm(EMPTY_PRODUCT); setEditingId(null); }
  }

  function edit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, price: p.price, originalPrice: p.originalPrice ?? '', stock: p.stock, image: p.image, description: p.description });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const visible = (products ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <ErrorMessage error={error} />
      <form className="card" onSubmit={save} data-testid="product-form">
        <h2>{editingId ? `Edit product #${editingId}` : 'Add a product'}</h2>
        <div className="row">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="product-name-input" /></label>
          <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="category-options" data-testid="product-category-input" /></label>
          <label>Price (৳)<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" data-testid="product-price-input" /></label>
          <label>Original price (৳)<input value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} inputMode="numeric" placeholder="optional" data-testid="product-original-price-input" /></label>
          {!editingId && <label>Stock<input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} inputMode="numeric" data-testid="product-stock-input" /></label>}
          <label className="narrow-field">Icon<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label>
        </div>
        <datalist id="category-options">
          {[...new Set((products ?? []).map((p) => p.category))].map((c) => <option key={c} value={c} />)}
        </datalist>
        <label>Description<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button type="submit" className="btn btn-primary" data-testid="save-product">{editingId ? 'Save changes' : 'Add product'}</button>{' '}
        {editingId && <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY_PRODUCT); }}>Cancel</button>}
      </form>

      <div className="toolbar">
        <input type="search" placeholder="Filter products…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Filter products" />
      </div>
      {!products ? <div className="skeleton skeleton-hero" /> : (
        <div className="table-wrap">
          <table className="table" data-testid="admin-products-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} data-testid={`admin-product-${p.id}`}>
                  <td><span className="table-thumb" style={{ background: metaFor(p.category).tile }}>{p.image}</span> {p.name}</td>
                  <td>{p.category}</td>
                  <td>{money(p.price)}{p.originalPrice && <div className="muted small strike">{money(p.originalPrice)}</div>}</td>
                  <td>
                    <div className="inline-form">
                      <input
                        className="qty-input"
                        value={stockEdits[p.id] ?? p.stock}
                        onChange={(e) => setStockEdits({ ...stockEdits, [p.id]: e.target.value })}
                        aria-label={`Stock for ${p.name}`}
                        data-testid="stock-input"
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => run(() => api(`/admin/products/${p.id}/stock`, { method: 'PATCH', body: { quantity: Number(stockEdits[p.id] ?? p.stock) } }), `Stock updated for ${p.name}`)}
                        data-testid="save-stock"
                      >
                        Set
                      </button>
                      <StockBadge product={p} />
                    </div>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(p)} data-testid="edit-product">Edit</button>
                    <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => run(() => api(`/admin/products/${p.id}`, { method: 'DELETE' }), `${p.name} deleted`)} data-testid="delete-product">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const EMPTY_COUPON = { code: '', type: 'PERCENT', value: '', minSubtotal: '', usageLimit: '', expiresAt: '' };

function Coupons() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);
  const [error, setError] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    api('/admin/coupons').then((d) => setCoupons(d.coupons)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/admin/coupons', {
        method: 'POST',
        body: {
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minSubtotal: form.minSubtotal ? Number(form.minSubtotal) : 0,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          expiresAt: form.expiresAt || null,
        },
      });
      toast(`Coupon ${form.code.toUpperCase()} created`, { icon: '🎟️' });
      setForm(EMPTY_COUPON);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(c) {
    setError(null);
    try {
      await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { active: !c.active } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const describe = (c) => (c.type === 'PERCENT' ? `${c.value}% off` : `${money(c.value)} off`);

  return (
    <>
      <ErrorMessage error={error} />
      <form className="card" onSubmit={create} data-testid="coupon-form">
        <h2>Create a coupon</h2>
        <div className="row">
          <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="coupon-code-input" /></label>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="coupon-type-select">
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed amount (৳)</option>
            </select>
          </label>
          <label>{form.type === 'PERCENT' ? 'Percent' : 'Amount (৳)'}<input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} inputMode="numeric" data-testid="coupon-value-input" /></label>
          <label>Min. order (৳)<input value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} inputMode="numeric" /></label>
          <label>Usage limit<input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} inputMode="numeric" /></label>
          <label>Expires<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></label>
        </div>
        <button type="submit" className="btn btn-primary" data-testid="create-coupon">Create coupon</button>
      </form>

      {!coupons ? <div className="skeleton skeleton-hero" /> : (
        <div className="coupon-grid" data-testid="admin-coupons-table">
          {coupons.map((c) => (
            <div key={c.id} className={`coupon-ticket ${c.active ? '' : 'inactive'}`} data-testid={`admin-coupon-${c.code}`}>
              <div className="coupon-left">
                <code>{c.code}</code>
                <strong>{describe(c)}</strong>
              </div>
              <div className="coupon-right small">
                <span>Min. order: {c.minSubtotal ? money(c.minSubtotal) : '—'}</span>
                <span>Used: {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span>
                <span>Expires: {c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
