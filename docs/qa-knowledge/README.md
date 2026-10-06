# ShopLite QA Knowledge Base

This folder describes what ShopLite **should** do. It is written for QA engineers and for the
AI QA agent that analyses pull requests. When code and these documents disagree, treat it as a
potential bug and raise it.

| File | Use it to answer |
|------|------------------|
| [product-overview.md](product-overview.md) | What is ShopLite and who uses it? |
| [user-roles.md](user-roles.md) | Who is allowed to do what? |
| [business-rules.md](business-rules.md) | What are the exact rules? (numbered `BR-*`) |
| [user-flows.md](user-flows.md) | Which end-to-end journeys exist? (numbered `FLOW-*`) |
| [module-map.md](module-map.md) | Which modules depend on each other, and what must always be true? (`INV-*`) |
| [glossary.md](glossary.md) | What do domain terms mean? |
| [test-data.md](test-data.md) | Which accounts, coupons, cards and products exist for testing? |

## How to reference
- Cite rules by ID in test cases and bug reports: *"Violates BR-CPN-01"*.
- Cite invariants for regression checks: *"INV-01 must still hold"*.
- Cite flows for end-to-end re-runs: *"Re-run FLOW-01 and FLOW-04"*.
