# PROJECT PROGRESS

## Current Stage

Core commerce safeguards and the complete admin workspace reorganization are implemented and tested. Remaining known infrastructure limitations are listed under Known Issues.

## Current Task

Admin information-architecture follow-up — customer, money, storefront-support, migration, settings, reporting, and team workspaces (done).

## Completed

### Stage 1 — Order state model
- `orders.payment_status` and `orders.fulfillment_status` added (migration 0010), backfilled from `orders.status`; `status` kept as the lifecycle source.
- `on_hold` status added; transitions: paid/processing → on_hold, on_hold → processing/failed, failed → processing (retry).
- Checkout, cancel, verify-payment, refunds, and CSV migration set both new fields. Partial refund → `partially_refunded`; full refund → `refunded`.
- Revenue and eligibility queries count `on_hold` as paid.

### Stage 2 — Fulfillment core
- `fulfillment_attempts` table (migration 0011): provider, outcome (`in_progress`/`completed`/`failed`/`manual_required`), message, reference, retryable, admin.
- Automatic provider hook: an admin moving an order to `processing` runs the registered provider when `FULFILLMENT_PROVIDER` selects an automatic one. The attempt is claimed under the order row lock; a completed attempt blocks any re-run; a stale in-progress claim (>10 min) can be reclaimed.
- Success → `completed`, failure → `failed` (retry via failed → processing). Manual provider unchanged: admin drives all transitions.
- `getOrderWithDetails` returns `attempts`.

### Stage 3 — Stock and money safety
- Stock released when an unpaid order is cancelled or fails (checkout reserve is undone).
- Stock released on a full refund only when the order was never fulfilled (`fulfillment_status` pending or failed). Processing/on-hold orders may already be delivered by a supplier, so they are not restocked.
- Refund caps re-checked under the order row lock (wallet path and gateway path). Caps count completed and pending refunds.
- Gateway refunds: a `pending` refund row is reserved under lock, the gateway call runs outside any transaction, then the row is settled to `completed` or `failed`.

### Stage 5 — Product management gaps
- SKUs: product and package SKUs share one namespace, compared case-insensitively (same rule as the CSV importer). Checked inside the save transaction under an advisory lock (`assertSkuFree` in `lib/services/admin-catalog.ts`), so concurrent saves cannot both claim a SKU. The previous check only looked within each table and was case-sensitive.
- Top-up fields (`productFieldsSchema` in `lib/validation.ts`): field ids and labels must be unique; select/radio fields need at least one option with unique values. Checkout now rejects a select/radio value that is not one of the options (`lib/services/orders.ts`).
- Game slug: renaming a game onto another game's slug returns 409 instead of a database error.
- Publishing: package publish and bulk publish already share one gate (`variationPublishProblems`, `applyVariationLifecycle`); product publish checks game liveness, variations, image and top-up method. Unchanged.
- Regional variants (admin game form): a game can be assigned to a top-level parent with a region (`parentId`, `region` in `gameSchema`). `saveGame` enforces one level of nesting, a region is required, a game cannot be its own parent, a game with regions cannot become a variant, and region names are unique per parent (case-insensitive). `deleteGame` refuses while regional variants exist. The games list shows each variant's parent and region.
- Tests: `test:lifecycle` "SKU and field rules" and "Regional variants" sections (54/54); `test:flows` "choice field rejects a value outside its options" (104/104).
- Stage 2 tests added: `manual_required` outcome (order stays processing, admin completes by hand), stale in-progress claim (>10 min) reclaimed, live in-progress claim blocks a second run without a supplier call (flows 111/111).

### Stage 4 — Order dashboard
- Order detail shows order, payment, and fulfillment status badges.
- Fulfillment attempts card (provider, outcome, message, reference).
- Orders list filters by payment status and fulfillment status (URL params `payment`, `fulfillment`), alongside the existing status chips and search.
- Pending gateway refunds can be settled by an admin: "Mark completed" (requires gateway reference, marks order refunded when fully covered) or "Mark failed" (releases the reserved amount). Service `resolvePendingGatewayRefund`, action `resolvePendingRefundAction`, audit `refund.resolve_*`.
- Manual hold/resume/retry/complete/fail controls remain the existing status panel (transitions derived from `ORDER_TRANSITIONS`).

