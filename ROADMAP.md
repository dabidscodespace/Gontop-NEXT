# MAJOR PROJECT: Complete Product Management & Digital Top-Up Order Management Overhaul

Build a complete, professional management system for an existing digital gaming top-up platform.

This project includes two major systems:

1. Complete Product Management System.
2. Complete Digital Top-Up Order Management System.

This is a functional, architectural and UI/UX improvement, not merely a visual redesign.

**IMPORTANT:** Inspect the existing application before making changes. Review the database, product models, variations, APIs, admin dashboard, storefront, orders, payment integrations, wallet and fulfillment logic.

Improve the existing system instead of creating disconnected CRUD interfaces or duplicate entities.

Treat this specification as the source of truth. Implement every section sequentially without stopping for approval between phases.

---

# PART A — PRODUCT MANAGEMENT SYSTEM

## 1. Product Management Dashboard

Build a professional product management dashboard.

Product listing should display:

- Product image and name.
- Product type.
- Parent game and regional variant.
- SKU.
- Base price or price range.
- Variation count.
- Publication status.
- Availability status.
- Category assignments.
- Last updated date.
- Quick actions.

Include:

- Search by product name, SKU and variation SKU.
- Filters for publication, availability, type, game, variant and category.
- Combined filters.
- Server-side sorting and pagination.
- Bulk selection and actions.
- Accurate product statistics.
- Product readiness indicators showing exactly what needs fixing.

Bulk actions:

- Publish/unpublish.
- Enable/disable.
- Mark available/unavailable.
- Archive.
- Safe deletion where permitted.
- Category assignment.
- Display-order management.

Admin must see all products, including drafts, disabled and archived products.

## 2. Product Creation and Editing

Build a properly organized product editor using the existing admin design system.

Include these sections:

1. General information.
2. Product images and gallery.
3. Game and category assignment.
4. Product type and variations.
5. Pricing.
6. Top-up configuration.
7. Customer instructions.
8. Publication and availability.
9. SEO and URL settings.
10. Preview and publishing.

General fields:

- Product name.
- Unique slug.
- Short and full description.
- SKU.
- Product type.
- Parent game.
- Regional variant.
- Homepage category assignments.
- Featured status.
- Display order.

Support draft saving, editing, publishing and archiving.

## 3. Product Media Management

Provide:

- Image upload.
- Image preview.
- Replace and remove.
- Existing media selection.
- Primary image selection.
- Optional image gallery.
- File type and size validation.
- Upload progress and error feedback.

Use the existing storage abstraction. Never store image files as database blobs.

## 4. Product Types and Variations

Support two product types.

**Simple product:** One purchasable configuration and price.

**Variable product:** Multiple independently purchasable variations.

Example: PUBG Mobile UC packages:

- 60 UC.
- 325 UC.
- 660 UC.
- 1800 UC.
- 3850 UC.

Each variation must have independent:

- Name and SKU.
- Regular and sale price.
- Image override.
- Description.
- Publication status.
- Availability status.
- Display order.
- Customer input requirements.
- Optional fulfillment configuration.

Build variation management inside the product editor.

Admin should be able to:

- Create, edit and duplicate variations.
- Delete safely.
- Publish/unpublish.
- Enable/disable.
- Change pricing and SKU.
- Replace images.
- Reorder.
- Bulk edit.
- Search and filter.

Provide efficient bulk variation creation with proper independent database records and validation.

Do not represent variations as simple text options.

## 5. Publication and Availability

Keep publication and availability separate.

Publication states:

- Draft.
- Published.
- Archived.
- Pending Review if moderation is supported.

Availability states:

- Available.
- Unavailable.
- Disabled.

Products and variations must have independent states.

A product or variation must not be purchasable unless all required eligibility conditions are satisfied.

Rules:

- Draft, unpublished and archived products are hidden.
- Draft, unpublished, archived and disabled variations are hidden.
- Unavailable products cannot be purchased.
- Parent game or regional variant restrictions must be respected.
- Variable products with no eligible variations must not be purchasable.
- Parent status changes must not overwrite individual variation states.

Create one reusable server-side eligibility service used by every public storefront API and interface.

Never rely on frontend hiding alone.

## 6. Pricing Management

Support:

- Regular price.
- Sale price.
- Optional sale dates.
- Variation-specific pricing.
- Bulk price changes.
- Price validation.
- Currency formatting.
- Price history or audit history.

Rules:

- Sale price cannot exceed regular price.
- Prices must be validated server-side.
- Never trust browser-submitted prices.
- Calculate new order totals using database prices.
- Existing orders must retain their original purchased prices.

## 7. Top-Up Configuration

Support configurable top-up methods:

- UID Top-Up.
- Login Top-Up.
- Future methods.

Configure customer fields at product level with optional variation overrides.

Field settings:

- Label and key.
- Input type.
- Placeholder.
- Required/optional.
- Validation rules.
- Help text.
- Display order.

Examples:

UID:

- Player ID.
- Server ID.

Login:

- Login identifier.
- Required additional information.
- Instructions.

Do not determine top-up requirements from category names.

Protect sensitive customer login information. Mask it by default, restrict access and never log credentials in plaintext.

## 8. Product Organization

Integrate with existing game and category management.

Support:

- Parent game assignment.
- Regional variant assignment.
- Multiple homepage category assignments.
- Featured products.
- Category-specific display order.
- Safe reassignment.

Preserve the distinction between:

- Popular Games parent games.
- Regional variants.
- Normal homepage category products.
- Actual purchasable products and variations.

Products appearing in multiple categories must reference the same underlying records.

Preserve existing navigation behavior:

- Popular Games with enabled regional variants opens a regional selection modal.
- Selecting a regional variant opens its product page.
- Parent games without variants open their product page directly.
- Normal homepage category cards navigate directly to product pages.
- Do not introduce unwanted intermediate pages or universal modals.

## 9. Product Preview and Publishing

Allow admins to:

1. Create drafts.
2. Configure product information.
3. Upload images.
4. Configure prices.
5. Create variations.
6. Configure customer fields.
7. Preview the storefront appearance.
8. Validate readiness.
9. Publish.

Previewing drafts must never make them publicly purchasable.

Show specific validation errors before publishing.

## 10. Fulfillment Configuration

Products should support:

- Manual fulfillment.
- Future supplier API fulfillment.
- Product-level fulfillment settings.
- Variation-level overrides.
- Admin fulfillment instructions.
- Availability controls.

Do not invent supplier APIs.

Build an extensible architecture for future integration.

## 11. Product Import and Export

Support CSV import/export for:

- Products.
- Variations.
- SKUs.
- Prices.
- Images or image references.
- Categories.
- Game and regional variant assignments.
- Publication and availability.
- Supported top-up configuration.

Import workflow:

1. Upload.
2. Map columns.
3. Validate.
4. Preview.
5. Detect duplicates.
6. Confirm.
7. Process safely.
8. Generate an import report.

Never overwrite existing products unexpectedly.

---

# PART B — DIGITAL TOP-UP ORDER MANAGEMENT

## 12. Order Management Architecture

Audit the existing order, customer, payment, wallet and fulfillment models.

Improve the architecture without breaking existing records.

This is a digital gaming top-up platform, not a physical shipping store.

Do not introduce unnecessary:

- Shipping addresses.
- Delivery addresses.
- Shipping fees.
- Physical inventory.
- Shipment tracking.

Orders must preserve snapshots of:

- Product name.
- Product SKU.
- Variation name and SKU.
- Game and regional variant.
- Purchased price.
- Customer-submitted information.
- Relevant top-up configuration.

Product changes must never overwrite historical order data.

## 13. Order Lifecycle and Status Architecture

Keep payment status and fulfillment status separate.

An order can be paid but still processing.

Suggested payment states:

- Pending.
- Paid.
- Failed.
- Refunded.
- Partially Refunded, if supported.

Suggested fulfillment states:

- Pending.
- Processing.
- Completed.
- Failed.
- On Hold.
- Cancelled.

The overall order status should be derived consistently from the payment and fulfillment states where appropriate.

Support valid state transitions only.

Do not allow arbitrary frontend status changes to bypass business rules.

## 14. Instant and Manual Fulfillment

The platform must support two fulfillment methods.

**Automatic fulfillment**

- Receive an eligible paid order.
- Submit it through a configured supplier integration.
- Verify supplier response.
- Update fulfillment status.
- Record supplier reference IDs.
- Mark completed only after verified successful delivery.
- Handle failures safely.
- Prevent duplicate fulfillment.

**Manual fulfillment**

- Admin opens a paid pending order.
- Starts processing.
- Reviews customer top-up information.
- Performs the top-up manually.
- Marks completed or failed.
- Adds internal notes.
- Records an external transaction/reference ID where available.

Admin controls:

- Start processing.
- Complete order.
- Mark failed.
- Place on hold.
- Resume processing.
- Retry failed fulfillment safely.

Do not automatically mark an order completed simply because payment succeeded.

Payment confirmation and successful top-up delivery are separate events.

## 15. Modern Order Listing Dashboard

Completely improve the existing order listing interface.

Display:

- Order ID.
- Customer.
- Game and package.
- Order amount.
- Payment status.
- Fulfillment status.
- Fulfillment method.
- Creation date.
- Processing duration.
- Quick actions.

