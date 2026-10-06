// Demo data. Run `npm run seed` to wipe the database and reload it.
// Orders are created through the real services, so every listener (stock, points, emails) runs.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { registerListeners } from '../app.js';
import { config } from '../core/config.js';
import { register } from '../modules/auth/auth.service.js';
import { addItem, applyCoupon } from '../modules/cart/cart.service.js';
import { createProduct } from '../modules/catalog/catalog.service.js';
import { placeOrder } from '../modules/checkout/checkout.service.js';
import { createCoupon, setCouponActive } from '../modules/coupons/coupons.service.js';
import { changeStatus } from '../modules/orders/orders.service.js';
import { createReview } from '../modules/reviews/reviews.service.js';
import { ROLES, insertUser } from '../modules/users/users.repository.js';
import { openDatabase } from './connection.js';

export const DEMO_CARD = { method: 'CARD', cardNumber: '4242424242424242', expiry: '12/30', cvc: '123' };
export const DEMO_BKASH = { method: 'BKASH', walletNumber: '01712345678', otp: '123456' };
export const DEMO_ADDRESS = {
  fullName: 'Demo Customer',
  phone: '01712345678',
  line1: 'House 12, Road 5, Dhanmondi',
  city: 'Dhaka',
  postalCode: '1205',
};

