/**
 * Phase 1 catalog architecture checks. Every case runs inside a transaction that
 * is rolled back, so the database is left unchanged.
 *
 *   npm run test:catalog
 */
import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";

import { closeDb, getDb, type Tx } from "@/lib/db";
import {
  categories,
  categoryProducts,
  games,
  orderItems,
  orders,
  products,
  users,
  variations,
} from "@/db/schema";

const ROLLBACK = new Error("rollback");
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Runs `fn` in a savepoint; returns the thrown error message, or null on success. */
async function attempt(tx: Tx, fn: (t: Tx) => Promise<unknown>): Promise<string | null> {
  try {
    await tx.transaction(async (inner) => {
      await fn(inner);
      throw ROLLBACK;
    });
    return null;
  } catch (error) {
    if (error === ROLLBACK) return null;
    return error instanceof Error ? error.message : String(error);
  }
}

const tag = randomUUID().slice(0, 8);

async function run() {
  const db = await getDb();

  try {
    await db.transaction(async (tx) => {
      // --- Fixtures ----------------------------------------------------
      const [parent] = await tx
        .insert(games)
        .values({ name: `Test Parent ${tag}`, slug: `test-parent-${tag}` })
        .returning();
      const [globalGame] = await tx
        .insert(games)
        .values({
          name: `Test Global ${tag}`,
          slug: `test-global-${tag}`,
          parentId: parent.id,
          region: "Global",
        })
        .returning();
      const [koreaGame] = await tx
        .insert(games)
        .values({
          name: `Test Korea ${tag}`,
          slug: `test-korea-${tag}`,
          parentId: parent.id,
          region: "Korea",
        })
        .returning();

      const [simple] = await tx
        .insert(products)
        .values({
          gameId: globalGame.id,
          name: `Simple ${tag}`,
          slug: `simple-${tag}`,
          sku: `SIMPLE-${tag}`,
          productType: "simple",
          status: "published",
        })
        .returning();
      const [simpleVar] = await tx
        .insert(variations)
        .values({
          productId: simple.id,
          name: "Pass 1",
          sku: `SIMPLE-V-${tag}`,
          price: "99.00",
          status: "published",
        })
        .returning();

      const [variable] = await tx
        .insert(products)
        .values({
          gameId: koreaGame.id,
          name: `Variable ${tag}`,
          slug: `variable-${tag}`,
          sku: `VAR-${tag}`,
          productType: "variable",
          status: "published",
        })
        .returning();
      const [varA, varB] = await tx
        .insert(variations)
        .values([
          { productId: variable.id, name: "Small", sku: `VAR-A-${tag}`, price: "10.00", status: "published" },
          {
            productId: variable.id,
            name: "Large",
            sku: `VAR-B-${tag}`,
            price: "50.00",
            compareAtPrice: "60.00",
            saleStartsAt: new Date("2030-01-01T00:00:00Z"),
            saleEndsAt: new Date("2030-02-01T00:00:00Z"),
            status: "published",
          },
        ])
        .returning();

      const [catParent] = await tx
        .insert(categories)
        .values({ name: `Cat Games ${tag}`, slug: `cat-games-${tag}`, layout: "parent_games" })
        .returning();
      const [catProducts] = await tx
        .insert(categories)
        .values({ name: `Cat Products ${tag}`, slug: `cat-products-${tag}`, layout: "products" })
        .returning();
      await tx.insert(categoryProducts).values([
        { categoryId: catProducts.id, productId: simple.id },
        { categoryId: catParent.id, productId: simple.id },
      ]);

      // --- 1. Regional variants ---------------------------------------
      console.log("Regional variants");
      const children = await tx
        .select({ id: games.id, region: games.region })
        .from(games)
        .where(eq(games.parentId, parent.id));
      check("parent game has two regional child games", children.length === 2, `got ${children.length}`);
      check(
        "products link to the regional child, not the parent",
        simple.gameId === globalGame.id && variable.gameId === koreaGame.id,
      );
      const selfParent = await attempt(tx, (t) =>
        t.update(games).set({ parentId: parent.id }).where(eq(games.id, parent.id)),
      );
      check("a game cannot be its own parent", selfParent !== null, selfParent ?? "accepted");

      // --- 2. Simple vs variable products -----------------------------
      console.log("Simple and variable products");
      const variationCounts = await tx
        .select({ productId: variations.productId, n: sql<number>`count(*)::int` })
        .from(variations)
        .where(inArray(variations.productId, [simple.id, variable.id]))
        .groupBy(variations.productId);
      const byProduct = new Map(variationCounts.map((r) => [r.productId, r.n]));
      check("simple product holds one variation", byProduct.get(simple.id) === 1);
      check("variable product holds several variations", (byProduct.get(variable.id) ?? 0) === 2);
      check("simple product type stored", simple.productType === "simple");

      // --- 3. Variations are independent purchasable entities --------
      console.log("Variation independence");
      const dupSku = await attempt(tx, (t) =>
        t.insert(variations).values({ productId: variable.id, name: "Dup", sku: `VAR-A-${tag}`, price: "1.00" }),
      );
      check("variation SKU is globally unique", dupSku !== null, dupSku ?? "accepted");
      const blankSku = await attempt(tx, (t) =>
        t.insert(variations).values({ productId: variable.id, name: "Blank", sku: "   ", price: "1.00" }),
      );
      check("blank variation SKU is rejected", blankSku !== null, blankSku ?? "accepted");
      const negPrice = await attempt(tx, (t) =>
        t.update(variations).set({ price: "-1.00" }).where(eq(variations.id, varA.id)),
      );
      check("negative price is rejected", negPrice !== null, negPrice ?? "accepted");
      const salePrice = await attempt(tx, (t) =>
        t.update(variations).set({ price: "70.00" }).where(eq(variations.id, varB.id)),
      );
      check("price above compare-at is rejected", salePrice !== null, salePrice ?? "accepted");
      const badWindow = await attempt(tx, (t) =>
        t
          .update(variations)
          .set({
            saleStartsAt: new Date("2030-03-01T00:00:00Z"),
            saleEndsAt: new Date("2030-02-01T00:00:00Z"),
          })
          .where(eq(variations.id, varB.id)),
      );
      check("sale window must end after it starts", badWindow !== null, badWindow ?? "accepted");
      const badStatus = await attempt(tx, (t) =>
        t.update(products).set({ status: "live" as never }).where(eq(products.id, simple.id)),
      );
      check("unknown publication status is rejected", badStatus !== null, badStatus ?? "accepted");
      const pending = await attempt(tx, (t) =>
        t.update(products).set({ status: "pending_review" as never }).where(eq(products.id, simple.id)),
      );
      check("retired pending_review status is rejected", pending !== null, pending ?? "accepted");

      // --- 4. Multi-category without duplicate product records --------
      console.log("Multi-category assignment");
      const linkRows = await tx
        .select({ categoryId: categoryProducts.categoryId })
        .from(categoryProducts)
        .where(eq(categoryProducts.productId, simple.id));
      const productRows = await tx.select({ id: products.id }).from(products).where(eq(products.slug, `simple-${tag}`));
      check("one product linked into two categories", linkRows.length === 2, `got ${linkRows.length}`);
      check("the product exists as a single record", productRows.length === 1);
      const dupLink = await attempt(tx, (t) =>
        t.insert(categoryProducts).values({ categoryId: catProducts.id, productId: simple.id }),
      );
      check("the same product cannot be linked to one category twice", dupLink !== null, dupLink ?? "accepted");

      // --- 5. Historical order retention ------------------------------
      console.log("Historical order retention");
      const userId = `test-user-${tag}`;
      await tx.insert(users).values({ id: userId, email: `${tag}@test.invalid` });
      const [order] = await tx
        .insert(orders)
        .values({ publicId: `TEST-${tag}`, userId, status: "completed", subtotal: "99.00", total: "99.00" })
        .returning();
      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: simple.id,
        variationId: simpleVar.id,
        productName: `Simple ${tag}`,
        variationName: "Pass 1",
        sku: `SIMPLE-V-${tag}`,
        unitPrice: "99.00",
        lineTotal: "99.00",
      });

      await tx.delete(variations).where(eq(variations.id, simpleVar.id));
      const [afterVarDelete] = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      check("deleting a variation keeps the order line", afterVarDelete !== undefined);
      check(
        "order line keeps name, SKU and price after the variation is deleted",
        afterVarDelete?.variationName === "Pass 1" &&
          afterVarDelete?.sku === `SIMPLE-V-${tag}` &&
          afterVarDelete?.unitPrice === "99.00",
      );
      check("order line no longer points at the deleted variation", afterVarDelete?.variationId === null);

      await tx.update(products).set({ name: "Renamed", status: "archived" }).where(eq(products.id, simple.id));
      const [afterRename] = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      check("order line keeps the original product name after a rename", afterRename?.productName === `Simple ${tag}`);

      await tx.delete(products).where(eq(products.id, simple.id));
      const [afterProductDelete] = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      check("order line survives product deletion", afterProductDelete !== undefined);
      check("order line keeps the product name after deletion", afterProductDelete?.productName === `Simple ${tag}`);
      const orphanLinks = await tx
        .select({ id: categoryProducts.productId })
        .from(categoryProducts)
        .where(eq(categoryProducts.productId, simple.id));
      check("deleting a product removes its category links", orphanLinks.length === 0);

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  console.log(`\n${passed} passed, ${failed} failed (transaction rolled back, no data written)`);
}

run()
  .then(async () => {
    await closeDb();
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
