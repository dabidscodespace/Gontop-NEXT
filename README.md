# GONTOP — Next.js storefront + admin

An independent rebuild of the GONTOP game top-up store. The customer storefront,
admin CMS, wallet ledger and payment verification run entirely on Next.js and
PostgreSQL — there is no WordPress/WooCommerce runtime dependency.

The original Vite app is preserved under [`legacy/`](./legacy) as the design and
business-logic reference. It is excluded from the TypeScript, ESLint and Next.js
builds.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- PostgreSQL via Drizzle ORM (`postgres` driver in production)
- PGlite (real PostgreSQL compiled to WASM) for zero-setup local development
  and the integration test suite
- Zod validation, custom DB-backed sessions, scrypt password hashing
- UddoktaPay for hosted checkout and server-side verification

## Local setup

```bash
cd Gontop-NEXT
npm install
cp .env.example .env.local      # set ADMIN_PASSWORD before seeding
npm run db:migrate              # not needed for PGlite (auto-migrates on boot)
npm run db:seed                 # creates the owner + default settings
SEED_DEMO=true npm run db:seed  # optional demo catalogue (idempotent)
npm run dev
```

Open <http://localhost:3000>. Admin is at `/admin/login`; the seeded owner email
defaults to `owner@gontop.app`. If `ADMIN_PASSWORD` is omitted, the seed prints a
generated password once — save it.

With no `DATABASE_URL`, data lives in `.data/gontop`. To use a real database,
set `DATABASE_URL`, run `npm run db:migrate`, then `npm run db:seed`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run db:generate` | Generate a migration after editing `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (Postgres or PGlite) |
| `npm run db:seed` | Owner, default settings, optional demo catalogue |
| `npm run test:flows` | Integration suite on a throwaway PGlite database |
| `npm run lint` | ESLint |

## What is implemented

### Storefront

- Home page with database-driven banner carousel, popular games and products
- Games index and game pages, product pages with dynamic player fields and
  package/variation cards
- Direct top-up checkout: no cart, shipping or address step
- Login, registration, Google ID-token sign-in, account profile/password
- Orders list and tracked order detail with polling and gateway return handling
- Wallet page with deposit form, balance and immutable ledger
- Search dialog/API, About page, 404, preserved GONTOP visual design and assets

### Admin CMS

- Dashboard, games, products (variations + player-field editor), banners
- Product, customer and order CSV migration
- Orders: filters/search, player details, status flow, internal notes,
  gateway re-verification, refunds
- Customers with wallet adjustment and order history
- Payments, wallets/ledger, reports, settings
- Staff accounts with owner/moderator roles and per-section permissions
- WooCommerce product CSV preview/import and product export

### Money and orders

- Prices, variations and totals are recalculated server-side from the database;
  client-sent amounts are never trusted.
- Money is stored as `numeric(12,2)` strings and handled as integer paisa through
  `lib/money.ts`.
- Wallet spending and refunds use row-locked, append-only ledger entries with
  idempotency keys. Negative balances and duplicate refunds are rejected.
- Hybrid payment debits the wallet portion when the order is created and refunds
  it if gateway initialization fails or the payment is cancelled/expired.
- Refunds are capped at the order total, split between wallet and gateway, and
  cannot be repeated past the cap.

### Payments

- UddoktaPay checkout is opened in the same tab.
- Browser redirect parameters and webhook payloads are never trusted. Every
  invoice is re-verified with `/verify-payment` before a wallet deposit or order
  is marked paid.
- Amount, currency, invoice ownership and idempotency are checked server-side.
- Webhook calls require the `RT-UDDOKTAPAY-API-KEY` header, compared in constant
  time, followed by the same verification path.
- Gateway credentials come only from environment variables. When they are
  missing, online deposit returns a clear 503 instead of faking success.

### Security

