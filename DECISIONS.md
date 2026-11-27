# PROJECT DECISIONS

Record important architectural and business decisions here.

## Business Rules

- This is a digital gaming top-up store.
- No physical shipping or delivery addresses.
- Payment and fulfillment statuses are separate.
- Payment success does not automatically mean top-up completion.
- Both instant automatic and manual fulfillment are supported.
- Historical orders must preserve purchased product, variation and price snapshots.
- Products may belong to multiple homepage categories.
- Product and variation publication/availability are independently controlled.
- Existing storefront navigation behavior must be preserved.

## Technical Rules

- Prefer extending existing architecture over rewriting.
- Never reset production data.
- Use safe migrations.
- Validate all sensitive operations server-side.
- Protect customer credentials.
- Prevent duplicate payment, fulfillment and refunds.
- Preserve existing design identity.
- Avoid unnecessary API requests.

## Document Precedence

- `MASTER_SPEC.md` is the requirement summary for implementation work. Where it is silent, `ROADMAP.md` (the full Part A/B spec) applies.
- `DECISIONS.md` records the business rules and decisions that override either spec when they conflict; `PROJECT_PROGRESS.md` records what is implemented.
- `ORDER_MANAGEMENT_SPEC.md` and `PRODUCT_MANAGEMENT_SPEC.md` are pointers only. Their text was a copy of `ROADMAP.md`, now removed to avoid two copies drifting.

Add new decisions here with a short explanation whenever implementation requires them.

## Automatic processing after payment
- A successful payment moves the order straight to Processing. Automatic fulfillment runs at that point when a provider is configured. Manual fulfillment leaves the order in Processing until an admin completes it.
