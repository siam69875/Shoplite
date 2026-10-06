# Product Overview

**ShopLite Bangladesh** is an online store for Bangladeshi customers. It sells 147 products in 13
categories, from Dhakai Jamdani and Eid Panjabi to Sylhet tea, Sundarbans honey, electronics,
handicrafts and sweets. All prices are in **Taka (৳)**. Customers browse a catalog, add items to a cart, apply a coupon,
pay with **bKash or card** and track their orders. Delivered orders earn loyalty points, and verified buyers
can review products. Store staff use an admin console to manage orders, products, stock and
coupons and to read sales reports.

No real money moves: payments go through a mock gateway and emails are written to an in-app
inbox.

## Capabilities

| Area | What customers can do | What admins can do |
|------|----------------------|--------------------|
| Account | Register, log in/out, change display name | n/a |
| Catalog | Browse, **live search** (results update while typing, with suggestions in the header), filter by category, price, stock and sale, sort | Create, edit and delete products, set sale (original) prices |
| Inventory | See stock status (In stock / Only N left / Out of stock) | Set stock levels; see low-stock report |
| Cart | Add, update and remove items; apply one coupon | n/a |
| Checkout | Enter a Bangladeshi address (mobile, district, postcode); pay with bKash or card | n/a |
| Orders | View own orders; cancel before shipping | View all orders; ship, deliver, cancel, refund |
| Coupons | Apply a code in the cart | Create, activate and deactivate coupons |
| Loyalty | See balance and history | n/a |
| Reviews | Review products they received | n/a |
| Notifications | Read emails in Account → Inbox | n/a |
| Reports | n/a | Revenue, VAT, discounts, refunds, orders by status, top products, low stock |

## Architecture (for testers)
- **Web client:** React single-page app (`client/`) with carousels (Swiper), animations, toasts and live search. Every key element has a `data-testid`.
- **API:** Express REST API under `/api` (`server/`). JSON in and out, errors as
  `{ "error": { "code", "message" } }`.
- **Database:** SQLite. Money is stored as **whole Taka integers**.
- **Modules:** 15 server modules in `server/src/modules/*`, connected by direct calls, shared
  tables and an in-process **event bus**. See [module-map.md](module-map.md).

## Key numbers
| Setting | Value |
|---------|-------|
| Currency | Bangladeshi Taka (৳), whole Taka |
| VAT | 5% |
| Delivery charge | ৳60 flat per order |
| Max quantity per item | 10 |
| Loyalty | 1 point per ৳100 |
| Payment methods | bKash, card |
| Live search delay | ~300 ms after typing stops (250 ms in header) |
| Refund window | 30 days after delivery |
| Login lockout | 5 failed attempts → 15 minutes |
| Session lifetime | 24 hours |
