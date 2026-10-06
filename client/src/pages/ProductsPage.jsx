import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { ErrorMessage, Notice, Stars, StockBadge } from '../components/ui.jsx';
import { useSession } from '../session.jsx';

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const { user, refreshCart } = useSession();
  const navigate = useNavigate();

  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'name';

  useEffect(() => {
    api('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ search, category, sort }).toString();
    api(`/products?${qs}`).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }, [search, category, sort]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }

  async function addToCart(product) {
    if (!user) return navigate('/login', { state: { from: '/' } });
    setError(null);
    setNotice(null);
    try {
      await api('/cart/items', { method: 'POST', body: { productId: product.id, quantity: 1 } });
      await refreshCart();
      setNotice(`${product.name} added to your cart.`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Everyday things, fairly priced.</h1>
        <p className="muted">Free returns within 30 days. Earn 1 loyalty point for every dollar you spend.</p>
      </section>

      <form
        className="filters"
        onSubmit={(e) => { e.preventDefault(); update('search', searchInput.trim()); }}
      >
        <input
          type="search"
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          data-testid="search-input"
          aria-label="Search products"
        />
        <button type="submit" data-testid="search-button">Search</button>
        <select value={category} onChange={(e) => update('category', e.target.value)} data-testid="category-filter" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => update('sort', e.target.value)} data-testid="sort-select" aria-label="Sort by">
          <option value="name">Name</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </form>

      <ErrorMessage error={error} />
      {notice && <Notice>{notice}</Notice>}

      {products === null ? (
        <p className="muted">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="empty" data-testid="no-results">No products match your search.</p>
      ) : (
        <div className="grid" data-testid="product-grid">
          {products.map((p) => (
            <article key={p.id} className="card product-card" data-testid={`product-card-${p.id}`}>
              <Link to={`/products/${p.id}`} className="product-link">
                <div className="product-image" aria-hidden="true">{p.image}</div>
                <h3 data-testid="product-name">{p.name}</h3>
              </Link>
              <p className="muted small">{p.category}</p>
              <Stars rating={p.avgRating} />
              <div className="product-footer">
                <strong data-testid="product-price">{money(p.priceCents)}</strong>
                <StockBadge product={p} />
              </div>
              <button
                type="button"
                disabled={p.stockStatus === 'OUT_OF_STOCK'}
                onClick={() => addToCart(p)}
                data-testid="add-to-cart"
              >
                Add to cart
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