// [name, category, price, originalPrice|null, stock, image, description]
const PRODUCTS = [
  // Women's Fashion
  ['Dhakai Jamdani Saree', "Women's Fashion", 8500, 9500, 12, '🥻', 'Handwoven muslin Jamdani from Rupganj artisans, with traditional motifs and a soft drape.'],
  ['Tangail Cotton Saree', "Women's Fashion", 2450, 2800, 30, '🥻', 'Breathable everyday cotton saree woven in Tangail, perfect for the summer heat.'],
  ['Rajshahi Silk Saree', "Women's Fashion", 6200, null, 8, '🥻', 'Pure Rajshahi silk with a rich sheen and contrast border.'],
  ['Cotton Three-Piece Set', "Women's Fashion", 1850, 2200, 40, '👗', 'Unstitched salwar kameez set with printed dupatta. Lawn cotton.'],
  ['Embroidered Kurti', "Women's Fashion", 1150, null, 55, '👚', 'Hand-embroidered neckline on soft viscose. Sizes S–XXL.'],
  ['Georgette Hijab Scarf', "Women's Fashion", 450, 550, 120, '🧣', 'Lightweight, non-slip georgette in 12 colours.'],
  // Men's Fashion
  ['Eid Special Cotton Panjabi', "Men's Fashion", 2200, 2600, 45, '👔', 'Premium cotton panjabi with fine collar embroidery. A festive favourite.'],
  ['Embroidered Silk Panjabi', "Men's Fashion", 3800, null, 15, '👔', 'Half-silk panjabi with zari work for weddings and Eid.'],
  ['Checked Cotton Lungi', "Men's Fashion", 650, null, 80, '🧵', 'Soft, colour-fast lungi from Pabna weavers.'],
  ['Formal Cotton Shirt', "Men's Fashion", 1450, 1650, 35, '👕', 'Slim-fit office shirt, wrinkle-resistant cotton blend.'],
  ['Genuine Leather Sandals', "Men's Fashion", 1350, null, 25, '🩴', 'Made with Bangladeshi cow leather. Cushioned sole.'],
  ['Leather Wallet', "Men's Fashion", 890, null, 60, '👛', 'Slim bi-fold wallet with 6 card slots.'],
  // Electronics
  ['Smartphone 6.5" 128GB', 'Electronics', 18999, 21999, 20, '📱', '6.5-inch display, 128 GB storage, 5000 mAh battery, dual SIM.'],
  ['Wireless Earbuds', 'Electronics', 2499, 3200, 40, '🎧', 'Bluetooth 5.3, 30-hour battery with case, low-latency gaming mode.'],
  ['10000mAh Power Bank', 'Electronics', 1450, null, 70, '🔋', 'Fast charging power bank with two USB ports.'],
  ['Smart LED TV 43"', 'Electronics', 38500, 42000, 5, '📺', 'Full HD smart TV with built-in apps and YouTube.'],
  ['Rechargeable Table Fan', 'Electronics', 3250, null, 18, '🌀', 'Runs up to 8 hours during load-shedding. LED light included.'],
  ['Mini UPS for Router', 'Electronics', 1890, null, 30, '🔌', 'Keeps your Wi-Fi router running for 4+ hours during power cuts.'],
  ['Smart Watch', 'Electronics', 2999, 3999, 25, '⌚', 'Heart rate, SpO2, step counter and call alerts.'],
  ['Electric Kettle 1.8L', 'Electronics', 1590, null, 22, '🫖', 'Stainless steel kettle with auto shut-off.'],
  // Home & Living
  ['Nakshi Kantha Bedspread', 'Home & Living', 4500, 5200, 10, '🛏️', 'Hand-stitched Nakshi Kantha from Jamalpur. Each piece is unique.'],
  ['Jute Floor Mat', 'Home & Living', 1250, null, 30, '🧶', 'Eco-friendly golden jute mat, 4 × 6 ft.'],
  ['Clay Pottery Set', 'Home & Living', 950, null, 20, '🏺', 'Set of 4 handmade terracotta pots and bowls.'],
  ['Non-stick Frying Pan', 'Home & Living', 1350, null, 40, '🍳', '26 cm pan with a granite non-stick coating.'],
  ['Steel Tiffin Carrier', 'Home & Living', 780, null, 50, '🍱', '3-layer stainless steel tiffin box.'],
  ['Mosquito Net (Double Bed)', 'Home & Living', 690, null, 60, '🦟', 'Fine mesh, durable polyester net for a double bed.'],
  ['Pressure Cooker 5L', 'Home & Living', 2650, null, 15, '🍲', 'Aluminium pressure cooker with safety valve.'],
  // Groceries
  ['Chinigura Aromatic Rice 5kg', 'Groceries', 850, null, 100, '🍚', 'Fragrant small-grain rice, ideal for polao and biryani.'],
  ['Miniket Rice 25kg', 'Groceries', 1950, null, 40, '🌾', 'Everyday premium Miniket rice, 25 kg sack.'],
  ['Pure Mustard Oil 1L', 'Groceries', 320, null, 150, '🫗', 'Cold-pressed (ghani) mustard oil with a strong aroma.'],
  ['Sylhet Premium Black Tea 500g', 'Groceries', 390, 450, 200, '🍵', 'Strong, bright tea from the gardens of Sreemangal.'],
  ['Sundarbans Raw Honey 500g', 'Groceries', 750, null, 45, '🍯', 'Raw mangrove honey collected by Mawali honey hunters.'],
  ['Red Lentils (Masoor Dal) 1kg', 'Groceries', 145, null, 300, '🫘', 'Cleaned, sorted deshi masoor dal.'],
  ['Pure Cow Ghee 400g', 'Groceries', 690, null, 35, '🧈', 'Traditional ghee from Sirajganj dairy farms.'],
  ['Padma Hilsa Fish 1kg', 'Groceries', 1650, null, 6, '🐟', 'Fresh Padma ilish, cleaned and cut on request.'],
  // Beauty & Care
  ['Pure Coconut Oil 200ml', 'Beauty & Care', 185, null, 150, '🥥', 'Cold-pressed coconut oil for hair and skin.'],
  ['Natural Mehedi Cone Pack', 'Beauty & Care', 120, null, 200, '🌿', 'Pack of 6 natural henna cones, no chemicals.'],
  ['Herbal Face Wash', 'Beauty & Care', 295, null, 90, '🧴', 'Neem and turmeric face wash for oily skin.'],
  ['Attar Non-alcoholic Perfume', 'Beauty & Care', 550, null, 40, '🌸', 'Long-lasting oud and rose attar, 6 ml.'],
  ['Herbal Neem Toothpaste', 'Beauty & Care', 95, null, 0, '🪥', 'Neem and clove toothpaste, 150 g.'],
  ['Glycerin Soap Pack', 'Beauty & Care', 240, null, 80, '🧼', 'Pack of 4 transparent glycerin soaps.'],
  // Books & Stationery
  ['Bangla Classic Novels Box Set', 'Books & Stationery', 1800, 2100, 15, '📚', 'Ten timeless Bangla novels in a collectible box.'],
  ["Children's Bangla Rhymes Book", 'Books & Stationery', 250, null, 60, '📖', 'Illustrated chhora (rhymes) for young readers.'],
  ['Premium Fountain Pen', 'Books & Stationery', 650, null, 3, '🖋️', 'Smooth-flowing fountain pen with converter.'],
  ['Spiral Notebook Pack (5)', 'Books & Stationery', 225, null, 200, '📓', 'Five 120-page ruled notebooks.'],
  ['SSC Math Practice Book', 'Books & Stationery', 380, null, 70, '📘', 'Chapter-wise practice with solved board questions.'],
  // Sports & Outdoors
  ['English Willow Cricket Bat', 'Sports & Outdoors', 4200, 4800, 12, '🏏', 'Grade 3 English willow, full size. Ready to play.'],
  ['Tape Tennis Ball (6 pcs)', 'Sports & Outdoors', 300, null, 100, '⚾', 'Heavy tennis balls for street and tape-ball cricket.'],
  ['Football Size 5', 'Sports & Outdoors', 1100, null, 30, '⚽', 'Hand-stitched match football.'],
  ['Badminton Racket Pair', 'Sports & Outdoors', 1650, null, 4, '🏸', 'Two lightweight rackets with 3 shuttlecocks.'],
  ['Carrom Board', 'Sports & Outdoors', 2800, null, 10, '🎯', 'Full-size 32-inch carrom with coins and striker.'],
  ['Yoga Mat', 'Sports & Outdoors', 900, null, 25, '🧘', '6 mm anti-slip TPE mat with carry strap.'],
  // Handicrafts
  ['Rickshaw Art Wall Plate', 'Handicrafts', 650, null, 30, '🛺', 'Hand-painted tin plate in classic Dhaka rickshaw art style.'],
  ['Bamboo Craft Basket', 'Handicrafts', 480, null, 40, '🧺', 'Woven bamboo basket from Sylhet artisans.'],
  ['Terracotta Wall Hanging', 'Handicrafts', 1150, null, 15, '🖼️', 'Terracotta panel inspired by Kantajew Temple.'],
  ['Shital Pati Mat', 'Handicrafts', 1850, null, 8, '🎋', 'Cool mat woven from murta cane, a Sylheti tradition.'],
  ['Brass Nouka Showpiece', 'Handicrafts', 2350, null, 6, '⛵', 'Hand-cast brass boat from Dhamrai metal artisans.'],
  // Sweets & Snacks
  ['Bogura Mishti Doi 1kg', 'Sweets & Snacks', 380, null, 25, '🍮', 'Famous sweet yoghurt of Bogura in a clay pot.'],
  ['Rosogolla 1kg', 'Sweets & Snacks', 450, null, 30, '🍡', 'Soft, spongy rosogolla in light syrup.'],
  ['Porabari Chomchom 1kg', 'Sweets & Snacks', 520, 600, 20, '🍬', 'The legendary chomchom of Tangail.'],
  ['Natore Kacha Golla 500g', 'Sweets & Snacks', 600, null, 0, '🍥', 'Delicate milk sweet from Natore.'],
  ['Spicy Chanachur 500g', 'Sweets & Snacks', 160, null, 150, '🥜', 'Crunchy, spicy chanachur mix. The perfect adda snack.'],
  ['Khejur Gur 1kg', 'Sweets & Snacks', 480, 550, 20, '🍯', 'Winter date palm jaggery from Jashore.'],
  // Kids & Toys
  ['Remote Control Car', 'Kids & Toys', 1850, 2300, 18, '🚗', 'Rechargeable RC car with 2.4 GHz remote.'],
  ['Bangladesh Map Wooden Puzzle', 'Kids & Toys', 450, null, 35, '🧩', 'Learn all 8 divisions while you play.'],
  ['Large Teddy Bear', 'Kids & Toys', 1200, null, 22, '🧸', '3-ft soft teddy bear, a perfect gift.'],
  ['Kids School Bag', 'Kids & Toys', 950, null, 40, '🎒', 'Lightweight, water-resistant bag with cartoon print.'],
  ['Colouring Kit', 'Kids & Toys', 350, null, 60, '🖍️', 'Crayons, sketch pens and a colouring book.'],
  // --- Extended catalogue ---
  ['Katan Banarasi Saree', "Women's Fashion", 12500, 14000, 6, '🥻', 'Mirpur Katan with rich zari work, a bridal favourite.'],
  ['Printed Lawn Kurti Set', "Women's Fashion", 1450, 1750, 45, '👗', 'Two-piece printed lawn set, breathable for summer.'],
  ['Embroidered Abaya', "Women's Fashion", 2800, null, 20, '🧕', 'Flowing nida fabric with delicate sleeve embroidery.'],
  ['Ladies Leather Handbag', "Women's Fashion", 2350, 2900, 18, '👜', 'Genuine leather tote with zip pocket.'],
  ['Oxidised Jhumka Earrings', "Women's Fashion", 350, null, 90, '💍', 'Traditional oxidised silver-tone jhumka.'],
  ['Glass Churi Set (24 pcs)', "Women's Fashion", 220, null, 150, '💫', 'Colourful glass bangles for Eid and Boishakh.'],
  ['Cotton Fatua', "Men's Fashion", 850, null, 50, '👕', 'Short handloom fatua, perfect for casual days.'],
  ['Slim Fit Denim Jeans', "Men's Fashion", 1650, 1950, 40, '👖', 'Stretch denim made in Bangladeshi garment factories.'],
  ['Polo T-Shirt', "Men's Fashion", 690, null, 70, '👕', 'Pique cotton polo in 8 colours.'],
  ['Leather Formal Shoes', "Men's Fashion", 3200, 3800, 14, '👞', 'Hand-lasted leather oxfords from Hazaribagh craftsmen.'],
  ['Prayer Cap (Tupi)', "Men's Fashion", 180, null, 200, '🧢', 'Breathable knitted cotton tupi.'],
  ['Analog Wrist Watch', "Men's Fashion", 1990, null, 22, '⌚', 'Stainless steel case with leather strap.'],
  ['Bluetooth Speaker', 'Electronics', 1750, 2200, 30, '🔊', 'Portable speaker with deep bass and 12-hour battery.'],
  ['32GB USB Flash Drive', 'Electronics', 450, null, 120, '💾', 'USB 3.0 metal flash drive.'],
  ['Gaming Mouse', 'Electronics', 1190, null, 35, '🖱️', 'RGB gaming mouse with 6 programmable buttons.'],
  ['Mechanical Keyboard', 'Electronics', 3450, 3990, 12, '⌨️', 'Blue switches with Bangla-English keycaps.'],
  ['24" IPS Monitor', 'Electronics', 14500, null, 7, '🖥️', 'Full HD IPS panel, 75 Hz, slim bezels.'],
  ['Dual Band Wi-Fi Router', 'Electronics', 2650, null, 20, '📡', 'Gigabit router with 4 antennas for flats.'],
  ['25W Fast Charger', 'Electronics', 890, null, 80, '🔌', 'USB-C PD fast charger with cable.'],
  ['Melamine Dinner Set (32 pcs)', 'Home & Living', 3200, 3600, 12, '🍽️', 'Floral melamine set for family dinners.'],
  ['Cotton Bedsheet Set', 'Home & Living', 1650, null, 30, '🛏️', 'King-size bedsheet with 2 pillow covers.'],
  ['Blackout Curtains (Pair)', 'Home & Living', 1890, null, 16, '🪟', 'Thermal curtains that keep rooms cool.'],
  ['Wall Clock', 'Home & Living', 950, null, 25, '🕰️', 'Silent-sweep 12-inch wall clock.'],
  ['Storage Box Set', 'Home & Living', 780, null, 40, '📦', 'Set of 3 stackable storage boxes.'],
  ['Rice Cooker 1.8L', 'Home Appliances', 2450, null, 20, '🍚', 'Automatic rice cooker with keep-warm mode.'],
  ['3-Jar Blender', 'Home Appliances', 3350, 3990, 15, '🥤', '750 W blender for masala, juice and chutney.'],
  ['Steam Iron', 'Home Appliances', 1550, null, 25, '♨️', 'Non-stick soleplate with steam burst.'],
  ['Microwave Oven 20L', 'Home Appliances', 9800, 11500, 6, '⏲️', 'Solo microwave with 5 power levels.'],
  ['Refrigerator 252L', 'Home Appliances', 42500, 46000, 3, '🧊', 'Frost-free double door fridge, inverter compressor.'],
  ['Ceiling Fan 56"', 'Home Appliances', 3900, null, 18, '🌀', 'Energy-saving ceiling fan with 5-year warranty.'],
  ['Air Cooler', 'Home Appliances', 8900, null, 9, '❄️', '40 L air cooler for the summer heat.'],
  ['Double Burner Gas Stove', 'Home Appliances', 4200, 4800, 14, '🔥', 'Toughened glass top, auto ignition.'],
  ['Whole Wheat Atta 2kg', 'Groceries', 150, null, 200, '🌾', 'Stone-ground whole wheat flour for ruti.'],
  ['Sugar 1kg', 'Groceries', 135, null, 250, '🧂', 'Refined white sugar.'],
  ['Soybean Oil 5L', 'Groceries', 820, null, 80, '🛢️', 'Fortified soybean oil for everyday cooking.'],
  ['Turmeric Powder 200g', 'Groceries', 130, null, 150, '🫚', 'Pure holud powder, no added colour.'],
  ['Red Chilli Powder 200g', 'Groceries', 140, null, 150, '🌶️', 'Hot morich powder from Bogura chillies.'],
  ['Basmati Rice 5kg', 'Groceries', 1250, 1400, 40, '🍚', 'Long-grain aged basmati rice.'],
  ['Deshi Eggs (12 pcs)', 'Groceries', 165, null, 100, '🥚', 'Free-range deshi murgir dim.'],
  ['Rajshahi Mangoes 5kg', 'Groceries', 900, 1100, 25, '🥭', 'Sweet Himsagar mangoes, picked fresh in season.'],
  ['Puffed Rice (Muri) 1kg', 'Groceries', 120, null, 150, '🍘', 'Crispy muri for jhal muri and iftar.'],
  ['Rose Water Toner', 'Beauty & Care', 260, null, 80, '🌹', 'Pure golap jol toner for fresh skin.'],
  ['Kajal Eyeliner', 'Beauty & Care', 180, null, 120, '👁️', 'Smudge-proof long-lasting kajal.'],
  ['Sunscreen SPF 50', 'Beauty & Care', 650, 790, 50, '☀️', 'Lightweight sunscreen for humid weather.'],
  ['Herbal Hair Oil', 'Beauty & Care', 320, null, 90, '🫙', 'Amla and bhringraj hair oil.'],
  ['Matte Lipstick', 'Beauty & Care', 450, null, 70, '💄', 'Long-wear matte lipstick in 10 shades.'],
  ['HSC Physics Guide', 'Books & Stationery', 520, null, 50, '📗', 'Board-question solutions for HSC physics.'],
  ['Bangla-English Dictionary', 'Books & Stationery', 680, null, 35, '📕', 'Comprehensive bilingual dictionary.'],
  ['Geometry Box', 'Books & Stationery', 210, null, 120, '✏️', 'Compass, protractor and set squares.'],
  ['Watercolour Paint Set', 'Books & Stationery', 490, null, 40, '🎨', '24 colours with brushes.'],
  ['Desk Diary 2027', 'Books & Stationery', 350, 400, 60, '📔', 'Hardbound diary with Bangla and English calendar.'],
  ['Cricket Helmet', 'Sports & Outdoors', 2650, null, 8, '⛑️', 'Steel grille helmet, adjustable fit.'],
  ['Mountain Bicycle 26"', 'Sports & Outdoors', 14500, 16000, 5, '🚲', '21-speed bicycle with disc brakes.'],
  ['Skipping Rope', 'Sports & Outdoors', 250, null, 80, '🪢', 'Adjustable speed rope with foam handles.'],
  ['Table Tennis Set', 'Sports & Outdoors', 1350, null, 15, '🏓', 'Two bats, three balls and a net.'],
  ['Ludo & Snakes Board', 'Sports & Outdoors', 280, null, 60, '🎲', 'Classic family board game.'],
  ['Jute Shopping Bag', 'Handicrafts', 350, null, 100, '👜', 'Eco-friendly golden fibre bag.'],
  ['Hand-painted Hurricane Lamp', 'Handicrafts', 1250, null, 10, '🏮', 'Vintage hurricane lamp with folk-art painting.'],
  ['Coconut Shell Bowl Set', 'Handicrafts', 420, null, 30, '🥥', 'Polished coconut shell bowls, set of 4.'],
  ['Dokra Brass Figurine', 'Handicrafts', 1750, null, 7, '🗿', 'Lost-wax cast brass figurine.'],
  ['Wooden Pitha Mould', 'Handicrafts', 380, null, 25, '🪵', 'Carved mould for nakshi pitha in winter.'],
  ['Muktagachar Monda 500g', 'Sweets & Snacks', 420, null, 25, '🍪', 'The famous monda of Muktagacha, Mymensingh.'],
  ['Kalojam 1kg', 'Sweets & Snacks', 480, null, 30, '🍫', 'Dark, syrupy kalojam mishti.'],
  ['Bakarkhani 500g', 'Sweets & Snacks', 220, null, 60, '🥨', 'Old Dhaka style flaky bakarkhani.'],
  ['Nimki & Khurma Combo', 'Sweets & Snacks', 260, null, 70, '🥠', 'Crunchy nimki with sweet khurma.'],
  ['Patali Gur 1kg', 'Sweets & Snacks', 520, null, 0, '🍯', 'Seasonal date palm jaggery cakes.'],
  ['Building Blocks (100 pcs)', 'Kids & Toys', 890, 1100, 30, '🧱', 'Colourful interlocking blocks.'],
  ['Kids Bicycle 16"', 'Kids & Toys', 6500, null, 6, '🚲', 'Bicycle with training wheels for ages 4–7.'],
  ['Doll House Set', 'Kids & Toys', 1650, null, 12, '🏠', 'Two-storey doll house with furniture.'],
  ['Speed Cube 3x3', 'Kids & Toys', 350, null, 50, '🧊', 'Smooth-turning puzzle cube.'],
  ['Kite & Lattai Set', 'Kids & Toys', 180, null, 80, '🪁', 'Paper ghuri with lattai and string for Shakrain.'],
  ['Digital Thermometer', 'Health & Wellness', 290, null, 60, '🌡️', 'Fast 10-second reading with fever alarm.'],
  ['Blood Pressure Monitor', 'Health & Wellness', 2650, 2990, 15, '🩺', 'Automatic upper-arm BP machine.'],
  ['Face Mask Box (50 pcs)', 'Health & Wellness', 250, null, 200, '😷', '3-ply disposable face masks.'],
  ['First Aid Kit', 'Health & Wellness', 650, null, 30, '🩹', 'Home first aid kit with 40 items.'],
  ['Hand Sanitizer 500ml', 'Health & Wellness', 220, null, 120, '🧴', '70% alcohol hand rub.'],
  ['Pulse Oximeter', 'Health & Wellness', 1450, null, 4, '🫀', 'Fingertip SpO2 and pulse monitor.'],
  ['Herbal Tulsi Tea', 'Health & Wellness', 280, null, 50, '🍃', 'Caffeine-free tulsi infusion.'],
  ['Kalojira Oil 100ml', 'Health & Wellness', 350, null, 60, '🫒', 'Cold-pressed black seed oil.'],
];