## In Progress

Nothing.

## Pending

No implementation work is pending for the requested admin reorganization. The live preview remains available for final owner visual review.

## Audit Findings

### Preserve
- Server-side price calculation at checkout; wallet/gateway split; wallet refund on unpaid cancel.
- Order line snapshots (name, SKU, price) survive product/variation edits and deletion.
- Atomic stock reservation at order creation (conditional `stock_quantity >= qty` update).
- Gateway webhook auth (timing-safe key) and re-verification of every invoice with the gateway.
- Invoice ID and public order ID uniqueness (`payments.invoice_id` UNIQUE, `orders.public_id` UNIQUE survive migration 0007).
- Refund caps against order total and completed refunds; wallet refund locks the order row.
- Row-level locking in `applyWalletEntry`, `updateOrderStatus`, `cancelUnpaidOrder`.
- Publication (`status`) vs availability (`availability`) split, and CHECK constraints from migrations 0006–0009.
- Admin RBAC on every server action (`requireAdmin(permission)`), `assertSameOrigin` on customer mutations.
- Storefront design, Popular Games, homepage categories.

### Problems and Risks (priority order)
1. **Order status conflates payment and fulfillment.** `lib/order-status.ts` has no `on_hold`, no retry path, and no separate payment or fulfillment status. `paid → failed` is terminal, and `pending_payment → failed` does not exist. (MASTER_SPEC requires all of these.)
2. **Fulfillment is not implemented.** `lib/fulfillment.ts` defines `FulfillmentProvider`, but nothing registers or calls a provider. No fulfillment table or attempt log; delivery is only `orders.delivery_message`.
3. **Stock is never restored.** Stock is reserved in `lib/services/orders.ts` (~L207–225). Cancellation (`cancelUnpaidOrder`), failed payments and refunds do not return stock. Overselling is not the risk here; permanent stock loss is.
4. **Refund race.** `refundOrder` reads the refunded sum and checks the cap before taking the order lock; two concurrent refunds can both pass the cap check. Gateway refunds call `refundCharge` outside any DB transaction; if the DB write after a successful gateway refund fails, money is returned without a record.
5. **Checkout reads outside the transaction (resolved).** Checkout now re-reads the variations with `FOR UPDATE` and the product inside the reservation transaction. It re-runs the sellability, stock-status and price checks and returns 409 "Your cart changed while checking out" if anything moved. The race window itself has no automated test (it needs a concurrent edit hook); the normal path is covered by `test:flows` (113/113) and `test:catalog` (23/23).
6. **Orphaned/legacy material** in the repo root (`legacy/`, `dist.zip` 2 MB, `MIGRATION_CHECKLIST.md`, `ORDER_MANAGEMENT_SPEC.md`, `PRODUCT_MANAGEMENT_SPEC.md`). Reconcile with MASTER_SPEC.md before adding new spec docs.
7. **Stale `.next` generated types** break `tsc --noEmit`.
8. **In-memory rate limiter** (`lib/rate-limit.ts`) is per-process; acceptable for single VPS only.
9. **Product management gaps vs MASTER_SPEC:** no SKU-level or game-region filter audit done yet; CSV import/export exists (`lib/csv.ts`, `api/admin/export/products`); bulk actions exist; "publishing validation" not yet verified.

## Implementation Plan (from MASTER_SPEC.md)

1. ~~Stage 1 — Order state model.~~ Done.
2. ~~Stage 2 — Fulfillment core.~~ Done (manual admin actions use existing transitions; automatic provider hook wired).
3. ~~Stage 3 — Stock and money safety.~~ Done (residuals below).
4. ~~Stage 4 — Order dashboard.~~ Done.
5. ~~Stage 5 — Product management gaps.~~ Done, including regional variant assignment in the admin game form.

## Modified Files

