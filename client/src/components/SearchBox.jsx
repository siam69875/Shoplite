import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { api, isAbort, money } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlight({ text, term }) {
  if (!term) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'ig'));
  return parts.map((part, i) => (part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : part));
}

/** Header search with live suggestions: queries the API as you type (debounced). */
export default function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('search') ?? '');
  const term = useDebouncedValue(query.trim(), 250);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!term) { setResults([]); setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    api(`/products?search=${encodeURIComponent(term)}&sort=popular&limit=6`, { signal: controller.signal })
      .then((d) => { setResults(d.products); setActive(-1); setLoading(false); })
      .catch((e) => { if (!isAbort(e)) { setResults([]); setLoading(false); } });
    return () => controller.abort();
  }, [term]);

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  function goToResults() {
    setOpen(false);
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && active >= 0 && results[active]) {
      e.preventDefault();
      setOpen(false);
      navigate(`/products/${results[active].id}`);
    }
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div className="searchbox" ref={boxRef}>
      <form onSubmit={(e) => { e.preventDefault(); goToResults(); }} role="search">
        <Search className="searchbox-icon" size={18} />
        <input
          type="search"
          value={query}
          placeholder="Search for saree, smartphone, honey…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls="search-suggestions"
          autoComplete="off"
          data-testid="header-search"
        />
        {loading && <Loader2 className="searchbox-spinner" size={18} />}
        {query && !loading && (
          <button type="button" className="searchbox-clear" aria-label="Clear search" onClick={() => { setQuery(''); setResults([]); }}>
            <X size={16} />
          </button>
        )}
        <button type="submit" className="searchbox-submit" data-testid="header-search-submit">Search</button>
      </form>

      {showPanel && (
        <div className="search-panel" id="search-suggestions" role="listbox" data-testid="search-suggestions">
          {!loading && term && results.length === 0 && (
            <p className="search-empty" data-testid="search-no-results">No products found for “{term}”</p>
          )}
          {results.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`suggestion ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => { setOpen(false); navigate(`/products/${p.id}`); }}
              data-testid="search-suggestion"
            >
              <span className="suggestion-art" style={{ background: metaFor(p.category).tile }}>{p.image}</span>
              <span className="suggestion-text">
                <span className="suggestion-name"><Highlight text={p.name} term={term} /></span>
                <span className="muted small">{p.category}</span>
              </span>
              <span className="suggestion-price">{money(p.price)}</span>
            </button>
          ))}
          {results.length > 0 && (
            <button type="button" className="suggestion-all" onClick={goToResults} data-testid="search-see-all">
              See all results for “{query.trim()}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
