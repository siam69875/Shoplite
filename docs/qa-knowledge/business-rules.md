# Business Rules

Every rule has a stable ID. Reference IDs in test cases, bug reports and PR descriptions.

**Currency:** all amounts are Bangladeshi Taka (BDT, ৳), stored and charged as **whole Taka**.
Amounts are displayed with Bangladeshi digit grouping: `৳1,00,000`.

## Authentication (AUTH)
- **BR-AUTH-01:** Passwords must be 8–72 characters and contain at least one letter and one number.
- **BR-AUTH-02:** Email addresses are unique, case-insensitive (`Alice@x.com` = `alice@x.com`) and stored in lower case.
- **BR-AUTH-03:** After **5** consecutive failed logins the account is locked for **15 minutes**. While locked, even the correct password is refused (HTTP 423). A successful login resets the counter.
- **BR-AUTH-04:** Unknown email and wrong password return the **same** error message ("Invalid email or password").
- **BR-AUTH-05:** Sessions expire after 24 hours. Logging out invalidates the token immediately.
- **BR-AUTH-06:** A welcome email is sent on registration.

## Catalog (CAT)
- **BR-CAT-01:** Search matches product name, description or category, case-insensitive, partial match. In the web app, results update **as the user types** (about 300 ms after they stop typing). Outdated responses are discarded, so results always match the latest text. The header search shows up to 6 live suggestions.
- **BR-CAT-02:** A product that appears in any order **cannot be deleted** (HTTP 409). Products never ordered can be deleted; this also removes them from carts and deletes their reviews.
- **BR-CAT-03:** Price must be a positive whole number of Taka. Product name 2–80 characters.
- **BR-CAT-04:** A product may have an optional original price (MRP), which must be higher than the selling price. Sale items show the original price struck through and a discount badge = (original − price) ÷ original, **rounded down** to a whole percent.
- **BR-CAT-05:** Catalog filters: category, price range (min/max, inclusive), in stock only, on sale only. Sorting: best selling, top rated, newest, price, biggest discount, name. At most 100 results per request.

## Inventory (INV)
- **BR-INV-01:** Stock is deducted **at checkout** (when payment succeeds), never when an item is added to the cart. Carts do not reserve stock.
- **BR-INV-02:** Cancelled and refunded orders return all their items to stock.
- **BR-INV-03:** Stock status: `Out of stock` at 0; `Only N left` when stock ≤ low-stock threshold (default 5); otherwise `In stock`.
- **BR-INV-04:** Stock can never go below zero. If stock runs out between "add to cart" and "checkout", checkout fails with 409 and nothing is charged.

## Cart (CART)
- **BR-CART-01:** Quantity per item must be a whole number from **1 to 10**. The limit applies to the total in the cart (adding 6 then 5 of the same item is rejected).
- **BR-CART-02:** You cannot add more of an item than is in stock, and you cannot add out-of-stock items.
- **BR-CART-03:** Only logged-in users have a cart. The cart persists across sessions.

## Coupons (CPN)
- **BR-CPN-01:** **Only one coupon per order.** Applying a new coupon replaces the previous one.
- **BR-CPN-02:** Expired coupons are rejected with the message "Coupon expired".
- **BR-CPN-03:** A discount can never exceed the subtotal (total before tax and shipping cannot go below $0).
- **BR-CPN-04:** Unknown or inactive codes are rejected with "Invalid coupon code". Codes are case-insensitive.
- **BR-CPN-05:** A coupon with a usage limit cannot be used more times than the limit. A use is counted when an order is placed; cancelling the order **does not** give the use back.
- **BR-CPN-06:** A coupon with a minimum order amount only applies when the **subtotal** (before discount) meets the minimum. If items are removed and the cart drops below the minimum, the discount is removed and the cart shows why.
- **BR-CPN-07:** Coupons are re-validated at checkout. A coupon that expired while sitting in the cart blocks checkout until it is removed.
- **BR-CPN-08:** Percentage coupons are 1–100%. Fixed coupons are an amount in whole Taka. Percentage discounts are rounded to the nearest Taka.