- Schema and migrations: db/schema.ts, db/migrations/0010_order_payment_fulfillment.sql, db/migrations/0011_fulfillment_attempts.sql
- Stage 4: app/(admin)/admin/orders/[id]/page.tsx, app/(admin)/admin/orders/page.tsx, app/(admin)/admin/actions.ts, lib/services/refunds.ts (resolvePendingGatewayRefund), lib/services/orders.ts (filters, attempts), lib/validation.ts, lib/order-status.ts (labels)
- Order logic: lib/order-status.ts, lib/fulfillment.ts (unchanged, now used), lib/services/orders.ts, lib/services/refunds.ts, lib/services/payments.ts, lib/services/admin.ts, lib/migration.ts, lib/validation.ts
- UI: app/(admin)/admin/orders/page.tsx, app/(store)/orders/page.tsx
- Tests: scripts/test-flows.ts
- Docs: PROJECT_PROGRESS.md, PROJECT_MAP.md

## Database Changes

- 0010 (additive): `orders.payment_status`, `orders.fulfillment_status` with CHECKs; backfill verified on rows from migrations 0000–0009 (status preserved).
- 0011 (additive): new `fulfillment_attempts` table with index and outcome CHECK. Applied from scratch by every `test:flows` run (fresh PGlite directory).

## Tests

- test:flows 115/115 (sections: payment/fulfillment status, automatic fulfillment incl. manual_required and stale claim, refund and stock safety, pending gateway refunds, choice field validation).
- Stage 6 (SKU index): migration `0012`; `test:lifecycle` 55/55 adds a direct-insert check that the database rejects a case-variant SKU. test:flows 113/113, test:catalog 23/23, test:dashboard 48/48.
- `tsc --noEmit` clean after clearing stale `.next`.

## Known Issues

- SKU index: migration `0012_sku_normalized_unique` adds unique indexes on `lower(btrim(sku))` for products and variations (additive; matches `assertSkuFree`). Local data had no duplicates (checked on a copy). It applies on next app start against live data; if a live duplicate exists, the migration fails and nothing changes, so check for case-variant SKU duplicates before deploying.
- Package publish does not check that its game is live (product publish does). Decided: not a gap to fix. MASTER_SPEC does not require it, and checkout calls `assertProductBuyable` with game liveness, so an inactive game's package cannot be bought.

- Stock release on unpaid cancel: covered by the hybrid cancel test in `test:flows` (reserve 4, release back to 5). The customer cancel route calls the same `cancelUnpaidOrder`, so the route itself is not separately tested.
- Gateway refund crash window: if the process dies after the gateway accepts a refund but before settlement, the refund stays `pending` and blocks that amount. Admins can settle it from the order page (Stage 4). The orders list now shows a warning banner with the count of pending gateway refunds (`countPendingGatewayRefunds`), so stuck refunds are visible without opening each order. There is no automatic retry or age-based alert.
- Rate limiter is in-memory and per-process. Kept as is on purpose: `lib/rate-limit.ts` is designed for a single VPS, MASTER_SPEC does not require shared limits, and a database-backed limiter would add a write to every login and order request. Revisit only if the app moves to multiple instances.
- Spec overlap resolved: `PRODUCT_MANAGEMENT_SPEC.md` was an identical copy of `ROADMAP.md`; both spec files are now pointers. Precedence is recorded in `DECISIONS.md` (Document Precedence).

## Next Exact Action

Browser review of `/admin/orders` (done with an admin login supplied by the user; nothing stored): Quick view drawer sections render (Customer, Payment, Items, Change Status); bulk-select bar shows "1 selected" and works. Bulk-select bar changed from dark to light (orange-tint, `components/admin/orders-table.tsx`); tsc and eslint clean. The pending-refund banner was not visible (0 pending). Narrow-width card layout and desktop table (1280px) both seen in the browser; the table scrolls horizontally at this width with the sidebar open, which is acceptable. The admin password was shared in chat; the user should rotate it. Owner decision: keep the dark black-and-orange sidebar (no change). Owner confirmed a wallet refund works end to end. Re-run this session: tsc clean; flows 115/115 (includes gateway refund success/failure cases), lifecycle 55/55, catalog 23/23, dashboard 48/48. Still open: review the gateway refund path in `lib/services/refunds.ts` against the recovered original gateway section.

## Session Handoff

