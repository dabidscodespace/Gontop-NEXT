# GONTOP migration checklist

Status as of the final implementation pass. “Done” means code exists and was
verified by the build, lint, integration suite, or an HTTP smoke test. Anything
that needs external credentials is explicitly marked as unverified.

## 1. Baseline and preservation — done

- [x] Inspected the legacy Vite app, CSS, components, assets and service layer.
- [x] Preserved the original app under `legacy/` (excluded from builds).
- [x] Copied design assets to `public/assets/`.
- [x] Kept the GONTOP palette (`#f96000`, `#121212`), Lato typography, white
      cards with orange inset shadows, header, mobile nav, banner and package
      card patterns.
- [x] Removed WordPress/WooCommerce from the new runtime path.

## 2. Platform and data model — done

- [x] Next.js App Router + TypeScript + Tailwind 4 shell.
- [x] Drizzle schema with 17 tables: users, admin users, sessions, games,
      products, variations, banners, orders, order items, order history, notes,
      payments, wallets, wallet transactions, refunds, settings, audit logs.
- [x] Generated migration `db/migrations/0000_init.sql`.
- [x] Postgres in production, PGlite fallback for local/test.
- [x] Money stored as `numeric(12,2)` and normalized to integer paisa in code.

## 3. Storefront — done

- [x] Database-driven header menus and search.
- [x] Banner carousel, home page, popular games/products.
- [x] Games index and game detail.
- [x] Product page with dynamic player fields and package cards.
- [x] Direct top-up checkout (no cart, shipping or addresses).
- [x] Login, registration, Google ID-token login, account profile/password.
- [x] Orders list, order tracker, gateway return verification and polling.
- [x] Wallet deposit UI, balance and ledger.
- [x] About, 404, SEO metadata.
- [x] Maintenance-mode notice in the storefront.
- [ ] Pixel-level visual diff and multi-viewport browser review. The port follows
      the legacy CSS/assets but has not been visually signed off.

## 4. Admin CMS — done

- [x] Dashboard and reports.
- [x] Games CRUD.
- [x] Products list/create/edit, variations and player-field editor.
- [x] Banners CRUD.
- [x] Orders list/detail, search/filter, status transitions, notes, payment
      re-verification, refunds.
- [x] Customers and wallet adjustments.
- [x] Payments and wallets/ledger views.
- [x] Settings incl. support, maintenance and payment display.
- [x] Staff accounts, roles and granular permissions.
- [x] Product CSV import preview + import + export.
- [x] Audit-log writes for privileged mutations.
- [ ] Audit-log viewer UI (entries are recorded; no dedicated screen yet).

## 5. Payments, wallet and refunds — code done; gateway unverified

- [x] Wallet ledger is append-only with row locks and idempotency keys.
- [x] Negative balances and double spending are rejected.
- [x] Hybrid wallet + gateway reservation and automatic wallet refund on
      failed/cancelled initialization.
- [x] UddoktaPay checkout initialization, same-tab redirect.
- [x] Server-side `/verify-payment` for every completion path; redirect and
      webhook claims are never trusted.
- [x] Amount, currency, ownership and duplicate-processing checks.
- [x] Webhook API-key header verified in constant time, then re-verified.
- [x] Refunds capped at order total, split wallet/gateway, non-duplicable.
- [ ] Sandbox/live UddoktaPay run with real credentials.
- [ ] Automatic unpaid-order expiry (staff cancellation works).

## 6. Fulfillment — done with manual launch mode

- [x] Fulfillment isolated in `lib/fulfillment.ts` behind a provider interface.
- [x] Manual provider for staff top-ups.
- [x] Admin order page displays the active fulfillment mode.
- [x] Order status flow supports paid → processing → completed plus cancellation
      and refund states.
- [ ] Supplier API integration (blocked on provider API contract/credentials).
- [ ] Automatic player-ID validation (same blocker).

## 7. Migration tooling — done, with known limits

- [x] CSV parser/preview with grouping, validation and duplicate-SKU handling.
- [x] Import into games/products/variations with safe re-import skipping.
- [x] Raw WooCommerce product export normalization (categories → games,
      variation attributes → packages, draft status preserved).
- [x] Customer CSV import with email matching, duplicate merging, registration
      date/name/phone preservation and zero-wallet creation.
- [x] Order CSV import supporting JSON or pipe-delimited line items, row-level
      item columns, guest customers, status mapping, player fields, notes,
      historical payments and refund totals.
- [x] Idempotent re-imports: customers skip by email, orders skip by
      `GT-WC-<order id>` public ID.
- [x] Imported orders never mutate wallet balances or the wallet ledger.
- [x] Product export.
- [x] Google-only customer continuity via Google sign-in.
- [ ] Import historical customer password hashes (not possible without the old
      hash format or a forced-reset flow).
- [ ] Coupons, reviews and licenses (not represented in the schema).
- [ ] Serialized WordPress order-item meta outside the supported player-field
      columns (needs a custom export or direct DB migration script).

## 8. Verification — done, with listed exceptions

- [x] `npm run test:flows`: 54 passed, 0 failed, including customer and order
      migration, guest customers, item matching, payment/refund records and
      re-import idempotency.
- [x] `npm run build`: compiled and type-checked, all routes generated.
- [x] `npm run lint`: no errors or warnings.
- [x] Production HTTP smoke test: home, product, register/login, session,
      wallet credit, wallet-only paid order, order tracker/status API, admin
      login, all admin pages, admin order search/filter, upload/file serving,
      unauthenticated 401/redirect behavior, gateway-unconfigured 503.
- [ ] Gateway sandbox/live test (no credentials).
- [ ] Google sign-in test (no client ID).
- [ ] Browser-based responsive/visual review.
- [ ] Migration dry run using the real WooCommerce exports (product, customer,
      order) and reconciliation of open orders.
- [ ] Load/concurrency test beyond the wallet integration checks.

## Next recommended task

Run one end-to-end sandbox payment with UddoktaPay credentials: configure
`UDDOKTAPAY_API_KEY`, `UDDOKTAPAY_BASE_URL` and the public site URL, place an
order with a small partial-wallet amount, complete sandbox checkout, confirm the
order is marked paid exactly once, then test a full and a partial refund. The
remaining product work after that is supplier fulfillment or a responsive visual
pass, depending on launch priority.