## Pricing (PRC)
- **BR-PRC-01:** Order of calculation: **subtotal → minus discount → VAT on the discounted amount → plus delivery charge = total.**
- **BR-PRC-02:** VAT is **5%**, calculated on the order's discounted subtotal and **rounded once at order level** to the nearest Taka (half up), not per line. Example: 3 × ৳145 = ৳435 → VAT ৳21.75 → ৳22.
- **BR-PRC-03:** All amounts are calculated on the server. The client never sends prices or totals.
- **BR-PRC-04:** The price charged is the product's price at checkout time; later price changes do not affect existing orders (order items store the unit price).

## Shipping (SHIP)
- **BR-SHIP-01:** Delivery charge is a flat **৳60** per order anywhere in Bangladesh. Empty carts show ৳0.

## Checkout (CHK)
- **BR-CHK-01:** The delivery address needs a full name, a Bangladeshi mobile number (11 digits, `01` followed by 3–9, e.g. `01712345678`), an address line, a district from the supported list, and a **4-digit** postcode.

## Payments (PAY)
- **BR-PAY-01:** Two payment methods: **bKash** and **Card**.
  - Card: number must be 16 digits (spaces and dashes are ignored), expiry `MM/YY` not in the past, CVC 3 digits.
  - bKash: wallet number must be a valid Bangladeshi mobile number. The 6-digit verification code must be correct (`123456` in the demo).
- **BR-PAY-02:** A declined payment creates **no order**, changes **no stock**, uses **no coupon**, and keeps the cart unchanged.
- **BR-PAY-03:** The amount charged equals the order total exactly.
- **BR-PAY-04:** Only the payment method and the last 4 digits of the card or wallet number are stored.
- **BR-PAY-05:** Refunds go back to the same method (card or bKash wallet).

## Orders (ORD)
- **BR-ORD-01:** Status transitions allowed:
  `PAID → SHIPPED → DELIVERED → REFUNDED` and `PAID → CANCELLED`. No other transitions, no skipping.
- **BR-ORD-02:** Customers can cancel their own order only while it is `PAID` (not yet shipped).
- **BR-ORD-03:** Cancelling or refunding returns the **full amount paid** to the card.
- **BR-ORD-04:** Refunds are only possible within **30 days** of delivery.
- **BR-ORD-05:** Every status change is recorded in the order's status history and triggers exactly one customer email.

## Loyalty (LOY)
- **BR-LOY-01:** 1 point per full **৳100** of **(subtotal − discount)**. VAT and delivery do not earn points. Rounded **down** (৳2,740 → 27 points).
- **BR-LOY-02:** Points are credited once, when the order is **delivered**. Paid, shipped and cancelled orders earn nothing.
- **BR-LOY-03:** Refunding a delivered order deducts the points it earned.

## Reviews (REV)
- **BR-REV-01:** Only customers with a **DELIVERED** order containing the product can review it. Refunded or cancelled orders do not count.
- **BR-REV-02:** One review per customer per product.
- **BR-REV-03:** Rating is a whole number from 1 to 5. Comment is optional, up to 500 characters.
- **BR-REV-04:** Review text is displayed as plain text. HTML or scripts in a review must never execute.

## Notifications (NOT)
- **BR-NOT-01:** Emails are sent for: registration, order paid, shipped, delivered, cancelled, refunded.
- **BR-NOT-02:** The delivered email states the loyalty points earned. The cancelled and refunded emails state the refunded amount.

## Admin reports (RPT)
- **BR-RPT-01:** Revenue = sum of totals of orders in `PAID`, `SHIPPED` or `DELIVERED`. Cancelled and refunded orders are reported separately as "Refunded".
- **BR-RPT-02:** VAT collected and discounts given use the same set of orders as revenue.
- **BR-RPT-03:** Low-stock lists products at or below their threshold, lowest first.
