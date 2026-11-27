# MASTER PROJECT SPECIFICATION

## Project

Complete Product Management and Digital Top-Up Order Management Overhaul.

## Objective

Transform the existing digital gaming top-up platform into a professional, secure, efficient and fully integrated system.

Preserve the existing website design, business logic and working functionality unless an improvement is explicitly required.

## Product Management

Implement:

- Complete product listing dashboard.
- Search, combined filters, sorting and pagination.
- Product creation and editing.
- Simple and variable products.
- Independent variation management.
- Product and variation SKUs.
- Regular and sale pricing.
- Image uploads and media management.
- Game and regional variant assignments.
- Multiple homepage category assignments.
- Product publication and availability controls.
- Configurable top-up methods and customer input fields.
- Product preview and publishing validation.
- Bulk actions.
- CSV import and export.

Products and variations must be independent database entities where appropriate.

Publication and availability must be separate. All storefront visibility and purchase eligibility must be enforced server-side.

Preserve the existing Popular Games and normal homepage category behavior.

## Digital Top-Up Order Management

Build a modern order listing dashboard and completely improve the order details dashboard.

Orders must support:

- Payment pending.
- Paid.
- Processing.
- Completed.
- Failed.
- On hold.
- Cancelled.
- Refunded.

Keep payment status separate from fulfillment status.

Support both automatic supplier fulfillment and manual admin fulfillment.

Manual fulfillment must allow admins to start processing, complete, fail, hold, resume and safely retry orders.

The order details dashboard must include:

- Order overview.
- Product and variation snapshots.
- Customer information.
- Player ID and server ID.
- Submitted top-up information.
- Payment and transaction information.
- Wallet payment details.
- Fulfillment controls.
- Processing duration.
- Order timeline.
- Internal notes.
- Admin activity history.
- Refund information.

Preserve historical order prices and product information.

## Financial Integrity

Preserve existing payment and wallet integrations.

Require server-side payment verification, idempotency, duplicate prevention, atomic wallet transactions and safe refunds.

Never trust browser-submitted prices or payment status.

## Technical Requirements

- Inspect existing architecture before implementation.
- Reuse existing database models, components and APIs where appropriate.
- Avoid duplicate entities and disconnected CRUD interfaces.
- Use safe database migrations.
- Preserve existing orders, payments and wallet records.
- Enforce server-side permissions and validation.
- Avoid N+1 queries and unnecessary polling.
- Optimize for modest VPS hosting.
- Keep hosting and storage portable.
- Never introduce physical shipping or unnecessary inventory functionality.

## UI/UX

Preserve the existing admin visual identity.

Improve the quality, organization, usability and responsiveness of product and order management.

Include proper loading, empty, success and error states.

No fake buttons, mock data or decorative controls without functionality.

## Implementation Order

1. Architecture audit.
2. Database and relationship improvements.
3. Product lifecycle and availability.
4. Product listing dashboard.
5. Product editor and media management.
6. Variation management.
7. Pricing and top-up configuration.
8. Preview and publishing.
9. Storefront integration.
10. Import/export.
11. Order architecture improvements.
12. Order listing dashboard.
13. Order details dashboard redesign.
14. Automatic and manual fulfillment.
15. Payment and wallet verification.
16. Reporting.
17. Security, performance and end-to-end testing.

## Definition of Done

Both systems must be fully implemented and integrated.

Admins must be able to manage products and variations, control availability, process orders, verify payments and fulfill digital top-ups through a coherent professional dashboard.

No incomplete controls, mock functionality or frontend-only security.

Preserve existing data and working functionality.