- Sessions are random 256-bit tokens stored hashed in the database; cookies are
  `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- Passwords use scrypt with per-user salts. Session and admin tokens are hashed
  at rest.
- Admin routes and every server action check the session and section permission
  (`orders`, `products`, `customers`, `wallets`, `refunds`, `settings`, `staff`,
  `reports`, `payments`, `banners`, `games`).
- Mutating API routes enforce same-origin requests; auth and checkout endpoints
  are rate-limited in-process.
- Administrative changes, refunds, verification and wallet adjustments write
  audit-log entries.
- Uploads validate size, MIME type and magic bytes; filenames are random and
  stored outside the public folder, served through `/api/files/[key]`.

### Fulfillment

`lib/fulfillment.ts` defines a provider interface separate from order
management. The bundled `manual` provider is the launch mode: staff top up the
player account and advance the order. A supplier API can implement the same
interface and be selected with `FULFILLMENT_PROVIDER` without touching checkout
or ledger code.

## Configuration

See [`.env.example`](./.env.example). Important variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Production | PostgreSQL URL; omitted means local PGlite |
| `NEXT_PUBLIC_SITE_URL` | Production | Public origin for redirects, webhook URL and SEO |
| `UDDOKTAPAY_API_KEY` | For payments | Server-only |
| `UDDOKTAPAY_BASE_URL` | For payments | Sandbox or live base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` | For Google login | Must match |
| `UPLOAD_DIR` | Optional | Defaults to `./.data/uploads` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Seed only | Owner account |
| `SEED_DEMO` | Optional | `true` inserts the demo catalogue |
| `FULFILLMENT_PROVIDER` | Optional | Defaults to `manual` |

## Deployment

### VPS (recommended for this codebase)

1. Provision PostgreSQL and a Node 20+ runtime.
2. Set production env vars, especially `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL` and UddoktaPay credentials.
3. `npm ci && npm run db:migrate && npm run db:seed && npm run build`.
4. Run `npm start` under systemd/PM2 behind nginx/Caddy (TLS).
5. Keep `UPLOAD_DIR` on persistent disk and include it in backups.
6. Point the UddoktaPay webhook at
   `https://your-domain/api/webhooks/uddoktapay`.

Back up PostgreSQL and the upload directory together. The wallet ledger is the
source of truth for balances; do not edit balances directly in SQL.

### Vercel

The app builds and runs on Vercel with a hosted PostgreSQL database. The local
upload driver writes to the filesystem, which is ephemeral on Vercel — use
external object storage before relying on admin image uploads, or paste image
URLs instead. The in-process rate limiter is per-instance; put a shared limiter
in front of auth/checkout endpoints if you need strict global limits.

## Migrating from WordPress

### Products

1. In WooCommerce go to **Products → Export**, choose all products, select
   **Export all columns**, and download the CSV. Keep variable products and their
   variations in the same file.
2. In this app open **Admin → Import**, upload that file and press **Preview
   import**. Nothing is written until you confirm the preview.
3. Check the detected games and products. Categories become games (`Games >
   Mobile Legends` → `Mobile Legends`), variation attributes become package
   names, and sale price, stock, images, descriptions and draft/published status
   are preserved. Missing games can be created during import.
4. Press **Import**. Products are grouped by slug/name, so re-uploading the same
   file skips products that already exist.
5. Review each imported product and add its player fields (for example Player ID
   and Server ID), game instructions and banner images. WooCommerce has no
   equivalent of these fields, so they cannot be inferred reliably.

WooCommerce categories need to identify the game for an automatic mapping. If a
catalogue has no useful categories, add a `game_name` column or prepare the
app's own format (header names are listed in `lib/csv.ts`). Prices are treated as
BDT; convert them before import if the old store used another currency.

The importer also accepts this app's export format with columns such as
`product_name`, `product_slug`, `game_slug`, `variation_name`, `variation_sku`
and price fields. Custom sheets can use friendlier `name`, `slug`, `sku`, `images`
and `categories` headings.

### Customers

1. Export customers from WooCommerce, or a WordPress users CSV containing at
   minimum an email column (`email`, `billing_email`, `customer_email` or
   `user_email`).
2. Open **Admin → Import → Import customers**, upload and preview.
3. Import. Accounts are matched by email; existing customers are skipped, not
   overwritten. Name, phone and registration date are kept where present.
4. Imported accounts have **no password** (WordPress password hashes cannot be
   verified here) and a zero wallet. Customers who used Google can sign in with
   the same email; others must register or use a future password-reset flow.

Duplicate emails in one file are merged. Rows with a missing or invalid email
are reported and block the import until fixed.

### Orders

1. Export orders from WooCommerce (core export or a CSV export plugin) with one
   row per order or one row per line item.
