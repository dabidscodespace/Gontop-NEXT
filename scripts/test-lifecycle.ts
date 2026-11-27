/**
 * Phase 2 checks: publication and availability lifecycle, shared eligibility, bulk reports
 * and checkout blocking. Runs against a fresh embedded PostgreSQL (PGlite) with the real
 * migrations.
 *
 *   npm run test:lifecycle
 */
import { rm } from "node:fs/promises";

const testDir = `.data/test-lifecycle-${process.pid}-${Date.now()}`;
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
  const catalogRules = await import("../lib/catalog-rules");
  const { gameLivenessMap } = await import("../lib/services/eligibility");
  const adminCatalog = await import("../lib/services/admin-catalog");
  const { gameSchema, productSchema, variationSchema, bulkProductActionSchema, bulkVariationActionSchema, productFieldsSchema } = await import(
    "../lib/validation"
  );
  const { createOrder, getOrderWithDetails } = await import("../lib/services/orders");
  const { registerUser } = await import("../lib/services/auth");
  const { applyWalletEntry } = await import("../lib/services/wallet");
  const { getSearchIndex } = await import("../lib/services/catalog");
  const { eq } = await import("drizzle-orm");
  type ProductField = typeof schema.products.$inferInsert.fields extends (infer F)[] | null | undefined ? F : never;
  const { hashPassword } = await import("../lib/crypto");

  const db = await getDb();
  const tag = Math.random().toString(36).slice(2, 8);

  console.log("\n▸ Publication rules");
  const { planLifecycle, canChangeStatus, isProductListed, isProductBuyable } = catalogRules;
  const draft = { status: "draft", availability: "available" };
  check("draft can be published", planLifecycle(draft, "publish").status === "published");
  await expectError(
    "published cannot be published again",
    async () => planLifecycle({ status: "published", availability: "available" }, "publish"),
    "Already published",
  );
  await expectError(
    "archived cannot be published without restoring",
    async () => planLifecycle({ status: "archived", availability: "available" }, "publish"),
    "Restore",
  );
  check(
    "restore returns an archived record to draft",
    planLifecycle({ status: "archived", availability: "available" }, "restore").status === "draft",
  );
  await expectError(
    "draft cannot be unpublished",
    async () => planLifecycle(draft, "unpublish"),
    "Only published",
  );
  check("draft can be archived", planLifecycle(draft, "archive").status === "archived");
  check("retired pending_review status is not a publication state", !catalogRules.PRODUCT_STATUSES.includes("pending_review" as never));
  const draftOps = catalogRules.availableLifecycleOps(draft);
  check("draft offers publish but not unpublish", draftOps.includes("publish") && !draftOps.includes("unpublish"));
  check("canChangeStatus rejects archived to published", !canChangeStatus("archived", "published"));

  console.log("\n▸ Availability rules");
  check(
    "disable then enable returns to available",
    planLifecycle({ status: "published", availability: "available" }, "disable").availability === "disabled" &&
      planLifecycle({ status: "published", availability: "disabled" }, "enable").availability === "available",
  );
  check(
    "unavailable can be marked available again",
    planLifecycle({ status: "published", availability: "unavailable" }, "mark_available").availability === "available",
  );
  await expectError(
    "only unavailable records can be marked available",
    async () => planLifecycle({ status: "published", availability: "available" }, "mark_available"),
    "Only unavailable",
  );

  console.log("\n▸ Eligibility rules");
  check("draft products are never listed", !isProductListed({ status: "draft", availability: "available" }, true));
  check(
    "disabled products are not listed",
    !isProductListed({ status: "published", availability: "disabled" }, true),
  );
  check(
    "unavailable products stay listed but cannot be bought",
    isProductListed({ status: "published", availability: "unavailable" }, true) &&
      !isProductBuyable({ status: "published", availability: "unavailable" }, true),
  );
  const liveness = gameLivenessMap([
    { id: 1, isActive: false, parentId: null },
    { id: 2, isActive: true, parentId: 1 },
    { id: 3, isActive: true, parentId: null },
  ]);
  check("regional child of a disabled parent is not live", liveness.get(2) === false);
  check("active game without a parent is live", liveness.get(3) === true);

  console.log("\n▸ Fixtures");
  const [parentGame] = await db
    .insert(schema.games)
    .values({ name: `Parent ${tag}`, slug: `parent-${tag}`, isActive: true })
    .returning();
  const [game] = await db
    .insert(schema.games)
    .values({ name: `Game ${tag}`, slug: `game-${tag}`, isActive: true, parentId: parentGame.id, region: "MY" })
    .returning();
  const [unrelatedGame] = await db
    .insert(schema.games)
    .values({ name: `Other ${tag}`, slug: `other-${tag}`, isActive: true })
    .returning();

  const [topup] = await db
    .insert(schema.topupMethods)
    .values({ key: `method-${tag}`, name: "Player ID" })
    .returning();

  const adminId = `admin-${tag}`;
  await db.insert(schema.adminUsers).values({
    id: adminId,
    email: `admin-${tag}@example.com`,
    name: "Lifecycle Admin",
    passwordHash: hashPassword("admin-password"),
    role: "owner",
  });

  const customer = await registerUser({
    name: "Lifecycle Customer",
    email: `customer-${tag}@example.com`,
    phone: "01700000001",
    password: "password123",
  });
  await db.transaction(async (tx) => {
    await applyWalletEntry(tx, {
      userId: customer.id,
      amount: 5000,
      type: "admin_credit",
      description: "Lifecycle test balance",
    });
  });

  const playerFields = { player_id: "123456", server_id: "2001" };
  const fieldSet: ProductField[] = [
    { id: "player_id", label: "Player ID", type: "number", required: true },
    { id: "server_id", label: "Server ID", type: "number", required: true },
  ];

  async function makeProduct(name: string, gameId: number, status: "draft" | "published" | "archived", availability: "available" | "unavailable" | "disabled") {
    const [row] = await db
      .insert(schema.products)
      .values({ gameId, name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${tag}-${Math.random().toString(36).slice(2, 6)}`, price: "100", fields: fieldSet, status, availability, image: "/assets/test.png", topupMethodId: topup.id })
      .returning();
    return row;
  }

  async function makeVariation(productId: number, label: string, status: "draft" | "published" = "published", availability: "available" | "unavailable" | "disabled" = "available") {
    const [row] = await db
      .insert(schema.variations)
      .values({ productId, name: label, sku: `${label}-${tag}-${Math.random().toString(36).slice(2, 6)}`, price: "100", sortOrder: 0, status, availability })
      .returning();
    return row;
  }

  const sellable = await makeProduct(`Sellable ${tag}`, game.id, "published", "available");
  const sellableVariation = await makeVariation(sellable.id, "pack-a");
  const sellableVariation2 = await makeVariation(sellable.id, "pack-b");

  console.log("\n▸ Publish gate");
  const noPackage = await makeProduct(`Empty ${tag}`, game.id, "draft", "available");
  await expectError(
    "publishing a product with no sellable package is rejected",
    () => adminCatalog.applyProductLifecycle(noPackage.id, "publish", adminId),
    "Cannot publish",
  );
  const [stillDraft] = await db.select().from(schema.products).where(eq(schema.products.id, noPackage.id));
  check("failed publish leaves the product as draft", stillDraft.status === "draft");

  const publishable = await makeProduct(`Publishable ${tag}`, game.id, "draft", "available");
  await makeVariation(publishable.id, "pack-c");
  await adminCatalog.applyProductLifecycle(publishable.id, "publish", adminId);
  const [published] = await db.select().from(schema.products).where(eq(schema.products.id, publishable.id));
  check("publishing with a sellable package succeeds", published.status === "published");

  const auditRows = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, String(publishable.id)));
  const audit = auditRows.find((row) => row.action === "product.publish");
  check(
    "lifecycle audit records actor and status-only details",
    audit?.adminId === adminId &&
      JSON.stringify(audit.details).includes("published") &&
      !JSON.stringify(audit.details).includes("passwordHash"),
  );

  console.log("\n▸ Checkout eligibility");
  const orderBefore = await createOrder(customer.id, {
    productId: sellable.id,
    items: [{ variationId: sellableVariation.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  await adminCatalog.applyProductLifecycle(sellable.id, "disable", adminId);
  await expectError(
    "disabled product cannot be ordered",
    () =>
      createOrder(customer.id, {
        productId: sellable.id,
        items: [{ variationId: sellableVariation2.id, quantity: 1 }],
        playerFields,
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "not available",
  );
  await adminCatalog.applyProductLifecycle(sellable.id, "enable", adminId);

  await db.update(schema.variations).set({ availability: "disabled" }).where(eq(schema.variations.id, sellableVariation2.id));
  await expectError(
    "disabled package cannot be ordered",
    () =>
      createOrder(customer.id, {
        productId: sellable.id,
        items: [{ variationId: sellableVariation2.id, quantity: 1 }],
        playerFields,
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "not available",
  );

  const regional = await makeProduct(`Regional ${tag}`, game.id, "published", "available");
  const regionalVariation = await makeVariation(regional.id, "regional-pack");
  await db.update(schema.games).set({ isActive: false }).where(eq(schema.games.id, parentGame.id));
  await expectError(
    "regional product is blocked when its parent game is disabled",
    () =>
      createOrder(customer.id, {
        productId: regional.id,
        items: [{ variationId: regionalVariation.id, quantity: 1 }],
        playerFields,
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "not available",
  );
  await db.update(schema.games).set({ isActive: true }).where(eq(schema.games.id, parentGame.id));

  const outOfStock = await makeProduct(`Out ${tag}`, unrelatedGame.id, "published", "unavailable");
  await db.update(schema.products).set({ productType: "variable" }).where(eq(schema.products.id, outOfStock.id));
  const outOfStockVariation = await makeVariation(outOfStock.id, "out-pack");
  await expectError(
    "unavailable product cannot be ordered",
    () =>
      createOrder(customer.id, {
        productId: outOfStock.id,
        items: [{ variationId: outOfStockVariation.id, quantity: 1 }],
        playerFields,
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "not available",
  );

  console.log("\n▸ Historical orders");
  const kept = await getOrderWithDetails(orderBefore.publicId);
  check("order created before disabling is unchanged", kept?.order.status === "processing" && Number(kept.order.total) === Number(orderBefore.total));

  console.log("\n▸ Save paths");
  const unchecked = productSchema.parse({ gameId: unrelatedGame.id, name: `Unchecked ${tag}`, slug: `unchecked-${tag}`, productType: "simple", status: "published" });
  check("unchecked checkbox is parsed as disabled", unchecked.isActive === false);
  const archivedProduct = await makeProduct(`Arch ${tag}`, unrelatedGame.id, "archived", "available");
  await expectError(
    "archived product cannot be saved straight to published",
    () =>
      adminCatalog.saveProduct(
        productSchema.parse({ gameId: unrelatedGame.id, name: "Archived", slug: `archived-${tag}`, status: "published", isActive: "on" }),
        archivedProduct.id,
      ),
    "cannot move",
  );
  const variationTarget = await makeVariation(outOfStock.id, "status-pack", "draft");
  await db.update(schema.variations).set({ status: "archived" }).where(eq(schema.variations.id, variationTarget.id));
  await expectError(
    "archived package cannot be saved straight to published",
    () =>
      adminCatalog.saveVariation(
        variationSchema.parse({ productId: outOfStock.id, name: "status-pack", price: 100, status: "published", isActive: "on" }),
        variationTarget.id,
      ),
    "cannot move",
  );

  console.log("\n▸ Bulk reports");
  const bulkGood = await makeProduct(`Bulk ${tag}`, unrelatedGame.id, "draft", "available");
  const bulkPack = await makeVariation(bulkGood.id, "bulk-pack");
  const bulkEmpty = await makeProduct(`Bulk empty ${tag}`, unrelatedGame.id, "draft", "available");
  const products = await adminCatalog.bulkUpdateProducts(
    bulkProductActionSchema.parse({ action: "publish", ids: [bulkGood.id, bulkEmpty.id, 999999] }),
    adminId,
  );
  check("bulk product publish reports one success", products.updated === 1, JSON.stringify(products));
  check(
    "bulk product publish reports each failed record",
    products.skipped.length === 2 && products.skipped.some((item) => item.id === bulkEmpty.id) && products.skipped.some((item) => item.id === 999999),
    JSON.stringify(products.skipped),
  );

  const bulkVar = await makeVariation(bulkGood.id, "bulk-two", "published", "disabled");
  const variations = await adminCatalog.bulkUpdateVariations(
    bulkVariationActionSchema.parse({ productId: bulkGood.id, action: "mark_unavailable", ids: [bulkPack.id, bulkVar.id, sellableVariation.id] }),
    adminId,
  );
  check(
    "bulk variation action reports skipped records without failing the batch",
    variations.updated === 1 && variations.skipped.length === 2,
    JSON.stringify(variations),
  );

  console.log("\n▸ SKU and field rules");
  const skuOwnerProduct = await makeProduct(`Sku owner ${tag}`, unrelatedGame.id, "draft", "available");
  const skuOwnerPack = await makeVariation(skuOwnerProduct.id, "sku-owner-pack");
  await db.update(schema.variations).set({ sku: `SKU-${tag}` }).where(eq(schema.variations.id, skuOwnerPack.id));
  const skuOther = await makeProduct(`Sku other ${tag}`, unrelatedGame.id, "draft", "available");
  await expectError(
    "package SKU cannot repeat another package's SKU in a different case",
    () =>
      adminCatalog.saveVariation(
        variationSchema.parse({ productId: skuOther.id, name: "sku-clash", sku: `sku-${tag}`.toLowerCase(), price: 100, isActive: "on" }),
      ),
    "already uses this SKU",
  );
  await expectError(
    "product SKU cannot repeat a package SKU",
    () =>
      adminCatalog.saveProduct(
        productSchema.parse({ gameId: unrelatedGame.id, name: `Sku clash ${tag}`, slug: `sku-clash-${tag}`, productType: "simple", status: "draft", sku: `SKU-${tag}` }),
      ),
    "already uses this SKU",
  );
  const keepSkuPack = await adminCatalog.saveVariation(
    variationSchema.parse({ productId: skuOwnerProduct.id, name: "sku-owner-pack", sku: `SKU-${tag}`, price: 100, isActive: "on" }),
    skuOwnerPack.id,
  );
  check("a package keeps its own SKU when saved again", keepSkuPack.id === skuOwnerPack.id);
  let dbError = "";
  try {
    await db.insert(schema.variations).values({
      productId: skuOther.id,
      name: "db-sku-clash",
      sku: `sku-${tag}`.toLowerCase(),
      price: "100",
      sortOrder: 0,
      status: "draft",
      availability: "available",
    });
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
    dbError = `${err instanceof Error ? err.message : String(err)} ${cause}`;
  }
  check("database index rejects a case-variant SKU repeat", dbError.includes("variations_sku_normalized_unique"), dbError);

  const duplicateFields = productFieldsSchema.safeParse([
    { id: "uid", label: "UID", type: "text" },
    { id: "uid", label: "Other", type: "text" },
  ]);
  check("duplicate field ids are rejected", !duplicateFields.success && duplicateFields.error.issues.some((issue) => issue.message.includes("more than once")));
  const duplicateLabels = productFieldsSchema.safeParse([
    { id: "a", label: "Player", type: "text" },
    { id: "b", label: "player", type: "text" },
  ]);
  check("duplicate field labels are rejected", !duplicateLabels.success);
  const emptyChoice = productFieldsSchema.safeParse([{ id: "server", label: "Server", type: "select", options: [] }]);
  check("a select field needs at least one option", !emptyChoice.success);
  const repeatedOption = productFieldsSchema.safeParse([
    { id: "server", label: "Server", type: "radio", options: [{ value: "a", label: "A" }, { value: "a", label: "A again" }] },
  ]);
  check("choice options must have unique values", !repeatedOption.success);
  const validFields = productFieldsSchema.safeParse([
    { id: "uid", label: "UID", type: "text", required: true },
    { id: "server", label: "Server", type: "select", options: [{ value: "eu", label: "Europe" }] },
  ]);
  check("a well-formed field list is accepted", validFields.success);

  const slugOne = await adminCatalog.saveGame(gameSchema.parse({ name: `Slug one ${tag}`, slug: `slug-one-${tag}` }));
  const slugTwo = await adminCatalog.saveGame(gameSchema.parse({ name: `Slug two ${tag}`, slug: `slug-two-${tag}` }));
  await expectError(
    "game cannot be renamed onto another game's slug",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `Slug two ${tag}`, slug: `slug-one-${tag}` }), slugTwo.id),
    "already exists",
  );
  check("a game keeps its own slug when saved again", (await adminCatalog.saveGame(gameSchema.parse({ name: `Slug one ${tag}`, slug: `slug-one-${tag}` }), slugOne.id)).id === slugOne.id);

  console.log("\n▸ Regional variants");
  const regionParent = await adminCatalog.saveGame(gameSchema.parse({ name: `Parent ${tag}`, slug: `region-parent-${tag}` }));
  const regionChild = await adminCatalog.saveGame(
    gameSchema.parse({ name: `Child ${tag}`, slug: `region-child-${tag}`, parentId: String(regionParent.id), region: "Korea" }),
  );
  check("regional variant stores its parent and region", regionChild.parentId === regionParent.id && regionChild.region === "Korea");
  check("empty parent select means a top-level game", gameSchema.parse({ name: "Top", slug: `top-${tag}`, parentId: "" }).parentId === null);
  const topWithRegion = await adminCatalog.saveGame(gameSchema.parse({ name: `Top ${tag}`, slug: `top-region-${tag}`, region: "Global" }));
  check("a top-level game drops any region", topWithRegion.region === "");
  await expectError(
    "regional variant needs a region",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `No region ${tag}`, slug: `no-region-${tag}`, parentId: String(regionParent.id) })),
    "Enter a region",
  );
  await expectError(
    "a game cannot be its own parent",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `Self ${tag}`, slug: `self-${tag}`, parentId: String(regionChild.id), region: "EU" }), regionChild.id),
    "cannot be its own parent",
  );
  await expectError(
    "regions are only one level deep",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `Grand ${tag}`, slug: `grand-${tag}`, parentId: String(regionChild.id), region: "EU" })),
    "top-level game",
  );
  await expectError(
    "a game with regions cannot become a regional variant",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `Parent ${tag}`, slug: `region-parent-${tag}`, parentId: String(topWithRegion.id), region: "EU" }), regionParent.id),
    "cannot become one",
  );
  await expectError(
    "two regions under one parent cannot share a name",
    () => adminCatalog.saveGame(gameSchema.parse({ name: `Dup ${tag}`, slug: `dup-${tag}`, parentId: String(regionParent.id), region: "korea" })),
    "already has a region",
  );
  await expectError(
    "a parent with regional variants cannot be deleted",
    () => adminCatalog.deleteGame(regionParent.id),
    "regional variants",
  );

  console.log("\n▸ Search");
  const index = await getSearchIndex();
  check("search returns an available product", index.some((item) => item.id === sellable.id));
  const hiddenDisabled = await makeProduct(`Hidden ${tag}`, unrelatedGame.id, "published", "disabled");
  await makeVariation(hiddenDisabled.id, "hidden-pack");
  const refreshedIndex = await getSearchIndex();
  check("search omits a disabled product", !refreshedIndex.some((item) => item.id === hiddenDisabled.id));
  check("search omits an unavailable product", !refreshedIndex.some((item) => item.id === outOfStock.id));

  await closeDb();
  await rm(testDir, { recursive: true, force: true });

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