Add:

- Search by order ID, customer, transaction ID and relevant identifiers.
- Combined filters.
- Date range filtering.
- Payment status filtering.
- Fulfillment status filtering.
- Game and product filters.
- Sorting.
- Server-side pagination.
- Safe bulk actions.
- Useful order statistics.

Summary statistics should include:

- Total orders.
- Awaiting payment.
- Paid orders awaiting fulfillment.
- Processing orders.
- Completed orders.
- Failed orders.
- Cancelled orders.
- Refunded orders.

Do not overload the interface with unnecessary decorative cards.

Make important pending orders easy to identify.

## 16. Complete Order Details Dashboard Redesign

This is a major UI/UX priority.

Redesign the entire order details experience into a professional operational workspace.

Use a clean information hierarchy and make frequently used actions easy to access.

### A. Order Header

Show:

- Order number.
- Creation date and time.
- Overall order status.
- Payment status.
- Fulfillment status.
- Order amount.
- Customer identification.
- Quick actions.
- Copy order ID.

### B. Order Items

Display:

- Product image.
- Product name.
- Game and regional variant.
- Variation/package.
- SKU.
- Purchased price.
- Quantity.
- Customer-submitted top-up details.

All information must come from historical order snapshots.

### C. Customer Information

Display:

- Customer name.
- Customer ID.
- Email and phone where available.
- Previous orders.
- Relevant customer notes.

Provide convenient copy actions for player IDs, server IDs and other top-up inputs.

Sensitive credentials must be masked by default and accessible only to authorized admins.

### D. Payment Information

Show:

- Payment provider.
- Transaction ID.
- Payment method.
- Payment amount.
- Verification status.
- Payment timestamp.
- Wallet usage where applicable.
- Refund information.
- Payment history.

Never trust an unverified payment callback.

### E. Fulfillment Workspace

This should be one of the most practical parts of the page.

Display:

- Automatic or manual fulfillment method.
- Fulfillment status.
- Processing duration.
- Fulfillment attempts.
- Supplier reference ID if applicable.
- Last error if fulfillment failed.
- Fulfillment history.

Provide context-aware actions:

- Start processing.
- Mark completed.
- Mark failed.
- Place on hold.
- Resume.
- Retry safely.

Require confirmation for sensitive or irreversible operations.

### F. Order Timeline

Show a chronological history of:

- Order creation.
- Payment initiation.
- Payment confirmation.
- Fulfillment initiation.
- Processing.
- Completion.
- Failure.
- Cancellation.
- Refund.
- Manual admin actions.

Each event should include timestamp and source.

### G. Admin Notes and Activity

Provide:

- Internal notes.
- Admin identity.
- Previous and new status.
- Action timestamp.
- Refund and fulfillment activity.
- Relevant audit records.

Internal notes must never appear to customers.

## 17. Processing Timer and Operational Tools

Show how long an order has been:

- Awaiting payment.
- Awaiting fulfillment.
- Processing.

Highlight orders taking unusually long where appropriate.

Provide copy buttons for commonly used information.

Avoid excessive polling. Use efficient refresh strategies or event-driven updates where available.

## 18. Payment and Wallet Integrity

Preserve existing UddoktaPay and wallet integrations.

Ensure:

- Server-side payment verification.
- Idempotent payment callbacks.
- Duplicate prevention.
- Atomic wallet operations.
- No negative wallet balance.
- No duplicate refunds.
- Accurate transaction history.
- Server-side amount verification.
- Audit logs for admin financial actions.

Do not allow fulfillment before successful payment unless an explicitly authorized business rule permits it.

---

# PART C — INTEGRATION, SECURITY AND QUALITY

## 19. Storefront and Order Integration

Verify the entire customer journey:

1. Customer browses eligible products.
2. Customer selects an eligible variation.
3. Customer submits required top-up information.
4. Server validates product and variation.
5. Server calculates the actual price.
6. Order is created.
7. Payment is completed and verified.
8. Fulfillment begins automatically or manually.
9. Order is completed only after successful delivery.
10. Customer can see appropriate order status.

Prevent direct API manipulation, invalid product purchases and stale prices.

## 20. Admin Permissions and Security

Enforce granular server-side permissions for:

- Product management.
- Variation management.
- Order management.
- Payment viewing.
- Refunds.
- Wallet operations.
- Sensitive customer information.
- Fulfillment controls.

Maintain audit logs for important actions.

Protect against unauthorized access, injection, CSRF, XSS, unsafe uploads and rate-limit abuse.

## 21. Database Integrity

Ensure:

