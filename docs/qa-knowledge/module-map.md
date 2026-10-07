# Module Map

ShopLite's modules are connected in three ways. **All three** must be considered when judging
the impact of a change. Code-import analysis alone only finds the first.

1. **Direct calls:** module A imports a function from module B.
2. **Shared data:** module A reads tables that module B writes.
3. **Events:** module A publishes an event and module B reacts to it (in-process event bus,
   same database transaction, so a failing listener rolls back the whole operation).

```
                         ┌──────────────┐
                         │ Auth / Users │  roles used by every protected endpoint
                         └──────┬───────┘
    ┌──────────┐      ┌─────────▼─────────┐      ┌────────────┐
    │ Catalog  │─────▶│  PRICING ENGINE   │◀─────│  Coupons   │
    └────┬─────┘      │  (hub)            │◀─────│  Shipping  │
         ▼            └─────────┬─────────┘      └────────────┘
    ┌──────────┐                ▼
    │INVENTORY │◀──────┐   ┌─────────┐    ┌──────────┐    ┌──────────┐
    │  (hub)   │       └───│  Cart   │───▶│ Checkout │───▶│  ORDERS  │
    └──────────┘           └─────────┘    └────┬─────┘    │  (hub)   │
         ▲                                     ▼          └────┬─────┘
         │                                ┌─────────┐          │ events
         │                                │Payments │          │
         │                                └─────────┘          │
         └────────────── order.cancelled / order.refunded ─────┤
              ┌──────────────┬───────────────┬─────────────────┤
              ▼              ▼               ▼                 ▼
       Notifications      Loyalty         Reviews         Admin Reports
```

## Hubs (highest regression risk)

### Pricing Engine (`modules/pricing`)
- **Calls:** Coupons (`calculateDiscount`), Shipping (`calculateShipping`)
- **Called by:** Cart (displayed totals), Checkout (charged totals)
- **Indirect consumers through stored order totals:** Orders, Payments (charge and refund amount), Loyalty (points base), Notifications (amounts in emails), Admin Reports (revenue, tax, discounts)
- **Invariants:** INV-01, INV-04, INV-06

### Inventory (`modules/inventory`)
- **Called by:** Catalog (stock status), Cart (availability), Checkout (deduct), Admin (set stock, low-stock report)
- **Listens to:** `order.cancelled`, `order.refunded` → restock
- **Invariants:** INV-02

### Orders & order status (`modules/orders`)
- **Statuses:** `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` (also hard-coded in a DB `CHECK` constraint and in report SQL)
- **Calls:** Payments (refund on cancel/refund)
- **Called by:** Checkout (create), Reviews (verified-buyer check), Admin (status changes)
- **Publishes:** one event per status (see table below)
- **Invariants:** INV-03, INV-05, INV-07

## All modules

| Module | Depends on (calls) | Used by | Shared tables read | Events published | Events consumed |
|--------|--------------------|---------|--------------------|------------------|-----------------|
| auth | users | middleware (all protected routes) | users, sessions | `user.registered` | n/a |
| users | n/a | auth, orders, notifications, middleware | users | n/a | n/a |
| catalog | inventory | cart, reviews, admin | **reviews** (rating), **order_items + orders** (sold count, delete guard) | n/a | n/a |
| inventory | n/a | catalog, cart, checkout, admin, reports | order_items (restock) | n/a | `order.cancelled`, `order.refunded` |
| coupons | n/a | pricing, cart, checkout, admin | n/a | n/a | n/a |
| shipping | n/a | pricing | n/a | n/a | n/a |
| pricing | coupons, shipping | cart, checkout | n/a | n/a | n/a |
| cart | catalog, coupons, inventory, pricing | checkout | products, inventory | n/a | n/a |
| payments (card + bKash) | n/a | checkout, orders | n/a | n/a | n/a |
| checkout | cart, coupons, inventory, pricing, payments (incl. BD mobile validation), orders | n/a | n/a | (via orders) `order.paid` | n/a |
| orders | payments, users | checkout, reviews, admin | n/a | `order.*` | n/a |
| loyalty | n/a | notifications (points in email) | **orders** | n/a | `order.delivered`, `order.refunded` |
| notifications | loyalty, users, orders (status list) | n/a | **orders**, users | n/a | `user.registered`, all `order.*` |
| reviews | catalog, orders | n/a | users | n/a | n/a |
| admin (+reports) | catalog, coupons, inventory, orders | n/a | **orders, order_items, users** | n/a | n/a |
| store (`GET /api/store-info`) | shipping, pricing, cart, checkout, loyalty, orders, payments, coupons | storefront header/footer, home, product, cart, checkout, register pages; notifications (welcome email) | coupons | n/a | n/a |

## Event table

| Event | Published when | Listeners (in order) |
|-------|----------------|----------------------|
| `user.registered` | Registration | Notifications (welcome email) |
| `order.paid` | Checkout succeeds | Notifications |
| `order.shipped` | Admin marks shipped | Notifications |
| `order.delivered` | Admin marks delivered | Loyalty (award), Notifications (email mentions points) |
| `order.cancelled` | Customer/admin cancels | Inventory (restock), Notifications |
| `order.refunded` | Admin refunds | Inventory (restock), Loyalty (reverse), Notifications |

Notifications registers a listener for **every** status in `STATUS_EVENT` and expects a template
for each one in `notifications.templates.js`.

## Invariants (must always hold)

- **INV-01, money consistency:** Cart total shown = order total stored = payment amount charged = amount in confirmation email. Same for subtotal, discount, VAT and delivery charge.
- **INV-02, stock conservation:** For every product: initial stock + admin adjustments − units in PAID/SHIPPED/DELIVERED orders = current stock. Stock is never negative.
- **INV-03, loyalty consistency:** A customer's points balance = Σ points of their DELIVERED orders (refunded orders contribute 0).
- **INV-04, report consistency:** Revenue = Σ total of PAID + SHIPPED + DELIVERED orders. Revenue + Refunded = Σ total of all orders.
- **INV-05, one event per change:** Every status change creates exactly one history row and exactly one email.
- **INV-06, coupon accounting:** A coupon's `used_count` = number of orders placed with it (including later-cancelled orders), never more than its usage limit.
- **INV-07, atomic checkout:** Checkout is all-or-nothing. On any failure (stock, coupon, payment) there is no order, no charge, no stock change and no coupon use.
- **INV-08, authorization:** Every `/api/admin/*` endpoint rejects customers (403) and guests (401).
- **INV-09, advertised = charged:** Every store setting shown to shoppers (delivery charge and days, VAT %, max quantity, loyalty rate, refund window, hotline, coupon terms) comes from `GET /api/store-info`, which reads the constants the server enforces. Changing a rule changes every page; no page types these values in. A coupon that is off, expired or used up is not advertised anywhere.