Stages 1–5 implemented, migrations 0010–0011 additive and applied in tests, all four suites green (flows 115/115, lifecycle 55/55, catalog 23/23, dashboard 48/48). Admin UI changes (Stages 4–5, regional variant form, orders page redesign) were type-checked but not viewed in a browser; the admin login was not available. Next: human browser review of `/admin/orders`, then the Known Issues above.

## Fix: admin products page 500
- Cause: `RowAction` (`components/admin/row-action.tsx`, client component) received lucide icon components from the server page, which Next.js rejects.
- Fix: `RowAction` takes `icon: "copy" | "archive"` and maps to the icon internally; `app/(admin)/admin/products/page.tsx` updated. tsc and eslint clean; `/admin/products` renders 25 rows in the browser.
- Not tested: clicking Duplicate/Archive (writes to live data).

## Admin redesign request (Parts 1–16): Stage 4 numeric order numbers
- Done: migration `db/migrations/0013_order_number.sql` (+ journal entry). Adds sequence `order_number_seq` starting at 121212, column `orders.order_number` (integer, not null, default nextval), unique index. Existing orders backfilled in id order.
- `db/schema.ts` column added. Admin search matches a numeric order number exactly; list and detail show `#<orderNumber>`; customer order list shows `Order #<orderNumber>`.
- `publicId` (`GT-…`) kept for URLs and payment callbacks.
- Verified: migration run on a copy of local data (2 orders → 121212, 121213, no duplicates). Sequence gap of one after backfill is harmless. Test suites: flows 115/115, lifecycle 55/55, dashboard 48/48, catalog 23/23; tsc clean.
- Not yet added: numeric order number in notifications/receipts (none found in code); migration snapshot file not created for 0013.
- Remaining from the redesign request: Stages 2 (design system), 3 (orders list redesign), 5–6 (order workspace, refund/status/notes/timeline UI), 7–9 (product, variation, category), 10 (other pages), 11 (responsive/perf), 12 (full browser test). Not started.

## Admin redesign: Stage 2 (design system and admin shell)
- Audit: shared tokens in `components/admin/ui.tsx` (`Card`, `PageHeader`, `thCls`/`tdCls`, `selectCls`, `btnPrimary`/`btnSecondary`/`btnDanger`, `SearchBar`, `Pagination`) were already consistent. Shell is a dark `bg-primary` sidebar with a mobile drawer. Sidebar colour kept (owner decision).
- Done: `Breadcrumbs` component and `PageHeader` `crumbs` prop in `components/admin/ui.tsx` (not yet used on pages; Stage 10). Sidebar: active link `aria-current="page"`, Escape closes the mobile drawer, drawer labelled "Admin navigation".
- Order-number follow-up: orders table desktop and mobile rows show `#<orderNumber>`, not `GT-…`.
- Dev server restarted once so migration 0013 applied to local data.
- Verified in browser: orders page loads; `?q=121212` returns the matching order; sidebar active state present. Escape-to-close on the mobile drawer not checked in a narrow viewport.
- Noticed, not changed: the "N orders in total" line and status tab counts ignore the search term.

## Order numbers start at 1
- Migration `db/migrations/0014_order_number_from_one.sql`: renumbers existing orders by id (1, 2, …), resets `order_number_seq` so the next order is MAX+1, minimum value 1. Migration 0013 remains as applied.
- Local data: #121212 → #1, #121213 → #2. Next order gets #3.
- Note: this changes numbers already shown to customers (they only appeared after the 0013 change today).
- Verified: flows 115/115; orders page shows #2 and #1.

## Admin redesign: Stage 3 (orders list)
- Orders page keeps search and status tabs only. Extra filter controls (payment, fulfillment, date range, sort) were removed at the owner's request, along with their URL handling and the sort/date query code.
- Orders table has a Fulfillment column next to Status.
- Flow tests: 115/115 pass.
- Not done: copy-order-number button.

