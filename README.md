# 🛍️ ShopLite Bangladesh

A realistic Bangladeshi online store (147 deshi products in 13 categories, prices in **Taka ৳**, bKash and card
payments) built for **AI-assisted QA training**. Its 15 server modules
are deliberately tightly connected, so a one-line change in one place can break behaviour
somewhere else. That makes it a good target for practising regression analysis and for
demonstrating an AI agent that turns pull requests into test cases.

## Quick start

Requires **Node.js 22.13 or newer**. It uses the built-in `node:sqlite`, so there are no native builds.

```bash
npm install
npm run seed      # create the database with demo data (also runs automatically on first start)
npm run dev       # API on http://localhost:4000, web app on http://localhost:5173
```

Open http://localhost:5173 and log in with a demo account:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shoplite.test | Admin@123 |
| Customer | alice@shoplite.test | Alice@123 |
| Customer | bob@shoplite.test | Bob@1234 |

Payments are mock only:
- **bKash:** any valid number such as `01712345678`, with verification code `123456`. Numbers ending in `000` have insufficient balance.
- **Card:** `4242 4242 4242 4242` is approved and `4000 0000 0000 0002` is declined. Any future expiry and any 3-digit CVC work.

Delivery addresses need a BD mobile number (`01XXXXXXXXX`), a district and a 4-digit postcode.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | API + web client with live reload |
| `npm start` | Build the client and serve everything from the API on port 4000 |
| `npm run seed` | Wipe and re-create the database with demo data |
| `npm test` | API test suite (node:test + supertest, in-memory DB) |
| `npm run test:e2e` | Playwright browser tests (separate database, port 4100) |
| `npm run depgraph` | Write the module dependency graph to `server/depgraph.json` (used for impact analysis) |

## Features

- **Storefront:** animated hero carousel, category tiles, Flash Sale with countdown, best-seller and
  top-rated carousels, toasts, skeleton loaders, mobile-friendly layout.
- **Live search:** the header shows suggestions while you type, and the shop page re-queries
  the API as you type (debounced, stale requests cancelled), with category, price, stock and sale filters.
- **Customers:** register/login (with lockout), cart with quantity and stock rules, coupons,
  checkout with bKash or card, order tracking and cancellation, loyalty points (1 per ৳100),
  verified-buyer reviews, and an inbox of simulated emails.
- **Money:** whole Taka, 5% VAT, ৳60 flat delivery, Bangladeshi digit grouping (৳1,00,000).
- **Admins:** sales dashboard, order fulfilment (ship, deliver, cancel, refund), product and
  stock management, and coupon management.

## Project layout

```
shoplite/
├── server/                    Express API
│   └── src/
│       ├── core/              config, errors, money, validation, event bus
│       ├── db/                schema, connection, seed
│       ├── middleware/        auth (requireAuth / requireAdmin), error handler
│       └── modules/           15 modules, one folder each
│           ├── pricing/       ← hub: every money calculation
│           ├── inventory/     ← hub: stock
│           ├── orders/        ← hub: status machine + events
│           └── auth, users, catalog, coupons, shipping, cart, checkout,
│               payments, notifications, loyalty, reviews, admin
├── client/                    React (Vite) SPA: Swiper carousels, Lucide icons, data-testid on key elements
├── e2e/                       Playwright tests
├── docs/qa-knowledge/         ★ Domain knowledge for QA and the AI agent
└── .github/pull_request_template.md
```

## For QA and the AI agent

Start with [docs/qa-knowledge/](docs/qa-knowledge/README.md):

- **business-rules.md:** every rule, numbered (`BR-CPN-01` …)
- **module-map.md:** how modules connect (calls, shared tables, events) and the invariants that must always hold
- **user-flows.md:** end-to-end journeys to re-run after changes
- **user-roles.md**, **glossary.md**, **test-data.md**

Every pull request should fill in the template: acceptance criteria, related rule IDs and
modules touched. The AI QA agent combines that with the diff and the knowledge base to produce
test cases, regression scope and security concerns.
