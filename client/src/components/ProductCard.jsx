import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { Price, ProductArt, Stars, StockBadge } from './ui.jsx';

export default function ProductCard({ product }) {
  const addToCart = useAddToCart();
  const [adding, setAdding] = useState(false);
  const soldOut = product.stockStatus === 'OUT_OF_STOCK';

  async function add() {
    setAdding(true);
    await addToCart(product, 1);
    setAdding(false);
  }

  return (
    <article className={`card product-card ${soldOut ? 'sold-out' : ''}`} data-testid={`product-card-${product.id}`}>
      {product.discountPercent > 0 && <span className="ribbon" data-testid="discount-ribbon">−{product.discountPercent}%</span>}
      <Link to={`/products/${product.id}`} className="product-link">
        <ProductArt product={product} />
        <p className="product-category">{product.category}</p>
        <h3 className="product-name" data-testid="product-name">{product.name}</h3>
      </Link>
      <div className="product-meta">
        <Stars rating={product.avgRating} count={product.reviewCount || null} />
        {product.soldCount > 0 && <span className="muted small">{product.soldCount} sold</span>}
      </div>
      <Price product={product} />
      <div className="product-footer">
        <StockBadge product={product} />
        <button
          type="button"
          className={`btn-icon ${adding ? 'is-adding' : ''}`}
          disabled={soldOut || adding}
          onClick={add}
          aria-label={`Add ${product.name} to cart`}
          data-testid="add-to-cart"
        >
          <ShoppingCart size={18} />
        </button>
      </div>
    </article>
  );
}