## Admin redesign: Stages 5–6 (order workspace, partial)
- Order detail header shows `#<orderNumber>` with the public order ID and a copy button.
- New Fulfillment card (`app/(admin)/admin/orders/[id]/page.tsx`): method (from the configured provider), fulfillment status, processing time (first `processing` history entry to completion, or "so far"), latest supplier reference with copy, and last error from the latest failed attempt.
- Checked: tsc and eslint clean; order detail loads in the browser with no errors.
- Not done yet: product image and game/region on order items, customer previous-orders list, payment verification/timeline source labels, context-aware fulfillment action buttons (retry, hold, resume), and masking of sensitive credentials.
- Order detail customer block: name, email, and phone are separate rows (no longer on one line).
- Paid orders now move to Processing automatically (`startProcessingAfterPayment` in `lib/services/orders.ts`), called after commit from wallet checkout and gateway verification. An automatic provider then runs; success → Completed, failure → Failed, no provider → stays Processing for manual completion. History entries have no admin (`changedByType: system`).
- Processing orders are not restocked on full refund (supplier may already have delivered). Tests updated accordingly.
- Order detail (Part 16): product thumbnail and game name on each item; "Customer's other orders" card (latest 5, `getCustomerRecentOrders`). Verified on `/admin/orders/34`; tsc and eslint clean.
- Orders list: whole row opens quick view (controls inside a row are ignored); bulk status options limited to transitions every selected order allows; row status select starts on "Choose status…" (no implied target); Final orders show no status control. Server rules unchanged (`applyOrderStatusChange`). tsc and eslint clean; verified in browser.
- Order audit trail: every status, payment and refund change writes an order history row with actor (admin name and role, System, or Customer) and a note; `recordStatus` supplies a default note when none is given. Added history rows for refund requests, gateway refund failures, failed pending refunds and partial refunds. Timeline shows "No note recorded" for legacy rows written before this change. Verified in flows test (117/117), lifecycle 55/55, dashboard 48/48, catalog 23/23.
- Orders quick-view drawer rebuilt as `components/admin/order-quick-view.tsx`: payment status in header; customer name, email and phone with copy; total spent and paid order count; previous orders count (`countCustomerOtherOrders`); payment method, transaction ID, sender, paid and verified times; items with image, SKU copy and player fields; status change; customer messages list with send (customer-visible note via `addOrderNoteAction`, which now also revalidates the list). Checked in browser on `?view=34`; tsc and eslint clean. Not tested: sending a message, narrow-width layout.
- Orders list simplified: per-row "Change status" control and Fulfillment column removed. Bulk bar lists every order status; the server still checks transitions per order and reports skipped orders. "Refunded" in bulk is refused by the server (refunds go through the refund workflow). tsc and eslint clean; checked in browser (columns and bulk options).
- Order detail layout aligned with the brief (real data, no localStorage): single Customer row (name link, email, phone), Total spent, Total "via <method>", Transaction, Created, Paid, Completed; item title "Product × qty" with "SKU: … · price"; Status change placeholder "— select —", "Update status" disabled until chosen, form clears after success; note checkbox "Note visible to customer" checked by default; Payments columns ID, Amount, Status, Method, TrxID, Sender, Date (+ verify action); notes "date · author — text"; "← Orders" link below the cards. tsc and eslint clean; desktop checked in browser.
- Order detail: status panel shows all seven statuses (quick buttons and select); statuses not allowed from the current one are disabled with the reason. The server still enforces transitions. "Customer's other orders" card removed. Notes rebuilt WordPress-style: composer at top with a Private note / Note to customer selector, newest first, tagged bubbles, per-note Delete. Fixed the payments "Actions" header that caused horizontal scroll at narrow widths. tsc and eslint clean; desktop checked in browser.

