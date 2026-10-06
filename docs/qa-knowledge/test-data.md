# Test Data

Reset with `npm run seed`. The database is re-created with the data below. All money is in
**Bangladeshi Taka (BDT, ৳)**, whole Taka only.

## Accounts
| Role | Email | Password | State after seeding |
|------|-------|----------|---------------------|
| Admin | admin@shoplite.test | Admin@123 | n/a |
| Customer | alice@shoplite.test | Alice@123 | 1 shipped order (Earbuds, WELCOME10), 1 cancelled order (Football), 3 × Red Lentils in cart, 0 points |
| Customer | bob@shoplite.test | Bob@1234 | 1 delivered order (Panjabi + 2 Mustard Oil, SAVE100), 1 paid order (Notebooks, bKash), 1 refunded order (School Bag), has reviewed the Panjabi, 27 points |
| Customer | rahim@ / nusrat@ / tanvir@ / farzana@shoplite.test | Shopper@123 | One delivered order each (paid by bKash) and several reviews |

## Payments (mock gateway)
| Method | Input | Result |
|--------|-------|--------|
| Card | 4242 4242 4242 4242, expiry 12/30, CVC 123 | Approved |
| Card | any 16 digits ending `0002`, e.g. 4000 0000 0000 0002 | Declined (HTTP 402) |
| Card | expiry in the past, e.g. `01/20` | "Card has expired" |
| bKash | any valid number `01[3-9]XXXXXXXX` + code `123456` | Approved |
| bKash | number ending `000`, e.g. 01712345000 | "Insufficient bKash balance" (HTTP 402) |
| bKash | wrong code, e.g. `000000` | "Incorrect bKash verification code" (HTTP 400) |
| bKash | `01212345678` (prefix 012 not valid), `0171234567` (10 digits) | Validation error |

## Delivery address
- Mobile number: `01712345678` (11 digits, starts with 013–019)
- Postcode: 4 digits, e.g. `1205` (Dhanmondi), `1212` (Gulshan), `4000` (Chattogram)
- District must be one of: Dhaka, Gazipur, Narayanganj, Chattogram, Cox's Bazar, Cumilla, Sylhet, Moulvibazar, Rajshahi, Bogura, Khulna, Jashore, Barishal, Rangpur, Dinajpur, Mymensingh, Tangail, Faridpur

## Coupons
| Code | Discount | Conditions | Use it to test |
|------|----------|------------|----------------|
| WELCOME10 | 10% | none | Happy path, percent rounding |
| SAVE100 | ৳100 | min. subtotal ৳1,000 | Minimum-order boundary (৳999 / ৳1,000) |
| BOISHAKH15 | 15% | min. subtotal ৳2,000 | Seasonal promo |
| BIG20 | 20% | min. ৳10,000, 100 uses | Large orders |
| EXPIRED15 | 15% | expired yesterday | Expiry |
| ONETIME | ৳500 | usage limit 1 (unused after seeding) | Usage limit; discount capped at subtotal |
| RETIRED50 | 50% | inactive | Inactive coupons |

## Products (147 in 13 categories)
Stock is the value **after** seeding (seed orders have already been placed).