2. Open **Admin → Import → Import orders**, upload and preview.
3. Review statuses, totals, customers and errors, then import.

Supported order columns include:

- `order_id` / `order_number`, `order_date` / `date_created`, `status`
- `billing_email`, billing/customer name and phone
- `order_total`, `order_subtotal`, discount and `wallet_amount` (optional)
- `payment_method` / `payment_method_title`
- `line_items` / `order_items` as JSON
  (`[{"name":"100 Diamonds","quantity":1,"total":90}]`) or pipe-delimited
  (`name:100 Diamonds|quantity:1|total:90`), or row-level item columns
  (`item_name`, `quantity`, `item_total`, `item_sku`)
- `player_fields` as JSON or `key=value;key=value`, or common
  `player_id` / `server_id` / `game_id` / `zone_id` columns
- `customer_note`, `order_notes`, `refund_total`

Woo statuses are mapped to this platform's statuses (`completed`, `processing`,
`pending`/`on-hold` → awaiting payment, `cancelled`, `failed`, `refunded`).
Imported orders keep their date, total, line items, notes, available player
fields, payment reference and refund total.

Orders create missing customers automatically, including guest checkout
customers, using the billing email. If no email exists, a clearly marked guest
account is created. Existing order IDs are skipped, so re-import is idempotent.
Imported orders **never change wallet balances or write wallet ledger entries**.

### Limitations

- Customer passwords, coupons, reviews and licenses are not migrated; those
  features do not exist in this schema or cannot be hash-compatible.
- Imported payments are historical records with gateway `woocommerce`; they are
  not retried or refunded through a gateway.
- Custom player data must be present in the export as `player_fields` or the
  common player columns listed above. Old plugins that stored this only in
  serialized WordPress meta need a custom export or a direct database migration.
- Do not import the same order under a changed order ID; it will be treated as a
  new order. Keep the old store/database read-only until reconciliation is done.

Banners, settings, support links and staff accounts are recreated in the admin
panel. Back up WordPress and the new PostgreSQL database before importing.

## Tests and verification

`npm run test:flows` runs 54 integration checks on an isolated PGlite database,
covering registration/login hashing, RBAC, wallet ledger and balance guards,
server-side pricing, stock, hybrid reservation and cancellation refunds, status
transitions, partial/full refunds, double-refund prevention, product CSV import,
WooCommerce product normalization, and customer/order migration including
guest customers, line items, payments, refunds and idempotent re-imports.

The production build, TypeScript check and ESLint pass. A production server was
also smoke-tested over HTTP: home, product, register/login, wallet credit and
wallet-only paid order, order tracker/status API, admin login, every admin page,
admin order search/filter, upload + file serving, and unauthenticated rejection.

## Known gaps

- **UddoktaPay has not been exercised against a sandbox or live account**; no
  credentials were available. Code paths, signature/webhook auth and server-side
  re-verification are implemented and unit-covered only at the service level.
- Google sign-in was not exercised without a client ID.
- Automatic game-ID validation and instant supplier delivery from the old
  WordPress plugins are not migrated; this needs the provider's API contract and
  credentials. Manual fulfillment is the launch path.
- Visual/responsive review was not performed in a browser at multiple sizes;
  the design was ported from the legacy CSS and assets but is not pixel-diffed.
- No transactional email/SMS notifications, coupons, reviews, licenses or
  multi-currency. Prices are BDT only.
- Unpaid gateway orders are not auto-expired by a cron job; staff can cancel them
  from admin, which releases reserved wallet funds.

See [`MIGRATION_CHECKLIST.md`](./MIGRATION_CHECKLIST.md) for the phase-by-phase
status and the recommended next task.

## Project layout

```
app/(store)/         public pages and storefront layout
app/(admin)/admin/   admin pages and server actions
app/api/             JSON APIs, webhook, uploads and file serving
components/          storefront and admin UI
lib/                 auth, db, money, settings, storage, fulfillment
lib/services/        orders, payments, refunds, wallet, catalog, reports, CSV
db/schema.ts         Drizzle schema (17 tables)
db/migrations/       generated SQL migrations
scripts/             migrate, seed, integration tests
legacy/              preserved original Vite app (reference only)
public/assets/       original design assets
```
