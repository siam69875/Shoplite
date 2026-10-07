import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, RotateCcw, ShoppingCart, Truck, Wallet, Zap } from 'lucide-react';
import { api, formatDate } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import ProductCarousel from '../components/ProductCarousel.jsx';
import { ErrorMessage, Price, ProductArt, QtyStepper, SectionHeader, Stars, StockBadge } from '../components/ui.jsx';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { useProducts } from '../hooks/useProducts.js';
import { useSession } from '../session.jsx';
import { useStoreInfo } from '../storeInfo.jsx';
import { useToast } from '../toast.jsx';

function RatingBreakdown({ reviews }) {
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="rating-bars">
      {counts.map((count, i) => (
        <div key={i} className="rating-bar">
          <span>{5 - i} ★</span>
          <span className="bar"><span style={{ width: `${(count / max) * 100}%` }} /></span>
          <span className="muted small">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const store = useStoreInfo();
  const { id } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const addToCart = useAddToCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState(null);
  const related = useProducts({ category: product?.category ?? '__none__', sort: 'popular', limit: 12 });

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api(`/products/${id}`), api(`/products/${id}/reviews`)]);
      setProduct(p.product);
      setReviews(r.reviews);
      if (user) setEligibility(await api(`/products/${id}/reviews/eligibility`));
    } catch (e) {
      setError(e.message);
    }
  }, [id, user]);

  useEffect(() => { setQuantity(1); load(); }, [load]);

  async function submitReview(e) {
    e.preventDefault();
    setReviewError(null);
    try {
      await api(`/products/${id}/reviews`, { method: 'POST', body: { rating: Number(review.rating), comment: review.comment } });
      setReview({ rating: 5, comment: '' });
      toast('Thanks for your review!', { icon: '⭐' });
      await load();
    } catch (err) {
      setReviewError(err.message);
    }
  }

  if (!product) return <div className="container">{error ? <ErrorMessage error={error} /> : <div className="skeleton skeleton-hero" />}</div>;

  const soldOut = product.stockStatus === 'OUT_OF_STOCK';
  const maxQty = Math.max(1, Math.min(store.maxQtyPerItem, product.stock));
  const meta = metaFor(product.category);

  return (
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link><ChevronRight size={14} />
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><ChevronRight size={14} />
        <span>{product.name}</span>
      </nav>

      <section className="product-detail card">
        <div className="detail-art">
          {product.discountPercent > 0 && <span className="ribbon ribbon-lg">−{product.discountPercent}%</span>}
          <ProductArt product={product} size="lg" />
        </div>
        <div className="detail-info">
          <span className="category-pill" style={{ color: meta.accent, background: meta.tile }}>{meta.icon} {product.category}</span>
          <h1 data-testid="product-title">{product.name}</h1>
          <div className="detail-rating">
            <Stars rating={product.avgRating} count={product.reviewCount} />
            {product.soldCount > 0 && <span className="muted">· {product.soldCount} sold</span>}
          </div>
          <Price product={product} size="lg" />
          {product.discountPercent > 0 && <p className="save-line">You save ৳{(product.originalPrice - product.price).toLocaleString('en-IN')}</p>}
          <StockBadge product={product} />
          <p className="detail-description">{product.description}</p>

          <div className="buy-row">
            <QtyStepper value={quantity} onChange={setQuantity} max={maxQty} testId="quantity" />
            <button type="button" className="btn btn-primary" disabled={soldOut} onClick={() => addToCart(product, quantity)} data-testid="detail-add-to-cart">
              <ShoppingCart size={18} /> Add to cart
            </button>
            <button
              type="button"
              className="btn btn-accent"
              disabled={soldOut}
              onClick={async () => { if (await addToCart(product, quantity)) navigate('/cart'); }}
              data-testid="buy-now"
            >
              <Zap size={18} /> Buy now
            </button>
          </div>
          <p className="muted small">Max {store.maxQty} per customer per item.</p>

          <div className="delivery-info">
            <div><Truck size={20} /><span><b>Delivery {store.delivery}</b><br /><span className="muted small">{store.deliveryDays} days, all over Bangladesh</span></span></div>
            <div><Wallet size={20} /><span><b>bKash & cards</b><br /><span className="muted small">Secure payment</span></span></div>
            <div><RotateCcw size={20} /><span><b>{store.refundDays}-day returns</b><br /><span className="muted small">Full refund after delivery</span></span></div>
          </div>
        </div>
      </section>

      <section className="section reviews-section">
        <SectionHeader title="Ratings & reviews" />
        <div className="reviews-layout">
          <div className="card review-summary">
            <div className="big-rating">{product.avgRating ?? '–'}</div>
            <Stars rating={product.avgRating} size="lg" />
            <p className="muted small">{product.reviewCount} verified review{product.reviewCount === 1 ? '' : 's'}</p>
            <RatingBreakdown reviews={reviews} />
          </div>
          <div>
            {user && eligibility?.canReview && (
              <form className="card review-form" onSubmit={submitReview} data-testid="review-form">
                <h3>Write a review</h3>
                <div className="star-picker" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={Number(review.rating) === n} className={n <= review.rating ? 'on' : ''} onClick={() => setReview({ ...review, rating: n })} data-testid={`star-${n}`}>★</button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="What did you like or dislike?"
                  value={review.comment}
                  onChange={(e) => setReview({ ...review, comment: e.target.value })}
                  data-testid="review-comment"
                />
                <ErrorMessage error={reviewError} />
                <button type="submit" className="btn btn-primary" data-testid="submit-review">Submit review</button>
              </form>
            )}
            {user && eligibility && !eligibility.canReview && <p className="muted small" data-testid="review-ineligible">{eligibility.reason}</p>}
            {!user && <p className="muted small"><Link to="/login">Log in</Link> to review products you have received.</p>}
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet.</p>
            ) : (
              <ul className="review-list" data-testid="review-list">
                {reviews.map((r) => (
                  <li key={r.id} className="card review">
                    <div className="review-head">
                      <span className="avatar">{r.author[0]}</span>
                      <div>
                        <strong>{r.author}</strong>
                        <span className="muted small"> · {formatDate(r.createdAt)} · ✔ Verified buyer</span>
                        <div><Stars rating={r.rating} /></div>
                      </div>
                    </div>
                    {r.comment && <p>{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader title={`More in ${product.category}`} />
        <ProductCarousel products={related.products?.filter((p) => p.id !== product.id)} testId="related-products" />
      </section>
    </div>
  );
}