- Normalized product and variation relationships.
- Unique SKU and slug constraints.
- Explicit lifecycle states.
- Safe price storage.
- Correct foreign keys.
- Duplicate-free category assignments.
- Historical order snapshots.
- Safe deletion rules.
- Database transactions for related operations.
- Proper indexes for search and filtering.

Never delete historical order information when a product is archived or removed.

Create safe migrations. Never reset the production database.

## 22. Performance

Optimize:

- Product listing queries.
- Order listing queries.
- Order details loading.
- Search and filtering.
- Database indexes.
- API response sizes.
- Image loading.
- Caching.
- Storefront data fetching.

Avoid N+1 queries and excessive polling.

The application must work efficiently on a modest 2-core VPS.

Do not introduce unnecessary paid services or hosting-specific dependencies.

## 23. UI/UX Standards

Use the existing admin design system as the foundation.

Maintain:

- Existing visual identity.
- Typography.
- Colors.
- Spacing.
- Component consistency.

Improve the product and order management interfaces substantially.

Provide:

- Responsive desktop and mobile layouts.
- Accessible forms.
- Useful loading states.
- Empty states.
- Error feedback.
- Confirmation dialogs.
- Toast or inline notifications.
- Clear status indicators.
- Search and filters.
- Unsaved-change warnings.
- Useful breadcrumbs.

Avoid excessive nested modals, overcrowded forms, fake buttons and decorative elements without operational value.

## 24. Testing

Test complete product and order workflows.

Product tests:

- Simple product creation.
- Variable product creation.
- Independent variation states.
- Pricing changes.
- Publishing and archiving.
- Category assignments.
- Regional variants.
- Storefront visibility.
- Invalid direct purchase attempts.
- CSV import/export.

Order tests:

- Order creation.
- Payment pending.
- Successful payment.
- Failed payment.
- Automatic fulfillment success.
- Automatic fulfillment failure.
- Manual processing.
- Manual completion.
- Manual failure.
- On-hold and resume.
- Duplicate fulfillment prevention.
- Refund validation.
- Historical price preservation.
- Wallet payment integrity.
- Permission checks.
- Timeline and audit history.

Test desktop and mobile interfaces.

---

# PART D — IMPLEMENTATION ROADMAP

Execute these stages in order:

1. Existing architecture audit and backup preparation.
2. Product database and relationship improvements.
3. Product lifecycle and availability.
4. Product management listing dashboard.
5. Product editor and media management.
6. Variation management and bulk creation.
7. Pricing and top-up configuration.
8. Product preview and publishing workflow.
9. Storefront and product-page integration.
10. Product CSV import/export.
11. Order architecture audit and improvements.
12. Modern order listing dashboard.
13. Complete order details dashboard redesign.
14. Instant and manual fulfillment improvements.
15. Payment and wallet integration verification.
16. Order reporting and export.
17. Security, performance and end-to-end testing.

Implement sequentially. Do not wait for approval between stages.

If an implementation stage depends on an unresolved issue, investigate and fix it before proceeding.

Do not silently skip requirements.

# PART E — SESSION CONTINUITY

Maintain these project documents:

- `PRODUCT_MANAGEMENT_SPEC.md`
- `ORDER_MANAGEMENT_SPEC.md`
- `PROJECT_PROGRESS.md`

Use this master specification as the source of truth.

At each significant milestone, update `PROJECT_PROGRESS.md` with:

- Current stage.
- Completed tasks.
- Incomplete tasks.
- Modified files.
- Database migrations.
- API changes.
- Tests and results.
- Known issues.
- Exact next task.

If a session ends, continue in the next session by reading the progress file and inspecting the current code.

Never repeat completed work or assume a task was completed without checking.

# PART F — DEFINITION OF DONE

The project is complete only when:

- Product management works as a coherent system.
- Products and variations can be independently managed.
- Publication and availability rules are consistently enforced.
- Storefront and checkout use the correct product data.
- Orders preserve historical snapshots.
- Payment and fulfillment statuses remain separate.
- Instant and manual fulfillment both work.
- Admins can efficiently process orders through the redesigned order details workspace.
- Financial operations are secure and idempotent.
- Product and order dashboards are responsive and practical.
- No fake controls or mock implementations remain.
- Existing working features and data are preserved.
- End-to-end tests pass or remaining failures are clearly documented.

At final delivery, report:

1. Architecture problems identified.
2. Database changes and migrations.
3. Backend and API changes.
4. Product management improvements.
5. Order dashboard improvements.
6. Fulfillment and payment improvements.
7. Tests performed and results.
8. Remaining limitations or blockers.

**Do not stop at planning, mockups or partial CRUD functionality. Implement the complete system.**