function buy(user, lines, { coupon, payment = DEMO_CARD } = {}) {
  for (const [productId, quantity] of lines) addItem(user.id, productId, quantity);
  if (coupon) applyCoupon(user.id, coupon);
  return placeOrder(user.id, { shippingAddress: { ...DEMO_ADDRESS, fullName: user.name }, payment });
}

function deliver(orderId, admin) {
  changeStatus(orderId, 'SHIPPED', admin);
  changeStatus(orderId, 'DELIVERED', admin);
}

export function seed() {
  registerListeners();

  const adminId = insertUser({
    name: 'Store Admin',
    email: 'admin@shoplite.test',
    passwordHash: bcrypt.hashSync('Admin@123', config.bcryptRounds),
    role: ROLES.ADMIN,
  });
  const admin = { id: adminId };
  const alice = register({ name: 'Alice Rahman', email: 'alice@shoplite.test', password: 'Alice@123' }).user;
  const bob = register({ name: 'Bob Chowdhury', email: 'bob@shoplite.test', password: 'Bob@1234' }).user;

  const ids = {};
  for (const [name, category, price, originalPrice, stock, image, description] of PRODUCTS) {
    ids[name] = createProduct({ name, category, price, originalPrice, stock, image, description }).id;
  }
  const id = (name) => {
    if (!ids[name]) throw new Error(`Unknown seed product: ${name}`);
    return ids[name];
  };

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  createCoupon({ code: 'WELCOME10', type: 'PERCENT', value: 10 });
  createCoupon({ code: 'SAVE100', type: 'FIXED', value: 100, minSubtotal: 1000 });
  createCoupon({ code: 'BOISHAKH15', type: 'PERCENT', value: 15, minSubtotal: 2000 });
  createCoupon({ code: 'BIG20', type: 'PERCENT', value: 20, minSubtotal: 10000, usageLimit: 100 });
  createCoupon({ code: 'EXPIRED15', type: 'PERCENT', value: 15, expiresAt: yesterday });
  createCoupon({ code: 'ONETIME', type: 'FIXED', value: 500, usageLimit: 1 });
  const retired = createCoupon({ code: 'RETIRED50', type: 'PERCENT', value: 50 });
  setCouponActive(retired.id, false);

  // Bob: delivered order (can review), reviews the panjabi
  const o1 = buy(bob, [[id('Eid Special Cotton Panjabi'), 1], [id('Pure Mustard Oil 1L'), 2]], { coupon: 'SAVE100' });
  deliver(o1.id, admin);
  createReview(bob.id, id('Eid Special Cotton Panjabi'), { rating: 5, comment: 'Perfect fit and the embroidery is beautiful. Wore it on Eid!' });

  // Bob: paid order that can still be cancelled
  buy(bob, [[id('Spiral Notebook Pack (5)'), 3]], { payment: DEMO_BKASH });

  // Alice: shipped order with a percentage coupon
  const o3 = buy(alice, [[id('Wireless Earbuds'), 1]], { coupon: 'WELCOME10' });
  changeStatus(o3.id, 'SHIPPED', admin);

  // Alice: cancelled order (refunded + restocked)
  const o4 = buy(alice, [[id('Football Size 5'), 1]]);
  changeStatus(o4.id, 'CANCELLED', admin);

  // Bob: delivered and then refunded (points reversed)
  const o5 = buy(bob, [[id('Kids School Bag'), 1]]);
  deliver(o5.id, admin);
  changeStatus(o5.id, 'REFUNDED', admin);

  // Other shoppers who bought and reviewed products (gives the catalog ratings and best sellers)
  const shoppers = [
    ['Rahim Uddin', 'rahim', [
      ['Dhakai Jamdani Saree', 1, 5, 'অসাধারণ! Bought it for my mother and she loved the weaving.'],
      ['Sylhet Premium Black Tea 500g', 2, 5, 'Strong liquor, great with milk. Will order again.'],
      ['English Willow Cricket Bat', 1, 4, 'Good ping off the middle. Needed a little knocking-in.'],
      ['Rechargeable Table Fan', 1, 5, 'Lifesaver during load-shedding. Battery easily lasts 6 hours.'],
    ]],
    ['Nusrat Jahan', 'nusrat', [
      ['Dhakai Jamdani Saree', 1, 4, 'Beautiful saree. Colour is slightly darker than the photo.'],
      ['Sundarbans Raw Honey 500g', 1, 5, 'Real Sundarbans honey, you can taste the difference.'],
      ['Smartphone 6.5" 128GB', 1, 4, 'Great battery life for the price. Camera is average in low light.'],
      ['Bogura Mishti Doi 1kg', 2, 5, 'Just like the doi from Bogura. Delivered chilled!'],
    ]],
    ['Tanvir Hasan', 'tanvir', [
      ['Smartphone 6.5" 128GB', 1, 5, 'Fast delivery and genuine product. Very happy.'],
      ['Wireless Earbuds', 1, 4, 'Good bass, fits well. Case feels a bit cheap.'],
      ['10000mAh Power Bank', 2, 5, 'Charges my phone 2.5 times. Recommended.'],
      ['Mini UPS for Router', 1, 5, 'No more Wi-Fi drops during power cuts. Must-have in Dhaka.'],
    ]],
    ['Farzana Akter', 'farzana', [
      ['Nakshi Kantha Bedspread', 1, 5, 'The stitching is so detailed. A true piece of art.'],
      ['Chinigura Aromatic Rice 5kg', 2, 4, 'Very fragrant. Made perfect polao.'],
      ['Rickshaw Art Wall Plate', 2, 5, 'So colourful! Gifted one to a friend abroad.'],
      ['Large Teddy Bear', 1, 4, 'My daughter loves it. Slightly smaller than expected.'],
      ['Sylhet Premium Black Tea 500g', 1, 4, 'Nice tea, good value.'],
    ]],
  ];
  for (const [name, handle, purchases] of shoppers) {
    const user = register({ name, email: `${handle}@shoplite.test`, password: 'Shopper@123' }).user;
    const order = buy(user, purchases.map(([product, qty]) => [id(product), qty]), { payment: DEMO_BKASH });
    deliver(order.id, admin);
    for (const [product, , rating, comment] of purchases) createReview(user.id, id(product), { rating, comment });
  }

  // Alice: something waiting in the cart
  addItem(alice.id, id('Red Lentils (Masoor Dal) 1kg'), 3);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(config.dbPath + suffix, { force: true });
  openDatabase();
  seed();
  console.log(`Seeded ${config.dbPath}`);
  console.log('Logins: admin@shoplite.test / Admin@123, alice@shoplite.test / Alice@123, bob@shoplite.test / Bob@1234');
}
