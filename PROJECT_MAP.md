# PROJECT MAP

Actual architecture of Gontop-NEXT as of the architecture audit. Update when architecture changes.

## Technology Stack

- Frontend: Next.js 16 App Router, React 19, Tailwind 4 (`app/globals.css`)
- Backend: Next.js server actions (`app/(admin)/admin/actions.ts`), route handlers (`app/api/**`), server-only services (`lib/services/**`)
- Database: PostgreSQL in production (`postgres` driver); embedded PGlite (WASM Postgres) for local dev and tests (`DATABASE_URL=pglite://...`)
- ORM: Drizzle ORM (`db/schema.ts`, SQL migrations in `db/migrations/0000`–`0012`)
- Validation: Zod 4 (`lib/validation.ts`)
- Authentication: custom cookie sessions (hashed tokens in `sessions`), separate customer and admin cookies, optional Google login (`lib/auth.ts`, `lib/services/auth.ts`), admin RBAC via `lib/permissions.ts`
- Payment integration: UddoktaPay gateway (`lib/uddoktapay.ts`), webhook at `app/api/webhooks/uddoktapay`, verification always re-queried from gateway
- Wallet: internal ledger (`wallets`, `wallet_transactions`), row-locked via `applyWalletEntry` (`lib/services/wallet.ts`)
- File storage: local disk uploads with MIME magic-byte checks, 4 MB limit (`lib/storage.ts`), served via `app/api/files/[key]`
- Hosting: single VPS assumed (in-memory rate limiter `lib/rate-limit.ts`); production requires PostgreSQL

## Project Structure

- `app/(store)/` — storefront: home, `product/`, `account/`, `orders/`, `wallet/`, `login/`, `register/`, `about/`
- `app/(admin)/admin/` — admin dashboard: `products/`, `games/`, `categories/`, `orders/`, `payments/`, `wallets/`, `customers/`, `banners/`, `topup-methods/`, `admins/`, `reports/`, `import/`, `settings/`, shared `actions.ts`
- `app/(admin-login)/` — admin login
- `app/api/` — `account`, `admin` (upload/export), `auth`, `files`, `orders`, `payments`, `search`, `wallet`, `webhooks`
- `lib/` — `auth`, `crypto`, `db`, `money`, `settings`, `permissions`, `validation`, `order-status`, `catalog-rules` (`effectivePricing`, `isSellableVariation`), `fulfillment` (provider interface), `csv`, `migration`, `storage`, `rate-limit`, `uddoktapay`, `urls`, `api`
- `lib/services/` — `admin-catalog` (~1400 lines), `orders`, `payments`, `refunds`, `wallet`, `catalog`, `eligibility`, `auth`, `admin`
- `db/schema.ts` — single schema file; `db/migrations/` — SQL migrations
- `scripts/` — `migrate`, `seed`, `test-flows`, `test-catalog`, `test-lifecycle`, `test-dashboard` (run with `npm run test:*`)
- `legacy/`, `dist.zip`, `MIGRATION_CHECKLIST.md`, `ORDER_MANAGEMENT_SPEC.md`, `PRODUCT_MANAGEMENT_SPEC.md` — reference/legacy material, not runtime code

## Database Models

Core tables (from `0000_init` and later migrations):

- **Products** (`products`): game_id, name, slug (unique), sku, price, image, `status` (draft | published | archived), `availability` (available | unavailable | disabled), `product_type` (simple | variable), is_featured, sort_order, fulfillment_notes. CHECK constraints on price ≥ 0, valid status/type/availability, blank SKU rejected.
- **Variations** (`variations`): product_id, name, sku, price, compare_at_price, sale_starts_at/sale_ends_at, stock_status, stock_quantity (NULL = unlimited), status, availability, topup_method_id, sort_order. Price ≤ compare-at and sale window CHECKs.
- **Games** (`games`): name, slug, parent_id (self-FK, regional variants; no self-parent), region, sort/active fields.
- **Regional variants**: modeled as `games.parent_id` + `games.region`.
- **Categories** (`categories`, `category_games`, `category_products`): homepage sections; a product/game may belong to multiple categories with sort order.
- **Top-up methods** (`topup_methods`): configurable player-input fields, referenced by variations.
- **Customers** (`users`, `sessions`): unique lower(email), is_active, phone, picture.
- **Orders** (`orders`, `order_items`, `order_history`, `order_notes`): `orders.public_id` (unique), `status`, total, item_count, gateway_amount, wallet_amount, paid_at, completed_at, payment_method, player_fields (JSON), delivery_message. `order_items` store product/variation name, SKU, price snapshots (FKs use SET NULL so history survives deletion). `order_history` records from/to status, actor type/id, customer_visible. `order_notes` are admin notes with optional customer visibility.
- **Payments** (`payments`): order_id (nullable), user_id, type (`order` | `wallet_deposit`), gateway, invoice_id (UNIQUE), transaction_id, sender_number, amount, status (initiated | pending | completed | failed …).
- **Refunds** (`refunds`): order_id, user_id, amount, method (wallet | gateway), reason, status, gateway reference, processed_by_admin_id.
- **Wallets** (`wallets`: user_id, balance ≥ 0 expected) and **wallet_transactions** (signed amount, balance before/after, type, reference_type/reference_id, admin id).
- **Fulfillment**: `fulfillment_attempts` table (provider runs). `orders.fulfillment_status` and `orders.payment_status` are separate from `orders.status`. `lib/fulfillment.ts` defines `FulfillmentProvider`; an automatic provider runs when an admin moves an order to `processing` and `FULFILLMENT_PROVIDER` selects it (none registered by default; manual is the default).
- **Admins and permissions** (`admin_users`, `audit_logs`, `settings`): roles owner | moderator, `permissions` array checked by `requireAdmin(permission)`. Permission keys include `products.manage`, `orders.view`, `orders.update_status`, `payments.view`, `refunds.process`, `wallet.manage`, `customers.view`, `categories.manage`, `banners.manage`, `csv.manage`, `settings.manage`, `staff.manage`.