| ID | Product | Category | Price | Original (MRP) | Stock | Notes |
|----|---------|----------|------:|---------------:|------:|-------|
| 1 | Dhakai Jamdani Saree | Women's Fashion | ৳8,500 | ৳9,500 | 10 | 2 reviews |
| 2 | Tangail Cotton Saree | Women's Fashion | ৳2,450 | ৳2,800 | 30 |  |
| 3 | Rajshahi Silk Saree | Women's Fashion | ৳6,200 |  | 8 |  |
| 4 | Cotton Three-Piece Set | Women's Fashion | ৳1,850 | ৳2,200 | 40 |  |
| 5 | Embroidered Kurti | Women's Fashion | ৳1,150 |  | 55 |  |
| 6 | Georgette Hijab Scarf | Women's Fashion | ৳450 | ৳550 | 120 |  |
| 7 | Eid Special Cotton Panjabi | Men's Fashion | ৳2,200 | ৳2,600 | 44 | 1 review |
| 8 | Embroidered Silk Panjabi | Men's Fashion | ৳3,800 |  | 15 |  |
| 9 | Checked Cotton Lungi | Men's Fashion | ৳650 |  | 80 |  |
| 10 | Formal Cotton Shirt | Men's Fashion | ৳1,450 | ৳1,650 | 35 |  |
| 11 | Genuine Leather Sandals | Men's Fashion | ৳1,350 |  | 25 |  |
| 12 | Leather Wallet | Men's Fashion | ৳890 |  | 60 |  |
| 13 | Smartphone 6.5" 128GB | Electronics | ৳18,999 | ৳21,999 | 18 | 2 reviews |
| 14 | Wireless Earbuds | Electronics | ৳2,499 | ৳3,200 | 38 | 1 review |
| 15 | 10000mAh Power Bank | Electronics | ৳1,450 |  | 68 | 1 review |
| 16 | Smart LED TV 43" | Electronics | ৳38,500 | ৳42,000 | 5 | Low stock |
| 17 | Rechargeable Table Fan | Electronics | ৳3,250 |  | 17 | 1 review |
| 18 | Mini UPS for Router | Electronics | ৳1,890 |  | 29 | 1 review |
| 19 | Smart Watch | Electronics | ৳2,999 | ৳3,999 | 25 |  |
| 20 | Electric Kettle 1.8L | Electronics | ৳1,590 |  | 22 |  |
| 21 | Nakshi Kantha Bedspread | Home & Living | ৳4,500 | ৳5,200 | 9 | 1 review |
| 22 | Jute Floor Mat | Home & Living | ৳1,250 |  | 30 |  |
| 23 | Clay Pottery Set | Home & Living | ৳950 |  | 20 |  |
| 24 | Non-stick Frying Pan | Home & Living | ৳1,350 |  | 40 |  |
| 25 | Steel Tiffin Carrier | Home & Living | ৳780 |  | 50 |  |
| 26 | Mosquito Net (Double Bed) | Home & Living | ৳690 |  | 60 |  |
| 27 | Pressure Cooker 5L | Home & Living | ৳2,650 |  | 15 |  |
| 28 | Chinigura Aromatic Rice 5kg | Groceries | ৳850 |  | 98 | 1 review |
| 29 | Miniket Rice 25kg | Groceries | ৳1,950 |  | 40 |  |
| 30 | Pure Mustard Oil 1L | Groceries | ৳320 |  | 148 |  |
| 31 | Sylhet Premium Black Tea 500g | Groceries | ৳390 | ৳450 | 197 | 2 reviews |
| 32 | Sundarbans Raw Honey 500g | Groceries | ৳750 |  | 44 | 1 review |
| 33 | Red Lentils (Masoor Dal) 1kg | Groceries | ৳145 |  | 300 |  |
| 34 | Pure Cow Ghee 400g | Groceries | ৳690 |  | 35 |  |
| 35 | Padma Hilsa Fish 1kg | Groceries | ৳1,650 |  | 6 |  |
| 36 | Pure Coconut Oil 200ml | Beauty & Care | ৳185 |  | 150 |  |
| 37 | Natural Mehedi Cone Pack | Beauty & Care | ৳120 |  | 200 |  |
| 38 | Herbal Face Wash | Beauty & Care | ৳295 |  | 90 |  |
| 39 | Attar Non-alcoholic Perfume | Beauty & Care | ৳550 |  | 40 |  |
| 40 | Herbal Neem Toothpaste | Beauty & Care | ৳95 |  | 0 | **Out of stock** |
| 41 | Glycerin Soap Pack | Beauty & Care | ৳240 |  | 80 |  |
| 42 | Bangla Classic Novels Box Set | Books & Stationery | ৳1,800 | ৳2,100 | 15 |  |
| 43 | Children's Bangla Rhymes Book | Books & Stationery | ৳250 |  | 60 |  |
| 44 | Premium Fountain Pen | Books & Stationery | ৳650 |  | 3 | Low stock |
| 45 | Spiral Notebook Pack (5) | Books & Stationery | ৳225 |  | 197 |  |
| 46 | SSC Math Practice Book | Books & Stationery | ৳380 |  | 70 |  |
| 47 | English Willow Cricket Bat | Sports & Outdoors | ৳4,200 | ৳4,800 | 11 | 1 review |
| 48 | Tape Tennis Ball (6 pcs) | Sports & Outdoors | ৳300 |  | 100 |  |
| 49 | Football Size 5 | Sports & Outdoors | ৳1,100 |  | 30 |  |
| 50 | Badminton Racket Pair | Sports & Outdoors | ৳1,650 |  | 4 | Low stock |
| 51 | Carrom Board | Sports & Outdoors | ৳2,800 |  | 10 |  |
| 52 | Yoga Mat | Sports & Outdoors | ৳900 |  | 25 |  |
| 53 | Rickshaw Art Wall Plate | Handicrafts | ৳650 |  | 28 | 1 review |
| 54 | Bamboo Craft Basket | Handicrafts | ৳480 |  | 40 |  |
| 55 | Terracotta Wall Hanging | Handicrafts | ৳1,150 |  | 15 |  |
| 56 | Shital Pati Mat | Handicrafts | ৳1,850 |  | 8 |  |
| 57 | Brass Nouka Showpiece | Handicrafts | ৳2,350 |  | 6 |  |
| 58 | Bogura Mishti Doi 1kg | Sweets & Snacks | ৳380 |  | 23 | 1 review |
| 59 | Rosogolla 1kg | Sweets & Snacks | ৳450 |  | 30 |  |
| 60 | Porabari Chomchom 1kg | Sweets & Snacks | ৳520 | ৳600 | 20 |  |
| 61 | Natore Kacha Golla 500g | Sweets & Snacks | ৳600 |  | 0 | **Out of stock** |
| 62 | Spicy Chanachur 500g | Sweets & Snacks | ৳160 |  | 150 |  |
| 63 | Khejur Gur 1kg | Sweets & Snacks | ৳480 | ৳550 | 20 |  |
| 64 | Remote Control Car | Kids & Toys | ৳1,850 | ৳2,300 | 18 |  |
| 65 | Bangladesh Map Wooden Puzzle | Kids & Toys | ৳450 |  | 35 |  |
| 66 | Large Teddy Bear | Kids & Toys | ৳1,200 |  | 21 | 1 review |
| 67 | Kids School Bag | Kids & Toys | ৳950 |  | 40 |  |
| 68 | Colouring Kit | Kids & Toys | ৳350 |  | 60 |  |
| 69 | Katan Banarasi Saree | Women's Fashion | ৳12,500 | ৳14,000 | 6 |  |
| 70 | Printed Lawn Kurti Set | Women's Fashion | ৳1,450 | ৳1,750 | 45 |  |
| 71 | Embroidered Abaya | Women's Fashion | ৳2,800 |  | 20 |  |
| 72 | Ladies Leather Handbag | Women's Fashion | ৳2,350 | ৳2,900 | 18 |  |
| 73 | Oxidised Jhumka Earrings | Women's Fashion | ৳350 |  | 90 |  |
| 74 | Glass Churi Set (24 pcs) | Women's Fashion | ৳220 |  | 150 |  |
| 75 | Cotton Fatua | Men's Fashion | ৳850 |  | 50 |  |
| 76 | Slim Fit Denim Jeans | Men's Fashion | ৳1,650 | ৳1,950 | 40 |  |
| 77 | Polo T-Shirt | Men's Fashion | ৳690 |  | 70 |  |
| 78 | Leather Formal Shoes | Men's Fashion | ৳3,200 | ৳3,800 | 14 |  |
| 79 | Prayer Cap (Tupi) | Men's Fashion | ৳180 |  | 200 |  |
| 80 | Analog Wrist Watch | Men's Fashion | ৳1,990 |  | 22 |  |
| 81 | Bluetooth Speaker | Electronics | ৳1,750 | ৳2,200 | 30 |  |
| 82 | 32GB USB Flash Drive | Electronics | ৳450 |  | 120 |  |
| 83 | Gaming Mouse | Electronics | ৳1,190 |  | 35 |  |
| 84 | Mechanical Keyboard | Electronics | ৳3,450 | ৳3,990 | 12 |  |
| 85 | 24" IPS Monitor | Electronics | ৳14,500 |  | 7 |  |
| 86 | Dual Band Wi-Fi Router | Electronics | ৳2,650 |  | 20 |  |
| 87 | 25W Fast Charger | Electronics | ৳890 |  | 80 |  |
| 88 | Melamine Dinner Set (32 pcs) | Home & Living | ৳3,200 | ৳3,600 | 12 |  |
| 89 | Cotton Bedsheet Set | Home & Living | ৳1,650 |  | 30 |  |
| 90 | Blackout Curtains (Pair) | Home & Living | ৳1,890 |  | 16 |  |
| 91 | Wall Clock | Home & Living | ৳950 |  | 25 |  |
| 92 | Storage Box Set | Home & Living | ৳780 |  | 40 |  |
| 93 | Rice Cooker 1.8L | Home Appliances | ৳2,450 |  | 20 |  |
| 94 | 3-Jar Blender | Home Appliances | ৳3,350 | ৳3,990 | 15 |  |
| 95 | Steam Iron | Home Appliances | ৳1,550 |  | 25 |  |
| 96 | Microwave Oven 20L | Home Appliances | ৳9,800 | ৳11,500 | 6 |  |
| 97 | Refrigerator 252L | Home Appliances | ৳42,500 | ৳46,000 | 3 | Low stock |
| 98 | Ceiling Fan 56" | Home Appliances | ৳3,900 |  | 18 |  |
| 99 | Air Cooler | Home Appliances | ৳8,900 |  | 9 |  |
| 100 | Double Burner Gas Stove | Home Appliances | ৳4,200 | ৳4,800 | 14 |  |
| 101 | Whole Wheat Atta 2kg | Groceries | ৳150 |  | 200 |  |
| 102 | Sugar 1kg | Groceries | ৳135 |  | 250 |  |
| 103 | Soybean Oil 5L | Groceries | ৳820 |  | 80 |  |
| 104 | Turmeric Powder 200g | Groceries | ৳130 |  | 150 |  |
| 105 | Red Chilli Powder 200g | Groceries | ৳140 |  | 150 |  |
| 106 | Basmati Rice 5kg | Groceries | ৳1,250 | ৳1,400 | 40 |  |
| 107 | Deshi Eggs (12 pcs) | Groceries | ৳165 |  | 100 |  |
| 108 | Rajshahi Mangoes 5kg | Groceries | ৳900 | ৳1,100 | 25 |  |
| 109 | Puffed Rice (Muri) 1kg | Groceries | ৳120 |  | 150 |  |
| 110 | Rose Water Toner | Beauty & Care | ৳260 |  | 80 |  |
| 111 | Kajal Eyeliner | Beauty & Care | ৳180 |  | 120 |  |
| 112 | Sunscreen SPF 50 | Beauty & Care | ৳650 | ৳790 | 50 |  |
| 113 | Herbal Hair Oil | Beauty & Care | ৳320 |  | 90 |  |
| 114 | Matte Lipstick | Beauty & Care | ৳450 |  | 70 |  |
| 115 | HSC Physics Guide | Books & Stationery | ৳520 |  | 50 |  |
| 116 | Bangla-English Dictionary | Books & Stationery | ৳680 |  | 35 |  |
| 117 | Geometry Box | Books & Stationery | ৳210 |  | 120 |  |
| 118 | Watercolour Paint Set | Books & Stationery | ৳490 |  | 40 |  |
| 119 | Desk Diary 2027 | Books & Stationery | ৳350 | ৳400 | 60 |  |
| 120 | Cricket Helmet | Sports & Outdoors | ৳2,650 |  | 8 |  |
| 121 | Mountain Bicycle 26" | Sports & Outdoors | ৳14,500 | ৳16,000 | 5 | Low stock |
| 122 | Skipping Rope | Sports & Outdoors | ৳250 |  | 80 |  |
| 123 | Table Tennis Set | Sports & Outdoors | ৳1,350 |  | 15 |  |
| 124 | Ludo & Snakes Board | Sports & Outdoors | ৳280 |  | 60 |  |
| 125 | Jute Shopping Bag | Handicrafts | ৳350 |  | 100 |  |
| 126 | Hand-painted Hurricane Lamp | Handicrafts | ৳1,250 |  | 10 |  |
| 127 | Coconut Shell Bowl Set | Handicrafts | ৳420 |  | 30 |  |
| 128 | Dokra Brass Figurine | Handicrafts | ৳1,750 |  | 7 |  |
| 129 | Wooden Pitha Mould | Handicrafts | ৳380 |  | 25 |  |
| 130 | Muktagachar Monda 500g | Sweets & Snacks | ৳420 |  | 25 |  |
| 131 | Kalojam 1kg | Sweets & Snacks | ৳480 |  | 30 |  |
| 132 | Bakarkhani 500g | Sweets & Snacks | ৳220 |  | 60 |  |
| 133 | Nimki & Khurma Combo | Sweets & Snacks | ৳260 |  | 70 |  |
| 134 | Patali Gur 1kg | Sweets & Snacks | ৳520 |  | 0 | **Out of stock** |
| 135 | Building Blocks (100 pcs) | Kids & Toys | ৳890 | ৳1,100 | 30 |  |
| 136 | Kids Bicycle 16" | Kids & Toys | ৳6,500 |  | 6 |  |
| 137 | Doll House Set | Kids & Toys | ৳1,650 |  | 12 |  |
| 138 | Speed Cube 3x3 | Kids & Toys | ৳350 |  | 50 |  |
| 139 | Kite & Lattai Set | Kids & Toys | ৳180 |  | 80 |  |
| 140 | Digital Thermometer | Health & Wellness | ৳290 |  | 60 |  |
| 141 | Blood Pressure Monitor | Health & Wellness | ৳2,650 | ৳2,990 | 15 |  |
| 142 | Face Mask Box (50 pcs) | Health & Wellness | ৳250 |  | 200 |  |
| 143 | First Aid Kit | Health & Wellness | ৳650 |  | 30 |  |
| 144 | Hand Sanitizer 500ml | Health & Wellness | ৳220 |  | 120 |  |
| 145 | Pulse Oximeter | Health & Wellness | ৳1,450 |  | 4 | Low stock |
| 146 | Herbal Tulsi Tea | Health & Wellness | ৳280 |  | 50 |  |
| 147 | Kalojira Oil 100ml | Health & Wellness | ৳350 |  | 60 |  |

## Useful values for calculations
- **Red Lentils ৳145 × 3 = ৳435**: VAT 21.75 → ৳22 (per-line rounding would give ৳21). Good for rounding tests.
- **Eid Special Cotton Panjabi ৳2,200**: a single item clears SAVE100 and BOISHAKH15 minimums.
- **Smartphone ৳18,999**: 189 loyalty points; with BIG20 → discount ৳3,800.
- **Dhakai Jamdani Saree ৳8,500 (MRP ৳9,500)**: shows −10% (10.5% rounded down).

## Boundary values worth knowing
- Quantity: 0, 1, 10, 11
- Password length: 7, 8, 72, 73
- Rating: 0, 1, 5, 6, 3.5
- Review comment: 500 and 501 characters
- Refund window: delivered 30 days ago vs 31 days ago
- SAVE100 minimum: subtotal ৳999 vs ৳1,000
- Mobile number: 10, 11, 12 digits; prefixes 012 vs 013 vs 019
- Postcode: 3, 4, 5 digits
- Search page size: `limit` 0, 1, 100, 101 (capped at 100)
