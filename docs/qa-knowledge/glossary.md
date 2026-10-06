# Glossary

| Term | Meaning in ShopLite |
|------|---------------------|
| **Taka (৳, BDT)** | Bangladeshi currency. All money is stored and calculated as whole Taka. `18999` = ৳18,999. |
| **Lakh grouping** | Bangladeshi number format: ৳1,00,000 (one lakh), not ৳100,000. |
| **MRP / original price** | The price before a sale, shown struck through. |
| **VAT** | Value-added tax, 5% of the discounted subtotal. |
| **bKash** | Bangladesh's most popular mobile wallet. A payment method at checkout. |
| **Live search** | Results are fetched while the user types (debounced), with no need to press Search. |
| **Debounce** | Waiting until the user stops typing for a short time before calling the API. |
| **Subtotal** | Σ (unit price × quantity) for all items, before discount, tax and shipping. |
| **Discount** | Amount taken off the subtotal by a coupon. Capped at the subtotal. |
| **Taxable amount** | Subtotal − discount. VAT is 5% of this. |
| **Total** | Taxable amount + VAT + delivery charge. The amount charged to bKash or card. |
| **Coupon** | A code giving a PERCENT or FIXED discount, optionally with expiry, minimum order and usage limit. |
| **Usage limit** | Maximum number of orders that may use a coupon across all customers. |
| **Stock / inventory** | Units available to sell right now. |
| **Low-stock threshold** | Stock level at or below which "Only N left" is shown (default 5). |
| **Order status** | PAID, SHIPPED, DELIVERED, CANCELLED or REFUNDED. |
| **Cancel** | Stopping a PAID order before it ships. Full refund, items restocked. |
| **Refund** | Returning money for a DELIVERED order within 30 days. Items restocked, points reversed. |
| **Loyalty points** | Reward points: 1 per ৳100 of discounted subtotal, credited on delivery. |
| **Verified buyer** | A customer with a DELIVERED order containing the product. Only they can review it. |
| **Event** | A message like `order.delivered` published by one module so others can react. |
| **Outbox / Inbox** | Emails are not really sent. They are stored and shown under Account → Inbox. |
| **Hub module** | A module many others depend on (Pricing, Inventory, Orders). Changes to a hub need wide regression testing. |