## Important APIs

- `POST /api/orders` — checkout; prices computed server-side from DB; wallet + gateway split; stock reserved atomically on creation.
- `POST /api/orders/[publicId]/pay` — starts gateway payment for a pending order (`initOrderGatewayPayment`).
- `POST /api/orders/[publicId]/verify` — customer-triggered gateway re-verification of a pending invoice.
- `POST /api/orders/[publicId]/cancel` — cancels an unpaid order, returning the wallet portion.
- `GET /api/orders/[publicId]/status` — customer polling of order status.
- `POST /api/payments/verify` — customer-side gateway verification entry point.
- `POST /api/wallet/deposit` — wallet top-up via gateway (`initWalletDeposit`).
- `POST /api/webhooks/uddoktapay` — gateway webhook; authenticated by API key header (timing-safe), then `verifyInvoice` re-checks status.
- `POST /api/auth/{register,login,logout,google}`, `/api/account` — customer auth and profile.
- `GET /api/search` — storefront search (uses `getSearchIndex`).
- `POST /api/admin/upload`, `POST /api/admin/auth/login`, `GET /api/admin/export/products` — admin upload, login, CSV export. `GET /api/files/[key]` — stored files.
- Server actions in `app/(admin)/admin/actions.ts` (~1000 lines): product/variation CRUD, bulk and lifecycle actions, categories, banners, order status (single and bulk, max 200), notes, delivery message, payment verify, refund, wallet adjust, settings, staff, CSV/customer/order imports, top-up methods, customer enable/disable.

## Admin Pages

- Products: `products/` (list with filters/pagination, edit, duplicate, bulk actions, lifecycle draft/publish/archive, restore)
- Games, Categories, Banners, Top-up methods
- Orders: `orders/` list (status filter, search, counts), `orders/[id]` detail (history, notes, payments, refunds, verify), bulk status
- Payments: `payments/` (paged list, gateway verify)
- Wallets: `wallets/` (balances, totals, manual adjust)
- Customers, Reports, Import (CSV products, customers, orders), Settings, Admins

## Storefront

- Homepage `app/(store)/page.tsx`: banners, homepage categories (multi-category sections), popular games
- Product pages `product/[slug]`: variations shown only when published and available; eligibility via `lib/services/eligibility.ts`
- Checkout: cart → `POST /api/orders` → either wallet-paid (status `paid`) or gateway-pending (`pending_payment`), then UddoktaPay redirect; `/orders/[publicId]` shows status and `?cancelled=1`
- Account, order history, wallet top-up, login/register

## Order State Model (current)

`lib/order-status.ts`: `pending_payment → cancelled`; `paid → processing | on_hold | completed | failed`; `processing → completed | on_hold | failed`; `on_hold → processing | failed`; `failed → processing` (retry); `completed`, `cancelled`, `refunded` are terminal. `refunded` is only reachable through the refund workflow. Payment status and fulfillment status are tracked separately (`payment_status`, `fulfillment_status`).

## Architecture Constraints (must preserve)

- Server-side price calculation and purchase eligibility; never trust client prices or visibility.
- Wallet debit and gateway split at checkout; wallet cancel-refund on unpaid cancellation.
- Order line snapshots (name, SKU, price) survive later product/variation edits and deletion.
- Storefront design identity, navigation behavior, Popular Games and homepage category behavior.
- Publication (`status`) and availability (`availability`) are independent controls; both must be enforced on the server.
- Invoice IDs and public order IDs are unique; webhook payloads are never trusted without gateway re-verification.
- Existing migrations `0000`–`0009` are applied to live data; new migrations must be additive and safe.
