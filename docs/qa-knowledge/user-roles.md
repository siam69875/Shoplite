# User Roles & Permissions

ShopLite has exactly **three** kinds of user: Guest, Customer and Admin.

| Capability | Guest | Customer | Admin |
|------------|:-----:|:--------:|:-----:|
| Browse, search, view products and reviews | ✅ | ✅ | ✅ |
| Register / log in | ✅ | n/a | n/a |
| Use cart, apply coupon, checkout | ❌ | ✅ | ✅ |
| View **own** orders | ❌ | ✅ | ✅ |
| View **another user's** order | ❌ | ❌ | ✅ |
| Cancel own order (before shipping) | ❌ | ✅ | ✅ |
| Write a review (verified buyer only) | ❌ | ✅ | ✅ |
| Access anything under `/api/admin` or `/admin` | ❌ | ❌ | ✅ |
| Change order status (ship, deliver, cancel, refund) | ❌ | ❌ | ✅ |
| Manage products, stock, coupons | ❌ | ❌ | ✅ |
| See reports | ❌ | ❌ | ✅ |

## Rules
- **RBAC-01:** New registrations are always `customer`. There is no way to self-register as admin.
- **RBAC-02:** Admin access must be enforced by the **API**. Hiding a button in the UI is not
  protection.
- **RBAC-03:** Access to a resource owned by another customer returns **404 Not Found** (not 403),
  so attackers cannot learn which IDs exist.
- **RBAC-04:** A logged-out or expired session returns **401** on every protected endpoint.
- **RBAC-05:** Only the `admin` role may perform admin actions. Any future role must be granted
  admin capabilities explicitly, one by one.
