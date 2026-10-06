import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode, Navigation } from 'swiper/modules';
import ProductCard from './ProductCard.jsx';
import { SkeletonGrid } from './ui.jsx';

export default function ProductCarousel({ products, autoplay = false, testId }) {
  if (!products) return <SkeletonGrid count={5} />;
  if (products.length === 0) return <p className="muted">Nothing here yet.</p>;
  return (
    <div className="carousel" data-testid={testId}>
      <Swiper
        modules={[Navigation, FreeMode, Autoplay]}
        navigation
        freeMode
        spaceBetween={16}
        slidesPerView={1.6}
        breakpoints={{ 560: { slidesPerView: 2.4 }, 820: { slidesPerView: 3.4 }, 1100: { slidesPerView: 5 } }}
        autoplay={autoplay ? { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
      >
        {products.map((p) => (
          <SwiperSlide key={p.id}><ProductCard product={p} /></SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
