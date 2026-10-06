// Visual identity for each category: icon, tile gradient and accent colour.
export const CATEGORY_META = {
  "Women's Fashion": { icon: '🥻', tile: 'linear-gradient(135deg, #ffe0ec 0%, #ffd1dc 100%)', accent: '#e8456b' },
  "Men's Fashion": { icon: '👔', tile: 'linear-gradient(135deg, #dbeafe 0%, #c7d7fe 100%)', accent: '#3b5bdb' },
  Electronics: { icon: '📱', tile: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', accent: '#6c5ce7' },
  'Home & Living': { icon: '🏠', tile: 'linear-gradient(135deg, #fff1d6 0%, #ffe3b3 100%)', accent: '#e67700' },
  Groceries: { icon: '🛒', tile: 'linear-gradient(135deg, #dcfce7 0%, #c6f6d5 100%)', accent: '#0f9d58' },
  'Beauty & Care': { icon: '💄', tile: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', accent: '#d6336c' },
  'Books & Stationery': { icon: '📚', tile: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', accent: '#0b7285' },
  'Sports & Outdoors': { icon: '🏏', tile: 'linear-gradient(135deg, #d3f9d8 0%, #b2f2bb 100%)', accent: '#2b8a3e' },
  Handicrafts: { icon: '🧺', tile: 'linear-gradient(135deg, #fff4e6 0%, #ffd8a8 100%)', accent: '#c2410c' },
  'Sweets & Snacks': { icon: '🍬', tile: 'linear-gradient(135deg, #fff0f6 0%, #ffdeeb 100%)', accent: '#c2255c' },
  'Kids & Toys': { icon: '🧸', tile: 'linear-gradient(135deg, #fff9db 0%, #ffec99 100%)', accent: '#e8590c' },
  'Home Appliances': { icon: '🧊', tile: 'linear-gradient(135deg, #e3fafc 0%, #c5f6fa 100%)', accent: '#0c8599' },
  'Health & Wellness': { icon: '💊', tile: 'linear-gradient(135deg, #f3f0ff 0%, #e5dbff 100%)', accent: '#7048e8' },
};

const FALLBACK = { icon: '📦', tile: 'linear-gradient(135deg, #f1f3f5 0%, #e9ecef 100%)', accent: '#495057' };

export const metaFor = (category) => CATEGORY_META[category] ?? FALLBACK;

export const HERO_SLIDES = [
  {
    eyebrow: 'Eid Mubarak Collection',
    title: 'Dress up for Eid in deshi style',
    text: 'Up to 25% off Panjabi, Jamdani and Three-Piece sets, handpicked from local weavers.',
    cta: 'Shop fashion',
    to: "/shop?category=Men's Fashion",
    gradient: 'linear-gradient(120deg, #0b6e4f 0%, #12a37a 55%, #6fe3b5 100%)',
    emojis: ['👔', '🥻', '🌙', '✨'],
  },
  {
    eyebrow: 'শুভ নববর্ষ · Boishakhi Utsab',
    title: '15% off orders over ৳2,000',
    text: 'Use code BOISHAKH15 at checkout. Celebrate with hilsa, sweets and red-and-white sarees.',
    cta: 'Grab the deal',
    to: '/shop?onSale=1',
    gradient: 'linear-gradient(120deg, #d6252f 0%, #f45c43 50%, #ffb347 100%)',
    emojis: ['🎉', '🪔', '🐟', '🍬'],
  },
  {
    eyebrow: 'Mega Electronics Week',
    title: 'Beat load-shedding in style',
    text: 'Smartphones, smart TVs, rechargeable fans and mini UPS, at prices that make sense.',
    cta: 'Shop electronics',
    to: '/shop?category=Electronics',
    gradient: 'linear-gradient(120deg, #3a1c71 0%, #5f4bd8 50%, #8fa8ff 100%)',
    emojis: ['📱', '📺', '🔋', '🌀'],
  },
  {
    eyebrow: 'Taste of Bangladesh',
    title: 'From Sylhet, Sundarbans & Bogura',
    text: 'Garden-fresh tea, raw mangrove honey and the famous mishti doi, delivered to your door.',
    cta: 'Shop groceries',
    to: '/shop?category=Groceries',
    gradient: 'linear-gradient(120deg, #b3135f 0%, #e2136e 50%, #ff8fb1 100%)',
    emojis: ['🍵', '🍯', '🍮', '🌾'],
  },
];
