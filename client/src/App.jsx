import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useSession } from './session.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OrderPage from './pages/OrderPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ShopPage from './pages/ShopPage.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <div className="container"><p className="muted">Loading…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useSession();
  return (
    <RequireAuth>
      {user?.role === 'admin' ? children : <div className="container"><p className="alert alert-error">Admin access required.</p></div>}
    </RequireAuth>
  );
}

function NotFound() {
  return (
    <div className="container empty-state">
      <div className="empty-emoji">🧭</div>
      <h1>Page not found</h1>
      <Link to="/" className="btn btn-primary">Back to the shop</Link>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderPage /></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
