# Critical User Flows

These end-to-end journeys must keep working after every change. When a PR touches a module on
a flow's path, that flow must be re-tested.

## FLOW-01: Purchase
**Path:** Log in → Live search / browse → Product page → Add to cart → Cart → Apply coupon → Checkout (address + bKash or card) → Order confirmation → "Order confirmed" email
**Modules:** Auth, Catalog, Inventory, Cart, Coupons, Pricing, Shipping, Checkout, Payments, Orders, Notifications
**Must be true at the end:** order is `PAID`, totals equal what the cart showed (INV-01), stock reduced (INV-02), coupon use counted, cart empty, one email.

## FLOW-02: Fulfilment
**Path:** Admin opens Orders → Mark shipped → Mark delivered
**Modules:** Admin, Orders, Notifications, Loyalty
**Must be true at the end:** two emails (shipped, delivered), loyalty points credited (BR-LOY-02), customer can now review the products (BR-REV-01).

## FLOW-03: Customer cancellation
**Path:** Customer opens a `PAID` order → Cancel → Confirm
**Modules:** Orders, Payments, Inventory, Notifications, Reports
**Must be true at the end:** status `CANCELLED`, payment `REFUNDED` for the full amount, stock returned, "cancelled" email, order moves from Revenue to Refunded in reports.

## FLOW-04: Refund after delivery
**Path:** Admin opens a `DELIVERED` order (≤ 30 days) → Refund
**Modules:** Admin, Orders, Payments, Inventory, Loyalty, Notifications, Reports
**Must be true at the end:** status `REFUNDED`, payment refunded, stock returned, loyalty points deducted, "refund" email, reports updated.

## FLOW-05: Review a purchased product
**Path:** Customer with a delivered order → Product page → Write review → Submit
**Modules:** Reviews, Orders, Catalog
**Must be true at the end:** review visible, product average rating and count updated in catalog.

## FLOW-06: Registration & first order
**Path:** Sign up → Welcome email → Apply WELCOME10 → Checkout
**Modules:** Auth, Users, Notifications, Cart, Coupons, Checkout

## FLOW-07: Catalog & stock management
**Path:** Admin creates product with stock → appears in catalog → customer buys → stock drops → low-stock report updates
**Modules:** Admin, Catalog, Inventory, Checkout, Reports

## FLOW-08: Account security
**Path:** 5 wrong passwords → locked → wait 15 minutes → log in → log out → old token rejected
**Modules:** Auth, Users

## FLOW-09: Live search
**Path:** Type in the header search → suggestions appear → pick one, or press Enter → shop page with results that keep updating as the text changes → add filters (category, price, stock, sale) → sort
**Modules:** Catalog, Inventory (stock status), Reviews (ratings), Orders (sold counts)
**Must be true:** results always match the latest text (no stale results), the URL reflects the filters, empty results show a helpful message.
