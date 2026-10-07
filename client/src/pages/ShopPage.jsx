import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, CURRENCY, money } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorMessage, Reveal, SkeletonGrid } from '../components/ui.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useProducts } from '../hooks/useProducts.js';

const SORT_OPTIONS = [
  ['popular', 'Best selling'],
  ['rating', 'Top rated'],
  ['newest', 'Newest'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
  ['name', 'Name A–Z'],
];

/**
 * Keeps a text input in sync with a URL parameter, writing to the URL after the user stops typing.
 * Changes that come from outside (e.g. the header search) update the input without a loop.
 */
function useDebouncedParam(params, setParams, key, delay) {
  const urlValue = params.get(key) ?? '';
  const [value, setValue] = useState(urlValue);
  const debounced = useDebouncedValue(value, delay);
  const lastWritten = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== lastWritten.current) {
      lastWritten.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    const next = debounced.trim();
    if (next === (params.get(key) ?? '')) return;
    lastWritten.current = next;
    const updated = new URLSearchParams(params);
    if (next) updated.set(key, next); else updated.delete(key);
    setParams(updated, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [value, setValue, value.trim() !== debounced.trim()];
}

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch, typing] = useDebouncedParam(params, setParams, 'search', 300);
  const [minPrice, setMinPrice] = useDebouncedParam(params, setParams, 'minPrice', 500);
  const [maxPrice, setMaxPrice] = useDebouncedParam(params, setParams, 'maxPrice', 500);

  const filters = {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    sort: params.get('sort') ?? 'popular',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    inStock: params.get('inStock') === '1' ? 1 : '',
    onSale: params.get('onSale') === '1' ? 1 : '',
  };
  const { products, loading, error } = useProducts(filters);

  useEffect(() => {
    api('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }

  function clearAll() {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setParams({}, { replace: true });
  }

  const activeFilters = ['search', 'category', 'minPrice', 'maxPrice', 'inStock', 'onSale'].filter((k) => params.get(k));
  const heading = filters.category || (filters.onSale ? 'Deals & discounts' : 'All products');

  return (
    <div className="container shop">
      <div className="shop-hero" style={{ background: filters.category ? metaFor(filters.category).tile : undefined }}>
        <div>
          <h1 data-testid="shop-heading">{filters.category && <span className="shop-hero-icon">{metaFor(filters.category).icon}</span>}{heading}</h1>
          <p className="muted">
            {products ? `${products.length} product${products.length === 1 ? '' : 's'}` : 'Loading…'}
            {filters.search && <> matching “<b>{filters.search}</b>”</>}
          </p>
        </div>
      </div>

      <div className="shop-layout">
        <aside className={`filters-panel card ${filtersOpen ? 'open' : ''}`} data-testid="filters-panel">
          <div className="filters-head">
            <h3><SlidersHorizontal size={18} /> Filters</h3>
            {activeFilters.length > 0 && <button type="button" className="link-button" onClick={clearAll} data-testid="clear-filters">Clear all</button>}
          </div>

          <h4>Category</h4>
          <div className="filter-list">
            <button type="button" className={!filters.category ? 'filter-option active' : 'filter-option'} onClick={() => update('category', '')}>
              🛍️ All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                className={filters.category === c.name ? 'filter-option active' : 'filter-option'}
                onClick={() => update('category', c.name)}
                data-testid="filter-category"
              >
                {metaFor(c.name).icon} {c.name} <span className="muted small">{c.count}</span>
              </button>
            ))}
          </div>

          <h4>Price ({CURRENCY})</h4>
          <div className="price-range">
            <input inputMode="numeric" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price" data-testid="min-price" />
            <span>–</span>
            <input inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price" data-testid="max-price" />
          </div>

          <h4>Availability</h4>
          <label className="toggle">
            <input type="checkbox" checked={Boolean(filters.inStock)} onChange={(e) => update('inStock', e.target.checked ? '1' : '')} data-testid="in-stock-toggle" />
            <span className="toggle-track" /> In stock only
          </label>
          <label className="toggle">
            <input type="checkbox" checked={Boolean(filters.onSale)} onChange={(e) => update('onSale', e.target.checked ? '1' : '')} data-testid="on-sale-toggle" />
            <span className="toggle-track" /> On sale
          </label>
        </aside>

        <section className="shop-results">
          <div className="shop-toolbar card">
            <div className="shop-search">
              <Search size={18} className="shop-search-icon" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search: results update as you type"
                aria-label="Search products"
                data-testid="search-input"
              />
              {(typing || loading) && <Loader2 size={18} className="spin" data-testid="search-loading" />}
            </div>
            <select value={filters.sort} onChange={(e) => update('sort', e.target.value)} aria-label="Sort by" data-testid="sort-select">
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" className="btn btn-ghost filters-toggle" onClick={() => setFiltersOpen((o) => !o)}>
              <SlidersHorizontal size={16} /> Filters
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="active-filters">
              {activeFilters.map((k) => (
                <button key={k} type="button" className="filter-pill" onClick={() => { if (k === 'search') setSearch(''); if (k === 'minPrice') setMinPrice(''); if (k === 'maxPrice') setMaxPrice(''); update(k, ''); }}>
                  {k === 'inStock' ? 'In stock' : k === 'onSale' ? 'On sale' : k === 'minPrice' ? `From ${money(Number(params.get(k)))}` : k === 'maxPrice' ? `Up to ${money(Number(params.get(k)))}` : params.get(k)}
                  <X size={14} />
                </button>
              ))}
            </div>
          )}

          <ErrorMessage error={error} />
          {!products ? (
            <SkeletonGrid count={8} />
          ) : products.length === 0 ? (
            <div className="empty-state" data-testid="no-results">
              <div className="empty-emoji">🔍</div>
              <h2>No products found</h2>
              <p className="muted">Try a different word or clear some filters.</p>
              <button type="button" className="btn btn-primary" onClick={clearAll}>Clear filters</button>
            </div>
          ) : (
            <div className={`product-grid ${loading ? 'is-loading' : ''}`} data-testid="product-grid">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 50}><ProductCard product={p} /></Reveal>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
