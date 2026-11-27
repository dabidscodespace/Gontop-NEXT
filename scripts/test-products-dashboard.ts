/**
 * Phase 3 checks: product management dashboard service. Covers the full admin listing,
 * server-side search/filter/sort/pagination, readiness, counts, duplicate-as-draft and
 * bulk category assignment. Runs against a fresh embedded PostgreSQL (PGlite).
 *
 *   npm run test:dashboard
 */
import { rm } from "node:fs/promises";

const testDir = `.data/test-dashboard-${process.pid}-${Date.now()}`;
process.env.DATABASE_URL = `pglite://${testDir}`;
process.env.ADMIN_PASSWORD = "test-owner-password";

let passed = 0;
let failed = 0;

function check(name: string, condition: unknown, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectError(name: string, fn: () => Promise<unknown>, includes?: string) {
  try {
    await fn();
    check(name, false, "no error was thrown");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, !includes || message.includes(includes), message);
  }
}

async function main() {
  const schema = await import("../db/schema");
  const { getDb, closeDb } = await import("../lib/db/index");
  const adminCatalog = await import("../lib/services/admin-catalog");
  const { bulkProductCategorySchema, bulkProductActionSchema } = await import("../lib/validation");
  const { hashPassword } = await import("../lib/crypto");
  const { eq, and } = await import("drizzle-orm");

  const db = await getDb();
  const tag = Math.random().toString(36).slice(2, 8);
  const adminId = `admin-${tag}`;

  console.log("\n▸ Fixtures");
  const [parentGame] = await db
    .insert(schema.games)
    .values({ name: `Dash Parent ${tag}`, slug: `dash-parent-${tag}`, isActive: true })
    .returning();
  const [variant] = await db
    .insert(schema.games)
    .values({ name: `Dash Variant ${tag}`, slug: `dash-variant-${tag}`, isActive: true, parentId: parentGame.id, region: "BD" })
    .returning();
  const [topup] = await db.insert(schema.topupMethods).values({ key: `dash-${tag}`, name: "Player ID" }).returning();
  await db.insert(schema.adminUsers).values({
    id: adminId,
    email: `admin-${tag}@example.com`,
    name: "Dashboard Admin",
    passwordHash: hashPassword("admin-password"),
    role: "owner",
  });
  const [productsCategory] = await db
    .insert(schema.categories)
    .values({ name: `Dash Products ${tag}`, slug: `dash-products-${tag}`, layout: "products" })
    .returning();
  const [gamesCategory] = await db
    .insert(schema.categories)
    .values({ name: `Dash Games ${tag}`, slug: `dash-games-${tag}`, layout: "parent_games" })
    .returning();

  const fieldSet = [{ id: "player_id", label: "Player ID", type: "number" as const, required: true }];
  let counter = 0;
  async function makeProduct(
    label: string,
    gameId: number,
    status: "draft" | "published" | "archived",
    availability: "available" | "unavailable" | "disabled",
    options: { image?: string | null; topup?: boolean; productType?: "simple" | "variable" } = {},
  ) {
    counter += 1;
    const [row] = await db
      .insert(schema.products)
      .values({
        gameId,
        name: `${label} ${tag}`,
        slug: `dash-${label.toLowerCase().replace(/\W+/g, "-")}-${tag}-${counter}`,
        price: "100",
        fields: fieldSet,
        status,
        availability,
        productType: options.productType ?? "simple",
        image: options.image === undefined ? "/assets/test.png" : options.image,
        topupMethodId: options.topup === false ? null : topup.id,
      })
      .returning();
    return row;
  }
  async function makeVariation(productId: number, sku: string, status: "draft" | "published" = "published", price = "100") {
    const [row] = await db
      .insert(schema.variations)
      .values({ productId, name: `Pack ${sku}`, sku, price, sortOrder: 0, status, availability: "available" })
      .returning();
    return row;
  }

  const before = await adminCatalog.listProductsAdmin({ pageSize: 100 });

  const live = await makeProduct("Dash Live", parentGame.id, "published", "available");
  await makeVariation(live.id, `LIVE-${tag}`, "published", "250");
  const draftReady = await makeProduct("Dash Draft Ready", variant.id, "draft", "available");
  await makeVariation(draftReady.id, `DRAFTREADY-${tag}`, "published", "150");
  const draftNoImage = await makeProduct("Dash Draft Bare", parentGame.id, "draft", "available", {
    image: null,
    topup: false,
    productType: "variable",
  });
  const disabledOne = await makeProduct("Dash Disabled", parentGame.id, "published", "disabled");
  const unavailableOne = await makeProduct("Dash Unavailable", parentGame.id, "published", "unavailable");
  const archivedOne = await makeProduct("Dash Archived", parentGame.id, "archived", "available");
  await makeVariation(archivedOne.id, `ARCH-${tag}`, "published", "900");

  console.log("\n▸ Admin listing and counts");
  const all = await adminCatalog.listProductsAdmin({ pageSize: 100 });
  const ids = new Set(all.rows.map((row) => row.id));
  check(
    "listing includes every lifecycle state",
    [live, draftReady, draftNoImage, disabledOne, unavailableOne, archivedOne].every((row) => ids.has(row.id)),
  );
  const delta = (key: keyof typeof all.summary) => all.summary[key] - before.summary[key];
  check("total count rises by the six new products", delta("total") === 6, `delta=${delta("total")}`);
  check("published count is accurate", delta("published") === 3, `delta=${delta("published")}`);
  check("draft count is accurate", delta("draft") === 2, `delta=${delta("draft")}`);
  check("archived count is accurate", delta("archived") === 1, `delta=${delta("archived")}`);
  check("disabled count is accurate", delta("disabled") === 1, `delta=${delta("disabled")}`);
  check("unavailable count is accurate", delta("unavailable") === 1, `delta=${delta("unavailable")}`);

  console.log("\n▸ Search");
  const bySku = await adminCatalog.listProductsAdmin({ search: `LIVE-${tag}` });
  check("search matches a package SKU and returns its parent", bySku.rows.some((row) => row.id === live.id));
  const byName = await adminCatalog.listProductsAdmin({ search: `Dash Draft Ready ${tag}` });
  check("search matches product name", byName.rows.length === 1 && byName.rows[0].id === draftReady.id);
  const byGame = await adminCatalog.listProductsAdmin({ search: `Dash Parent ${tag}` });
  check("search matches the parent game name", byGame.rows.some((row) => row.id === live.id));
  const byRegion = await adminCatalog.listProductsAdmin({ search: `Dash Variant ${tag}` });
  check("search matches the regional variant name", byRegion.rows.some((row) => row.id === draftReady.id));
  const wildcard = await adminCatalog.listProductsAdmin({ search: "%" });
  check("LIKE wildcards are escaped", wildcard.total < all.total, `matched ${wildcard.total}`);

  console.log("\n▸ Filters");
  const drafts = await adminCatalog.listProductsAdmin({ status: "draft", search: tag, pageSize: 100 });
  check("status filter returns only drafts", drafts.rows.length > 0 && drafts.rows.every((row) => row.status === "draft"));
  const unavailable = await adminCatalog.listProductsAdmin({ availability: "unavailable", search: tag, pageSize: 100 });
  check("availability filter returns only unavailable", unavailable.rows.length === 1 && unavailable.rows[0].id === unavailableOne.id);
  const variable = await adminCatalog.listProductsAdmin({ type: "variable", search: tag, pageSize: 100 });
  check("type filter returns only variable products", variable.rows.length === 1 && variable.rows[0].id === draftNoImage.id);
  const byParentGame = await adminCatalog.listProductsAdmin({ gameId: parentGame.id, search: tag, pageSize: 100 });
  check("game filter includes products on regional variants", byParentGame.rows.some((row) => row.id === draftReady.id));
  const byVariant = await adminCatalog.listProductsAdmin({ variantId: variant.id, search: tag, pageSize: 100 });
  check("variant filter returns only that variant's products", byVariant.rows.length === 1 && byVariant.rows[0].id === draftReady.id);
  await db.insert(schema.categoryProducts).values({ categoryId: productsCategory.id, productId: live.id, sortOrder: 0 });
  const byCategory = await adminCatalog.listProductsAdmin({ categoryId: productsCategory.id, search: tag, pageSize: 100 });
  check("category filter returns only linked products", byCategory.rows.length === 1 && byCategory.rows[0].id === live.id);
  const combined = await adminCatalog.listProductsAdmin({ status: "published", availability: "disabled", search: tag, pageSize: 100 });
  check("combined filters apply together", combined.rows.length === 1 && combined.rows[0].id === disabledOne.id);

  console.log("\n▸ Sorting and pagination");
  const byNameAsc = await adminCatalog.listProductsAdmin({ search: tag, sort: "name", dir: "asc", pageSize: 100 });
  const names = byNameAsc.rows.map((row) => row.name);
  check("sort by name ascending is ordered", names.every((name, i) => i === 0 || names[i - 1].localeCompare(name) <= 0));
  const byPriceDesc = await adminCatalog.listProductsAdmin({ search: tag, sort: "price", dir: "desc", pageSize: 100 });
  const prices = byPriceDesc.rows.map((row) => row.minPrice ?? -1);
  check("sort by price descending is ordered, with unpriced products last", prices.every((price, i) => i === 0 || prices[i - 1] >= price));
  const pageOne = await adminCatalog.listProductsAdmin({ search: tag, sort: "name", dir: "asc", page: 1, pageSize: 2 });
  const pageTwo = await adminCatalog.listProductsAdmin({ search: tag, sort: "name", dir: "asc", page: 2, pageSize: 2 });
  check("pagination returns the requested page size", pageOne.rows.length === 2 && pageTwo.rows.length === 2);
  check(
    "pages do not overlap",
    pageOne.rows.every((row) => !pageTwo.rows.some((other) => other.id === row.id)),
  );
  check("pagination reports the filtered total", pageOne.total === byNameAsc.total && pageOne.total >= 6, `total=${pageOne.total}`);

  console.log("\n▸ Readiness");
  const readyRow = all.rows.find((row) => row.id === draftReady.id);
  const bareRow = all.rows.find((row) => row.id === draftNoImage.id);
  const archivedRow = all.rows.find((row) => row.id === archivedOne.id);
  check("a complete draft reports ready", readyRow?.readiness?.ready === true, JSON.stringify(readyRow?.readiness));
  check(
    "an incomplete draft lists what is missing",
    bareRow?.readiness?.ready === false && bareRow.readiness.missing.some((item) => /image/i.test(item)),
    JSON.stringify(bareRow?.readiness),
  );
  check("archived products report no readiness", archivedRow?.readiness === null);

  console.log("\n▸ Duplicate as draft");
  const copy = await adminCatalog.duplicateProductAsDraft(live.id, adminId);
  const [copyRow] = await db.select().from(schema.products).where(eq(schema.products.id, copy.id));
  check("copy is a draft", copyRow.status === "draft");
  check("copy is disabled until reviewed", copyRow.availability === "disabled");
  check("copy has a unique slug", copyRow.slug !== live.slug && copyRow.slug.startsWith(live.slug));
  check("copy has no SKU", copyRow.sku === null);
  const copyVariations = await db.select().from(schema.variations).where(eq(schema.variations.productId, copy.id));
  check(
    "copied packages are draft, disabled and have no SKU",
    copyVariations.length === 1 && copyVariations.every((v) => v.status === "draft" && v.availability === "disabled" && v.sku === null),
  );
  const [sourceAfter] = await db.select().from(schema.products).where(eq(schema.products.id, live.id));
  check("source product is unchanged", sourceAfter.status === "published" && sourceAfter.availability === "available");
  const second = await adminCatalog.duplicateProductAsDraft(live.id, adminId);
  const [secondRow] = await db.select().from(schema.products).where(eq(schema.products.id, second.id));
  check("a second copy gets another unique slug", secondRow.slug !== copyRow.slug);
  const audit = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "product.duplicate"));
  check("duplication is audited", audit.some((row) => row.entityId === String(copy.id)));
  await expectError(
    "duplicating a missing product is rejected",
    () => adminCatalog.duplicateProductAsDraft(9_999_999, adminId),
    "not found",
  );

  console.log("\n▸ Bulk category assignment");
  const added = await adminCatalog.bulkAssignProductCategory(
    { ids: [draftReady.id, draftNoImage.id, draftReady.id], categoryId: productsCategory.id, mode: "add" },
    adminId,
  );
  check("add reports each product once", added.updated === 2, JSON.stringify(added));
  const again = await adminCatalog.bulkAssignProductCategory(
    { ids: [draftReady.id, 9_999_999], categoryId: productsCategory.id, mode: "add" },
    adminId,
  );
  check(
    "re-adding reports already-linked and missing records",
    again.updated === 0 &&
      again.skipped.some((item) => /Already in/.test(item.reason)) &&
      again.skipped.some((item) => /not found/i.test(item.reason)),
    JSON.stringify(again.skipped),
  );
  await expectError(
    "games categories cannot receive products",
    () =>
      adminCatalog.bulkAssignProductCategory(
        { ids: [draftReady.id], categoryId: gamesCategory.id, mode: "add" },
        adminId,
      ),
    "lists games",
  );
  const removed = await adminCatalog.bulkAssignProductCategory(
    { ids: [draftReady.id, unavailableOne.id], categoryId: productsCategory.id, mode: "remove" },
    adminId,
  );
  check("remove reports unlinked products as skipped", removed.updated === 1 && removed.skipped.length === 1);
  const links = await db
    .select()
    .from(schema.categoryProducts)
    .where(and(eq(schema.categoryProducts.categoryId, productsCategory.id), eq(schema.categoryProducts.productId, draftReady.id)));
  check("removed link is gone from the database", links.length === 0);
  const categoryAudit = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "product.category_add"));
  check("category assignment is audited", categoryAudit.length >= 2);

  console.log("\n▸ Validation and bulk reports");
  check("category schema accepts add", bulkProductCategorySchema.safeParse({ mode: "add", categoryId: "3", ids: ["1"] }).success);
  check("category schema rejects an unknown mode", !bulkProductCategorySchema.safeParse({ mode: "move", categoryId: "3", ids: ["1"] }).success);
  check("category schema requires products", !bulkProductCategorySchema.safeParse({ mode: "add", categoryId: "3", ids: [] }).success);
  check("bulk product schema accepts restore", bulkProductActionSchema.safeParse({ action: "restore", ids: ["1"] }).success);
  const restoreReport = await adminCatalog.bulkUpdateProducts(
    { action: "restore", ids: [live.id, archivedOne.id] },
    adminId,
  );
  check(
    "restore skips records that are not archived, without failing the batch",
    restoreReport.updated === 1 && restoreReport.skipped.some((item) => item.id === live.id),
    JSON.stringify(restoreReport),
  );
  const [restored] = await db.select().from(schema.products).where(eq(schema.products.id, archivedOne.id));
  check("restored product returns to draft", restored.status === "draft");

  await closeDb();
  await rm(testDir, { recursive: true, force: true });

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