## Admin redesign: full Modern GONTOP workspace refresh
- Rebuilt the admin shell with a collapsible dark brand sidebar, clearer navigation groups, responsive drawer, permission-aware quick-create menu, storefront shortcut, and a global command palette (`Ctrl/Cmd+K` or `/`). The command palette navigates all allowed sections and sends typed terms directly to order, product, or customer search.
- Reworked the shared admin design system (`components/admin/ui.tsx`): page hierarchy, cards, metrics, inputs, buttons, compact pagination, search/filter bars, empty states, focus treatment, reduced-motion support, and consistent responsive spacing.
- Rebuilt the dashboard around daily operations: greeting and quick actions, linked KPIs, seven-day revenue chart, actionable payment/processing/hold/failure queues, recent orders, and a combined customer/wallet activity feed.
- Rebuilt the orders queue and order header. Orders now have compact status tabs, responsive list/card views, copyable order numbers, payment/fulfillment context, a responsive viewport-anchored quick-view side drawer, and a sticky bulk bar that only offers transitions valid for at least one selected order. The drawer is portaled to `document.body` above the complete admin shell, and the page entrance animation is opacity-only, so the overlay cannot be clipped by the desktop content box or interrupted by either navigation bar.
- Simplified the lifecycle to WooCommerce-style semantics: unpaid orders are `Pending Payment`; receiving payment moves them directly to `Processing`; automatic fulfillment or an admin moves them to `Completed`. The obsolete order-level `Paid` state was removed (payment remains separately tracked), existing `Paid` rows/history are migrated safely, and imports map legacy paid orders to processing.
- Expanded order search to customer name/email/phone, order/public number, product/SKU, player fields, imported item data, transaction ID, sender number, and invoice ID. The count query uses the same customer join, so filtered pagination remains correct.
- Rebuilt customer, payment, and wallet lists with responsive mobile views, filter-aware counts, compact pagination, and direct actions. Customer and wallet searches include phone; payments can be searched by customer/invoice/transaction/sender and filtered by status.
- Added product CSV export to the main product header, linked product KPI filters, resettable catalogue filters, a sticky bulk toolbar, and fixed the product editor's storefront URL (`/product/[slug]`).
- Redesigned admin sign-in, added route-level loading and error states, improved copy/logout/form pending feedback, and prevented duplicate form submissions while an action is running. Login uses a full navigation plus a native form fallback. Arena's opt-in preview build is origin-allowlisted, non-cacheable at sign-in, and uses secure partitioned cookies with an isolated, short-lived browser-fingerprint fallback for embedded browsers that reject all third-party cookies; normal production authentication remains unchanged.
- Verification: all admin routes smoke-tested over authenticated HTTP, production build clean, TypeScript clean, ESLint clean; flows 126/126 (including the simplified order lifecycle, expanded admin search, and search-aware status counts), lifecycle 55/55, catalogue 23/23, dashboard 48/48.

## Admin products redesign: responsive directory, editor, and package workspace
- Rebuilt `/admin/products` around a compact state navigator, one primary search, collapsible advanced filters, removable active-filter chips, responsive desktop rows/mobile cards, readiness indicators, compact row actions, and a selection-only bulk toolbar. Duplicate desktop/mobile checkboxes are deduplicated before bulk actions.
- Reorganized product create/edit into anchored Storefront content, Organization, Category placement, Customer input, Fulfillment guidance, and Visibility sections. The editor now exposes the existing product type, featured state, category order, top-up method, customer fields, and private fulfillment-note contracts without changing their server rules.
- New products now return directly to their saved editor and package setup instead of leaving the user on an unlinked create form.
- Replaced the cramped package sidebar with a full-width responsive package workspace: scan-friendly package library, batch lifecycle/availability/price operations, bulk draft creation, compact lifecycle control, duplication/deletion, and a structured package form for pricing, compare-at price, sale windows, stock, availability, image/content, top-up inheritance, and customer-field overrides.
- Product editing now uses `getProductAdmin`, preserving ordered packages and category placements on save. Existing validation, permissions, lifecycle gates, SKU uniqueness, simple-product limits, deletion protections, revalidation, and storefront integration remain authoritative.
- Verification: ESLint clean, TypeScript clean, `git diff --check` clean, production build clean, authenticated HTTP smoke checks passed for the product directory, combined filters, create page, product editor, and package editor. All 252 tests pass: catalogue 23/23, lifecycle 55/55, products dashboard 48/48, flows 126/126.

