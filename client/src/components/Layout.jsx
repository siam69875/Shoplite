import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Package, Phone, ShoppingBag, Truck, User } from 'lucide-react';
import { api } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import { useSession } from '../session.jsx';
import { useStoreInfo } from '../storeInfo.jsx';
import SearchBox from './SearchBox.jsx';

function CartButton() {
  const { cartCount } = useSession();
  const [bump, setBump] = useState(false);
  const previous = useRef(cartCount);
  useEffect(() => {
    if (cartCount > previous.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 600);
      previous.current = cartCount;
      return () => clearTimeout(t);
    }
    previous.current = cartCount;
    return undefined;
  }, [cartCount]);

  return (
    <NavLink to="/cart" className="header-action cart-button" data-testid="nav-cart">
      <span className="icon-wrap">
        <ShoppingBag size={22} />
        <span className={`cart-count ${bump ? 'bump' : ''}`} data-testid="cart-count">{cartCount}</span>
      </span>
      <span className="action-label">Cart</span>
    </NavLink>
  );
}

function Header() {
  const store = useStoreInfo();
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const location = useLocation();
  const activeCategory = new URLSearchParams(location.search).get('category');

  useEffect(() => {
    api('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar-inner">
          <span><Truck size={14} /> Delivery all over Bangladesh in {store.deliveryDays} days · flat {store.delivery}</span>
          <span className="topbar-right"><Phone size={14} /> Hotline {store.hotline} · Pay with <b className="bkash-text">bKash</b> or card</span>
        </div>
      </div>
      <div className="container header-main">
        <Link to="/" className="logo" data-testid="logo">
          <span className="logo-mark">S</span>
          <span className="logo-text">ShopLite<small>Bangladesh</small></span>
        </Link>
        <SearchBox />
        <nav className="header-actions">
          {user ? (
            <>
              {user.role === 'admin' && (
                <NavLink to="/admin" className="header-action" data-testid="nav-admin">
                  <LayoutDashboard size={22} /><span className="action-label">Admin</span>
                </NavLink>
              )}
              <NavLink to="/orders" className="header-action" data-testid="nav-orders">
                <Package size={22} /><span className="action-label">Orders</span>
              </NavLink>
              <NavLink to="/account" className="header-action" data-testid="nav-account">
                <User size={22} /><span className="action-label">{user.name.split(' ')[0]}</span>
              </NavLink>
              <CartButton />
              <button
                type="button"
                className="header-action link-button"
                data-testid="logout"
                onClick={async () => { await signOut(); navigate('/'); }}
              >
                <LogOut size={22} /><span className="action-label">Log out</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="header-action" data-testid="nav-login">
                <User size={22} /><span className="action-label">Log in</span>
              </NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm" data-testid="nav-register">Sign up</NavLink>
            </>
          )}
        </nav>
      </div>
      <nav className="category-bar" aria-label="Categories">
        <div className="container category-bar-inner">
          <NavLink to="/shop" end className={!activeCategory && location.pathname === '/shop' ? 'chip active' : 'chip'}>🛍️ All</NavLink>
          {categories.map((c) => (
            <Link
              key={c.name}
              to={`/shop?category=${encodeURIComponent(c.name)}`}
              className={activeCategory === c.name ? 'chip active' : 'chip'}
              data-testid="category-chip"
            >
              {metaFor(c.name).icon} {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  const store = useStoreInfo();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="logo logo-footer"><span className="logo-mark">S</span><span className="logo-text">ShopLite<small>Bangladesh</small></span></div>
          <p className="muted">Your friendly online bazaar, from Rupganj Jamdani to Bogura doi, delivered to all 64 districts.</p>
          <div className="pay-badges">
            <span className="pay-badge bkash">bKash</span>
            <span className="pay-badge">VISA</span>
            <span className="pay-badge">Mastercard</span>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?onSale=1">Deals</Link>
          <Link to="/shop?sort=popular">Best sellers</Link>
          <Link to="/shop?sort=rating">Top rated</Link>
        </div>
        <div>
          <h4>Help</h4>
          <span>Delivery: {store.delivery} flat</span>
          <span>Returns within {store.refundDays} days</span>
          <span>Hotline {store.hotline}</span>
        </div>
        <div>
          <h4>Your account</h4>
          <Link to="/orders">Track orders</Link>
          <Link to="/account">Loyalty points</Link>
          <Link to="/cart">Cart</Link>
        </div>
      </div>
      <div className="container footer-bottom muted small">
        © ShopLite. A demo store for QA training. No real payments are processed.
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return (
    <>
      <Header />
      <main className="page" key={location.pathname}>{children}</main>
      <Footer />
    </>
  );
}
