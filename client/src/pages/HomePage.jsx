import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, Flame, Gift, ShieldCheck, Sparkles, Star, Truck, Wallet, Zap } from 'lucide-react';
import { api } from '../api.js';
import { metaFor } from '../catalogMeta.js';
import HeroCarousel from '../components/HeroCarousel.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductCarousel from '../components/ProductCarousel.jsx';
import { Reveal, SectionHeader, SkeletonGrid } from '../components/ui.jsx';
import { useProducts } from '../hooks/useProducts.js';
import { useStoreInfo } from '../storeInfo.jsx';

function useCountdownToMidnight() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => {
      const end = new Date();
      end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, end - Date.now()));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const s = Math.floor(left / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));
}

function Countdown() {
  const [h, m, s] = useCountdownToMidnight();
  return (
    <div className="countdown" aria-label="Time left in today's flash sale" data-testid="flash-countdown">
      <span>Ends in</span>
      <b>{h}</b>:<b>{m}</b>:<b>{s}</b>
    </div>
  );
}

const perks = (store) => [
  [Truck, 'Nationwide delivery', `Flat ${store.delivery} to ${store.districtCount} districts`],
  [Wallet, 'Pay your way', 'bKash or any Visa/Mastercard'],
  [ShieldCheck, `${store.refundDays}-day returns`, 'Full refund after delivery'],
  [Gift, 'Loyalty points', `1 point for every ${store.perPoint}`],
];

export default function HomePage() {
  const store = useStoreInfo();
  const [categories, setCategories] = useState(null);
  const flash = useProducts({ onSale: 1, sort: 'discount', limit: 12 });
  const popular = useProducts({ sort: 'popular', limit: 12 });
  const topRated = useProducts({ sort: 'rating', limit: 8 });
  const forYou = useProducts({ sort: 'newest', inStock: 1, limit: 20 });

  useEffect(() => {
    api('/products/categories').then((d) => setCategories(d.categories)).catch(() => setCategories([]));
  }, []);

  return (
    <div className="container home">
      <HeroCarousel />

      <section className="perks">
        {perks(store).map(([Icon, title, text], i) => (
          <Reveal key={i} className="perk" delay={i * 80}>
            <span className="perk-icon"><Icon size={22} /></span>
            <div><strong>{title}</strong><span className="muted small">{text}</span></div>
          </Reveal>
        ))}
      </section>

      <section className="section">
        <SectionHeader title="Shop by category" icon={<Sparkles size={22} />} />
        <div className="category-grid" data-testid="category-grid">
          {(categories ?? []).map((c, i) => {
            const meta = metaFor(c.name);
            return (
              <Reveal key={c.name} delay={i * 40}>
                <Link to={`/shop?category=${encodeURIComponent(c.name)}`} className="category-tile" style={{ '--accent': meta.accent, background: meta.tile }}>
                  <span className="category-emoji">{meta.icon}</span>
                  <span className="category-name">{c.name}</span>
                  <span className="category-count">{c.count} items</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="section flash-sale">
        <SectionHeader
          title="Flash Sale"
          icon={<Zap size={22} className="flash-icon" />}
          subtitle="Today only: the biggest discounts in the store"
          action={<div className="flash-actions"><Countdown /><Link to="/shop?onSale=1&sort=discount" className="link-arrow">See all <ArrowRight size={16} /></Link></div>}
        />
        <ProductCarousel products={flash.products} autoplay testId="flash-sale" />
      </section>

      <Reveal as="section" className="promo-row">
        <Link to="/shop?category=Handicrafts" className="promo promo-craft">
          <div>
            <span className="promo-eyebrow">Made in Bangladesh</span>
            <h3>Support local artisans</h3>
            <p>Rickshaw art, Nakshi Kantha, Shital Pati and more.</p>
          </div>
          <span className="promo-emoji">🛺</span>
        </Link>
        <Link to="/checkout" className="promo promo-bkash">
          <div>
            <span className="promo-eyebrow">Fast & secure</span>
            <h3>Pay with bKash</h3>
            <p>Checkout in seconds with your bKash wallet.</p>
          </div>
          <span className="promo-emoji">📲</span>
        </Link>
      </Reveal>

      <section className="section">
        <SectionHeader
          title="Best sellers"
          icon={<Flame size={22} />}
          subtitle="What Bangladesh is buying right now"
          action={<Link to="/shop?sort=popular" className="link-arrow">See all <ArrowRight size={16} /></Link>}
        />
        <ProductCarousel products={popular.products} testId="best-sellers" />
      </section>

      <section className="section">
        <SectionHeader
          title="Top rated"
          icon={<Star size={22} />}
          subtitle="Loved by verified buyers"
          action={<Link to="/shop?sort=rating" className="link-arrow">See all <ArrowRight size={16} /></Link>}
        />
        {topRated.products ? (
          <div className="product-grid">
            {topRated.products.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard product={p} /></Reveal>)}
          </div>
        ) : <SkeletonGrid count={4} />}
      </section>

      <section className="section">
        <SectionHeader
          title="Just for you"
          icon={<BadgePercent size={22} />}
          action={<Link to="/shop" className="link-arrow">Browse everything <ArrowRight size={16} /></Link>}
        />
        {forYou.products ? (
          <div className="product-grid" data-testid="product-grid">
            {forYou.products.map((p, i) => <Reveal key={p.id} delay={(i % 5) * 50}><ProductCard product={p} /></Reveal>)}
          </div>
        ) : <SkeletonGrid count={10} />}
      </section>
    </div>
  );
}