## Admin products follow-up: tabbed editor
- Replaced the long product editor with a mounted tab system: Product and Packages workspaces at the top; Content, Organization, Customer input, and Operations tabs inside the product form; Details, Pricing, Inventory, Customer input, and Content tabs inside each package form. Hidden panels remain mounted, so switching tabs does not discard unsaved values and every existing save contract is still submitted together.
- Package links and the post-create redirect now open `?tab=packages`; the selected workspace survives reloads and package selection. Tab controls are responsive, keyboard navigable, and the main workspace tabs remain visible while scrolling.
- Removed redundant editor copy, including “Changes affect this package only,” and shortened package headings. Accidental imported hexadecimal hash suffixes are removed from package display names and from the editable value on the next save (for example, `1090-diamonds-<hash>` becomes `1090-diamonds`).
- Verification: ESLint, TypeScript, production build, authenticated product/package route checks, selected-tab SSR checks, and `git diff --check` pass. All 252 tests remain green.

## Admin catalogue follow-up: Categories and Popular Games
- Removed the standalone Games item from admin navigation. `/admin/games` remains as a compatibility route and redirects old links (including edit links) into the Categories workspace; Quick Create opens the new game library directly.
- Split Categories into two explicit top-level tabs: Product categories and Popular Games. Product categories now show only product assignment controls; Popular Games shows only the special parent-game card configuration, eliminating the former mixed “card type,” games, and products form.
- Added Popular Games subtabs for Homepage section and Game library & regions. The homepage picker accepts top-level game cards only, marks families capable of opening the variants modal, and preserves existing regional assignments by mapping them to their parent card on the next save.
- Rebuilt game management as a grouped library inside Popular Games: each top-level card owns its regional variants, product counts and state are visible together, and the add/edit form clearly distinguishes a Popular game card from a regional modal variant.
- Existing category/game validation, deletion protections, product relationships, modal storefront behavior, permissions, audit logs, and storefront revalidation remain unchanged.
- Verification: ESLint, TypeScript, production build, authenticated HTTP checks for both category tabs and both Popular Games subtabs, legacy Games-route redirect checks, and `git diff --check` pass. All 252 tests remain green.

## Admin organization follow-up: remaining workspaces
- Added permission-aware contextual workspace navigation for Customers & Money, Commerce, and System administration. Related records are now reachable without relying on disconnected sidebar entries; existing routes and RBAC remain authoritative.
- Customers: account-state summaries and filters, global wallet context, clearer order/wallet relationships, and a reorganized profile with Overview, Orders, and Wallet ledger tabs. Lifetime order/spend summaries are computed server-side. Account disabling and wallet adjustment keep their existing permission, confirmation, validation, audit, locking, and revalidation paths.
- Payments: completed-volume and flow summaries, search + flow + status filtering, related customer/order links, and an explicit server-verification safety explanation. Payment rows now expose their existing customer/order relationships; verification behavior was not weakened.
- Wallets: separate Customer balances and immutable Ledger activity views, funded/zero-balance filters, transaction context, and direct profile/adjustment links. Added read-only admin ledger querying while preserving `applyWalletEntry` locking, non-negative balance enforcement, mandatory adjustment reasons, and audit records.
- Reports: split revenue, product performance, and inventory risk into clear report tabs; clarified recognized-revenue scope and added links back to source records.
- Banners and top-up methods: added commerce context, useful state/usage summaries, scan-friendly libraries, sticky editors, clearer ordering and assignment consequences, and responsive presentation. Top-up methods now show product-default and package-override usage before deletion.
- Data migration: replaced three stacked import forms with Products, Customers, Orders, and Guide tabs; added the recommended sequence and explicit safety guarantees. Preview-before-confirm, duplicate skipping, validation, and wallet isolation remain unchanged. Product export remains available from the product panel.
- Settings and team access: reorganized settings by identity, limits, polling, feature switches, gateway health, and server-only environment; grouped staff permissions by operational domain and added role/access/login summaries. All original action contracts and last-owner safeguards remain intact.
- Service coverage added for customer summaries, customer lifetime metrics, payment status/flow summaries, wallet balance context, and cross-customer ledger filtering.
- Verification: ESLint clean, TypeScript clean, production build clean, `git diff --check` clean, and authenticated HTTP smoke checks passed for all redesigned routes, filters, report tabs, migration tabs, and all three customer-profile tabs. Tests: flows 134/134, lifecycle 55/55, catalogue 23/23, dashboard 48/48 — 260/260 total.
