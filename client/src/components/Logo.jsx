import { useId } from 'react';

// ShopLite brand mark: a shopping bag in Bangladesh flag green with the red sun.
export function LogoMark({ size = 42 }) {
  const gradientId = `logo-bag-${useId().replace(/:/g, '')}`;
  return (
    <svg className="logo-mark-svg" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12b886" />
          <stop offset="1" stopColor="#006a4e" />
        </linearGradient>
      </defs>
      <path d="M17 15v-2a7 7 0 0 1 14 0v2" fill="none" stroke="#006a4e" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 15h30l-2.2 24.4A4 4 0 0 1 32.8 43H15.2a4 4 0 0 1-4-3.6z" fill={`url(#${gradientId})`} />
      <circle cx="22" cy="29" r="7" fill="#f42a41" />
      <path d="M13 19h22" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <>
      <LogoMark />
      <span className={`logo-text ${className}`}>ShopLite<small>Bangladesh</small></span>
    </>
  );
}
