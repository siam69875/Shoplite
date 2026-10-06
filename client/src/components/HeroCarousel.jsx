import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { ArrowRight } from 'lucide-react';
import { HERO_SLIDES } from '../catalogMeta.js';

export default function HeroCarousel() {
  return (
    <section className="hero" data-testid="hero-carousel">
      <Swiper
        modules={[Autoplay, EffectFade, Navigation, Pagination]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={800}
        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        navigation
      >
        {HERO_SLIDES.map((slide) => (
          <SwiperSlide key={slide.title}>
            <div className="hero-slide" style={{ background: slide.gradient }}>
              <div className="hero-copy">
                <span className="hero-eyebrow">{slide.eyebrow}</span>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
                <Link to={slide.to} className="btn btn-light">
                  {slide.cta} <ArrowRight size={18} />
                </Link>
              </div>
              <div className="hero-art" aria-hidden="true">
                {slide.emojis.map((emoji, i) => (
                  <span key={emoji} className={`hero-bubble bubble-${i}`}>{emoji}</span>
                ))}
              </div>
              <span className="hero-blob blob-a" />
              <span className="hero-blob blob-b" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
