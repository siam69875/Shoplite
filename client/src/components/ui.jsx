import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { money } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import { useStoreInfo } from '../storeInfo.jsx';

export function Totals({ totals, testId = 'totals' }) {
  const store = useStoreInfo();
  return (
    <dl className="totals" data-testid={testId}>
      <dt>Subtotal</dt><dd data-testid="subtotal">{money(totals.subtotal)}</dd>
      {totals.discount > 0 && (
        <><dt>Coupon discount</dt><dd data-testid="discount" className="discount">−{money(totals.discount)}</dd></>
      )}
      <dt>VAT ({store.vat})</dt><dd data-testid="tax">{money(totals.tax)}</dd>
      <dt>Delivery charge</dt><dd data-testid="shipping">{money(totals.shipping)}</dd>
      <dt className="grand">Total</dt><dd className="grand" data-testid="total">{money(totals.total)}</dd>
    </dl>
  );
}

const STOCK_LABEL = { IN_STOCK: 'In stock', LOW_STOCK: 'Only {n} left', OUT_OF_STOCK: 'Out of stock' };

export function StockBadge({ product }) {
  const label = STOCK_LABEL[product.stockStatus].replace('{n}', product.stock);
  return <span className={`badge stock-${product.stockStatus.toLowerCase()}`} data-testid="stock-badge">{label}</span>;
}

export function StatusBadge({ status }) {
  return <span className={`badge status-${status.toLowerCase()}`} data-testid="order-status">{status}</span>;
}

export function Stars({ rating, count, size }) {
  if (rating == null) return <span className="muted small">No reviews yet</span>;
  const pct = (rating / 5) * 100;
  return (
    <span className={`stars ${size === 'lg' ? 'stars-lg' : ''}`} title={`${rating} out of 5`}>
      <span className="stars-track">★★★★★<span className="stars-fill" style={{ width: `${pct}%` }}>★★★★★</span></span>
      <span className="stars-value">{rating}</span>
      {count != null && <span className="muted">({count})</span>}
    </span>
  );
}

export function ProductArt({ product, size = 'md' }) {
  const meta = metaFor(product.category);
  return (
    <div className={`product-art art-${size}`} style={{ background: meta.tile }} aria-hidden="true">
      <span className="art-emoji">{product.image}</span>
      <span className="art-shine" />
    </div>
  );
}

export function Price({ product, size }) {
  return (
    <div className={`price-block ${size === 'lg' ? 'price-lg' : ''}`}>
      <span className="price-now" data-testid="product-price">{money(product.price)}</span>
      {product.discountPercent > 0 && (
        <>
          <span className="price-was">{money(product.originalPrice)}</span>
          <span className="price-off">−{product.discountPercent}%</span>
        </>
      )}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 1, max, testId = 'qty' }) {
  return (
    <div className="stepper" data-testid={testId}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} data-testid={`${testId}-minus`}>
        <Minus size={16} />
      </button>
      <span className="stepper-value" data-testid={`${testId}-value`}>{value}</span>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} data-testid={`${testId}-plus`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function ErrorMessage({ error }) {
  if (!error) return null;
  return <p className="alert alert-error" role="alert" data-testid="error-message">{error}</p>;
}

export function Notice({ children }) {
  return <p className="alert alert-success" role="status" data-testid="notice">{children}</p>;
}

/** Fades children in when they scroll into view. */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${visible ? 'visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card skeleton-card">
          <div className="skeleton skeleton-art" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, icon }) {
  return (
    <div className="section-header">
      <div>
        <h2>{icon && <span className="section-icon">{icon}</span>}{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
