import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { z } from "zod";

import {
  banners,
  categories,
  auditLogs,
  categoryGames,
  categoryProducts,
  games,
  orderItems,
  payments,
  products,
  topupMethods,
  users,
  variations,
  wallets,
  adminUsers,
  type PaymentStatus,
} from "@/db/schema";
import {
  AVAILABILITY_STATUSES,
  canChangeStatus,
  planLifecycle,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  publishProblems,
  sellableVariations,
  type Availability,
  type LifecycleOp,
  type ProductStatus,
  type ProductType,
} from "@/lib/catalog-rules";
import { getDb, type Tx } from "@/lib/db";
import { loadGameLiveness } from "@/lib/services/eligibility";
import { AppError, money } from "@/lib/money";
import { hashPassword, newId } from "@/lib/crypto";
import type {
  adminEditSchema,
  adminSchema,
  bannerSchema,
  bulkProductActionSchema,
  bulkVariationActionSchema,
  variationBulkCreateSchema,
  categorySchema,
  gameSchema,
  productSchema,
  topupMethodSchema,
  variationSchema,
} from "@/lib/validation";

export async function listGamesAdmin() {
  const db = await getDb();
  return db
    .select({
      id: games.id,
      name: games.name,
      slug: games.slug,
      image: games.image,
      icon: games.icon,
      description: games.description,
      instructions: games.instructions,
      sortOrder: games.sortOrder,
      isActive: games.isActive,
      parentId: games.parentId,
      region: games.region,
      productCount: sql<number>`(
        select count(*)::int from ${products} p where p.game_id = ${games.id}
      )`,
    })
    .from(games)
    .orderBy(asc(games.sortOrder), asc(games.name));
}

export async function saveGame(input: z.infer<typeof gameSchema>, id?: number) {
  const db = await getDb();
  const clash = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.slug, input.slug), id ? sql`${games.id} <> ${id}` : undefined))
    .limit(1);
  if (clash[0]) throw new AppError("A game with this slug already exists.", 409);

  // Regional variants are one level deep: the storefront groups regions under a top-level game.
  let region = "";
  if (input.parentId !== null) {
    if (input.parentId === id) throw new AppError("A game cannot be its own parent.", 422);
    const [parent] = await db
      .select({ id: games.id, parentId: games.parentId })
      .from(games)
      .where(eq(games.id, input.parentId))
      .limit(1);
    if (!parent) throw new AppError("Parent game not found.", 422);
    if (parent.parentId !== null) throw new AppError("Choose a top-level game as the parent.", 422);
    if (!input.region) throw new AppError("Enter a region for this regional variant.", 422);
    if (id) {
      const [child] = await db
        .select({ value: count() })
        .from(games)
        .where(eq(games.parentId, id));
      if (Number(child?.value ?? 0) > 0) {
        throw new AppError("This game has regional variants, so it cannot become one.", 422);
      }
    }
    const regionClash = await db
      .select({ id: games.id })
      .from(games)
      .where(
        and(
          eq(games.parentId, input.parentId),
          sql`lower(${games.region}) = ${input.region.toLowerCase()}`,
          id ? sql`${games.id} <> ${id}` : undefined,
        ),
      )
      .limit(1);
    if (regionClash[0]) throw new AppError("That game already has a region with this name.", 409);
    region = input.region;
  }
  const values = { ...input, region };

  if (id) {
    const [updated] = await db
      .update(games)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    if (!updated) throw new AppError("Game not found.", 404);
    return updated;
  }

  const [created] = await db.insert(games).values(values).returning();
  return created;
}

export async function deleteGame(id: number) {
  const db = await getDb();
  const [children] = await db.select({ value: count() }).from(games).where(eq(games.parentId, id));
  if (Number(children?.value ?? 0) > 0) {
    throw new AppError("Delete or move this game's regional variants before deleting it.", 409);
  }
  const rows = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.gameId, id));
  if (Number(rows[0]?.value ?? 0) > 0) {
    throw new AppError("Move or delete this game's products before deleting the game.", 409);
  }
  await db.delete(games).where(eq(games.id, id));
}

export async function listCategoriesAdmin() {
  const db = await getDb();
  const [rows, links, productLinks] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        categoryId: categoryGames.categoryId,
        gameId: categoryGames.gameId,
        sortOrder: categoryGames.sortOrder,
      })
      .from(categoryGames)
      .orderBy(asc(categoryGames.sortOrder)),
    db
      .select({
        categoryId: categoryProducts.categoryId,
        productId: categoryProducts.productId,
      })
      .from(categoryProducts)
      .orderBy(asc(categoryProducts.sortOrder)),
  ]);
  return rows.map((category) => ({
    ...category,
    gameIds: links.filter((link) => link.categoryId === category.id).map((link) => link.gameId),
    productIds: productLinks
      .filter((link) => link.categoryId === category.id)
      .map((link) => link.productId),
  }));
}

/** Every product with its game name, for the category product picker. */
export async function listProductOptions() {
  const db = await getDb();
  return db
    .select({
      id: products.id,
      name: products.name,
      status: products.status,
      availability: products.availability,
      gameName: games.name,
    })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .orderBy(asc(games.name), asc(products.name));
}

export async function saveCategory(input: z.infer<typeof categorySchema>, id?: number) {
  const db = await getDb();
  const { gameIds, productIds, ...values } = input;
  const uniqueGameIds = [...new Set(gameIds)];
  const uniqueProductIds = [...new Set(productIds)];

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, values.slug));
  if (existing[0] && existing[0].id !== id) {
    throw new AppError("A category with this slug already exists.", 409);
  }

  return db.transaction(async (tx) => {
    let categoryId = id;
    if (id) {
      const [updated] = await tx
        .update(categories)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();
      if (!updated) throw new AppError("Category not found.", 404);
    } else {
      const [created] = await tx.insert(categories).values(values).returning();
      categoryId = created.id;
    }

    // Only the list matching the layout is kept; the other one is cleared so no stale links linger.
    await tx.delete(categoryGames).where(eq(categoryGames.categoryId, categoryId!));
    await tx.delete(categoryProducts).where(eq(categoryProducts.categoryId, categoryId!));
    if (values.layout === "products") {
      if (uniqueProductIds.length) {
        await tx.insert(categoryProducts).values(
          uniqueProductIds.map((productId, index) => ({ categoryId: categoryId!, productId, sortOrder: index })),
        );
      }
    } else if (uniqueGameIds.length) {
      await tx.insert(categoryGames).values(
        uniqueGameIds.map((gameId, index) => ({ categoryId: categoryId!, gameId, sortOrder: index })),
      );
    }
    return { id: categoryId! };
  });
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  await db.delete(categories).where(eq(categories.id, id));
}

type ProductInput = z.infer<typeof productSchema>;
type VariationInput = z.infer<typeof variationSchema>;

/** Parses an optional datetime-local value. Returns null for empty input. */
function parseSaleDate(value: string, label: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} is not a valid date.`, 422);
  return date;
}

/** Keeps products.price equal to the lowest package price (0 when there are no packages). */
async function syncProductPrice(executor: Pick<Awaited<ReturnType<typeof getDb>>, "update">, productId: number) {
  await executor
    .update(products)
    .set({
      price: sql`coalesce((select min(v.price) from ${variations} v where v.product_id = ${productId}), 0)`,
    })
    .where(eq(products.id, productId));
}

/** Variation-level checks before a package can be published. */
function variationPublishProblems(input: {
  price: string;
  topupMethodId: number | null;
  productTopupMethodId: number | null;
}) {
  const problems: string[] = [];
  if (!(Number(input.price) > 0)) problems.push("set a price above zero");
  if ((input.topupMethodId ?? input.productTopupMethodId) === null) {
    problems.push("choose a top-up method");
  }
  return problems;
}

async function productPublishProblems(db: Pick<Executor, "select">, productId: number) {
  const liveness = await loadGameLiveness(db);
  const rows = await db
    .select({ product: products, game: games })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(eq(products.id, productId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("Product not found.", 404);
  const variationRows = await db
    .select({
      status: variations.status,
      availability: variations.availability,
      price: variations.price,
      topupMethodId: variations.topupMethodId,
    })
    .from(variations)
    .where(eq(variations.productId, productId));
  return publishProblems({
    name: row.product.name,
    image: row.product.image,
    productType: row.product.productType,
    topupMethodId: row.product.topupMethodId,
    gameLive: liveness.get(row.product.gameId) ?? false,
    variations: variationRows,
  });
}

/**
 * Product and package SKUs share one namespace, compared case-insensitively, as the
 * CSV importer does. Call inside a transaction: the advisory lock serialises
 * concurrent saves so two rows cannot both claim the same SKU.
 */
async function assertSkuFree(tx: Tx, sku: string, self: { productId?: number; variationId?: number }) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('catalog-sku'))`);
  const wanted = sku.toLowerCase();
  const [productClash] = await tx
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        sql`lower(btrim(${products.sku})) = ${wanted}`,
        self.productId ? sql`${products.id} <> ${self.productId}` : undefined,
      ),
    )
    .limit(1);
  const [variationClash] = await tx
    .select({ id: variations.id })
    .from(variations)
    .where(
      and(
        sql`lower(btrim(${variations.sku})) = ${wanted}`,
        self.variationId ? sql`${variations.id} <> ${self.variationId}` : undefined,
      ),
    )
    .limit(1);
  if (productClash || variationClash) {
    throw new AppError("Another product or package already uses this SKU.", 409);
  }
}

/** Escapes LIKE wildcards so search text matches literally. */
function likeTerm(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export const PRODUCT_SORT_KEYS = ["sort", "updated", "name", "sku", "game", "type", "packages", "price"] as const;

/**
 * Admin product list: every product regardless of storefront visibility. Filters, sorting and
 * pagination run in SQL; readiness for the page's rows is computed from one batched package query.
 */
export async function listProductsAdmin(input: {
  search?: string;
  gameId?: number;
  variantId?: number;
  categoryId?: number;
  status?: string;
  availability?: string;
  type?: string;
  sort?: string;
  dir?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const parentGames = alias(games, "parent_game");
  const conditions = [];

  const search = input.search?.trim();
  if (search) {
    const term = likeTerm(search);
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.slug, term),
        ilike(products.sku, term),
        ilike(games.name, term),
        ilike(games.region, term),
        ilike(parentGames.name, term),
        sql`exists (select 1 from ${variations} v where v.product_id = ${products.id} and (v.sku ilike ${term} or v.name ilike ${term}))`,
      ),
    );
  }
  // A top-level game matches its own products and the products of its regional variants.
  if (input.gameId) {
    conditions.push(or(eq(products.gameId, input.gameId), eq(games.parentId, input.gameId)));
  }
  if (input.variantId) conditions.push(eq(products.gameId, input.variantId));
  if (input.categoryId) {
    conditions.push(
      sql`exists (select 1 from ${categoryProducts} cp where cp.product_id = ${products.id} and cp.category_id = ${input.categoryId})`,
    );
  }
  if (input.status && (PRODUCT_STATUSES as readonly string[]).includes(input.status)) {
    conditions.push(eq(products.status, input.status as ProductStatus));
  }
  if (input.availability && (AVAILABILITY_STATUSES as readonly string[]).includes(input.availability)) {
    conditions.push(eq(products.availability, input.availability as Availability));
  }
  if (input.type && (PRODUCT_TYPES as readonly string[]).includes(input.type)) {
    conditions.push(eq(products.productType, input.type as ProductType));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const minPrice = sql<string | null>`(select min(v.price) from ${variations} v where v.product_id = ${products.id} and v.status = 'published' and v.availability = 'available')`;
  const packageCount = sql<number>`(select count(*)::int from ${variations} v where v.product_id = ${products.id})`;
  const sortColumns = {
    name: products.name,
    sku: products.sku,
    game: games.name,
    type: products.productType,
    packages: packageCount,
    price: minPrice,
    updated: products.updatedAt,
    sort: products.sortOrder,
  } as const;
  const sortKey = (input.sort && (PRODUCT_SORT_KEYS as readonly string[]).includes(input.sort)
    ? input.sort
    : "sort") as keyof typeof sortColumns;
  const sortExpr = sortColumns[sortKey];

  const listQuery = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      image: products.image,
      productType: products.productType,
      status: products.status,
      availability: products.availability,
      isFeatured: products.isFeatured,
      topupMethodId: products.topupMethodId,
      gameId: products.gameId,
      gameName: games.name,
      gameParentId: games.parentId,
      gameRegion: games.region,
      parentGameName: parentGames.name,
      updatedAt: products.updatedAt,
      minPrice,
      maxPrice: sql<string | null>`(select max(v.price) from ${variations} v where v.product_id = ${products.id} and v.status = 'published' and v.availability = 'available')`,
      variationCount: packageCount,
      publishedVariationCount: sql<number>`(select count(*)::int from ${variations} v where v.product_id = ${products.id} and v.status = 'published')`,
      categoryCount: sql<number>`(select count(*)::int from ${categoryProducts} cp where cp.product_id = ${products.id})`,
    })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .leftJoin(parentGames, eq(games.parentId, parentGames.id))
    .where(where)
    .orderBy(sql`${sortExpr} ${sql.raw(input.dir === "desc" ? "DESC" : "ASC")} NULLS LAST`, asc(products.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [rows, totalRows, summaryRows, liveness] = await Promise.all([
    listQuery,
    db
      .select({ total: count() })
      .from(products)
      .innerJoin(games, eq(products.gameId, games.id))
      .leftJoin(parentGames, eq(games.parentId, parentGames.id))
      .where(where),
    db
      .select({ status: products.status, availability: products.availability, total: count() })
      .from(products)
      .groupBy(products.status, products.availability),
    loadGameLiveness(db),
  ]);

  const pageVariations = rows.length
    ? await db
        .select({
          productId: variations.productId,
          price: variations.price,
          status: variations.status,
          availability: variations.availability,
          topupMethodId: variations.topupMethodId,
        })
        .from(variations)
        .where(inArray(variations.productId, rows.map((row) => row.id)))
    : [];
  const variationsByProduct = new Map<number, typeof pageVariations>();
  for (const variation of pageVariations) {
    const list = variationsByProduct.get(variation.productId) ?? [];
    list.push(variation);
    variationsByProduct.set(variation.productId, list);
  }

  const rowsWithReadiness = rows.map((row) => {
    // Readiness reuses the publish gate, so the list shows exactly what publishing would require.
    const readiness =
      row.status === "archived"
        ? null
        : (() => {
            const missing = publishProblems({
              name: row.name,
              image: row.image,
              productType: row.productType,
              topupMethodId: row.topupMethodId,
              gameLive: liveness.get(row.gameId) ?? false,
              variations: variationsByProduct.get(row.id) ?? [],
            });
            return { ready: missing.length === 0, missing };
          })();
    return { ...row, readiness };
  });

  const summary = { total: 0, published: 0, draft: 0, archived: 0, available: 0, unavailable: 0, disabled: 0 };
  for (const row of summaryRows) {
    summary.total += row.total;
    if (row.status === "published") summary.published += row.total;
    if (row.status === "draft") summary.draft += row.total;
    if (row.status === "archived") summary.archived += row.total;
    if (row.availability === "available") summary.available += row.total;
    if (row.availability === "unavailable") summary.unavailable += row.total;
    if (row.availability === "disabled") summary.disabled += row.total;
  }

  return { rows: rowsWithReadiness, total: totalRows[0]?.total ?? 0, page, pageSize, summary };
}

/** Full product record for the editor, including its packages and category placements. */
export async function getProductAdmin(id: number) {
  const db = await getDb();
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { game: true },
  });
  if (!product) return null;
  const [variationRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(variations)
      .where(eq(variations.productId, id))
      .orderBy(asc(variations.sortOrder), asc(variations.id)),
    db
      .select({ id: categoryProducts.categoryId, sortOrder: categoryProducts.sortOrder })
      .from(categoryProducts)
      .where(eq(categoryProducts.productId, id)),
  ]);
  return { product, variations: variationRows, categories: categoryRows };
}

/**
 * The editor's checkbox only toggles "disabled". Enabling restores "available" unless the
 * record is "unavailable" (out of stock stays out of stock). Undefined leaves it unchanged.
 */
function availabilityFromToggle(current: Availability | undefined, enabled: boolean | undefined): Availability | undefined {
  if (enabled === undefined) return undefined;
  if (!enabled) return "disabled";
  return current && current !== "disabled" ? current : "available";
}

/** Publication moves only along the rules in catalog-rules; anything else needs a lifecycle action. */
function assertStatusChange(from: string, to: string | undefined) {
  if (to === undefined || from === to) return;
  if (!canChangeStatus(from, to)) {
    throw new AppError(`A ${from} record cannot move to ${to} from here.`, 409);
  }
}

export async function saveProduct(input: ProductInput, id?: number) {
  const db = await getDb();
  const { categories: categoryInputs, price: _submittedPrice, isActive, ...fields } = input;
  void _submittedPrice;
  let currentAvailability: Availability | undefined;

  if (fields.slug) {
    const clash = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, fields.slug), id ? sql`${products.id} <> ${id}` : undefined))
      .limit(1);
    if (clash[0]) throw new AppError("A product with this slug already exists.", 409);
  }

  if (categoryInputs.length) {
    const ids = [...new Set(categoryInputs.map((c) => c.id))];
    const found = await db
      .select({ id: categories.id, name: categories.name, layout: categories.layout })
      .from(categories)
      .where(inArray(categories.id, ids));
    if (found.length !== ids.length) {
      throw new AppError("One of the selected categories no longer exists.", 422);
    }
    const parentLayout = found.filter((c) => c.layout !== "products");
    if (parentLayout.length) {
      throw new AppError(
        `${parentLayout.map((c) => c.name).join(", ")} lists games, not products. Remove it from this product.`,
        422,
      );
    }
  }

  if (id) {
    const current = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!current[0]) throw new AppError("Product not found.", 404);
    assertStatusChange(current[0].status, fields.status);
    currentAvailability = current[0].availability;
    if (fields.productType === "simple") {
      const [{ total }] = await db
        .select({ total: count() })
        .from(variations)
        .where(eq(variations.productId, id));
      if (total > 1) {
        throw new AppError(
          "This product has several packages. Keep it variable, or delete extra packages first.",
          422,
        );
      }
    }
    if (fields.status === "published" && current[0].status !== "published") {
      const problems = await productPublishProblems(db, id);
      if (problems.length) {
        throw new AppError(`Cannot publish yet: ${problems.join(" ")}`, 422);
      }
    }
  } else if (fields.status === "published") {
    throw new AppError("Save as draft first, then add a package and publish.", 422);
  }

  const values = {
    ...fields,
    sku: fields.sku || null,
    image: fields.image || null,
    availability: availabilityFromToggle(currentAvailability, isActive),
    updatedAt: new Date(),
  };

  return db.transaction(async (tx) => {
    if (fields.sku) await assertSkuFree(tx, fields.sku, { productId: id });
    let productId = id;
    if (id) {
      await tx.update(products).set(values).where(eq(products.id, id));
    } else {
      const [created] = await tx.insert(products).values(values).returning({ id: products.id });
      productId = created.id;
    }
    if (!productId) throw new AppError("Product could not be saved.", 500);

    // Category placements: upsert the chosen ones, remove the rest.
    await tx
      .delete(categoryProducts)
      .where(
        and(
          eq(categoryProducts.productId, productId),
          categoryInputs.length
            ? sql`${categoryProducts.categoryId} not in (${sql.join(
                categoryInputs.map((c) => sql`${c.id}`),
                sql`, `,
              )})`
            : undefined,
        ),
      );
    for (const category of categoryInputs) {
      await tx
        .insert(categoryProducts)
        .values({ categoryId: category.id, productId, sortOrder: category.sortOrder })
        .onConflictDoUpdate({
          target: [categoryProducts.categoryId, categoryProducts.productId],
          set: { sortOrder: category.sortOrder },
        });
    }

    await syncProductPrice(tx, productId);
    return { id: productId };
  });
}

/** Refuses deletion when orders reference the product. Archive it instead. */
async function assertNoOrders(productId: number) {
  const db = await getDb();
  const [{ total }] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(
      or(
        eq(orderItems.productId, productId),
        sql`${orderItems.variationId} in (select id from ${variations} where product_id = ${productId})`,
      ),
    );
  if (total > 0) {
    throw new AppError(
      "This product has orders, so it cannot be deleted. Archive it instead to hide it from customers.",
      409,
    );
  }
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  await assertNoOrders(id);
  await db.delete(products).where(eq(products.id, id));
}

export async function saveVariation(input: VariationInput, id?: number) {
  const db = await getDb();
  const productRows = await db
    .select({ id: products.id, productType: products.productType, topupMethodId: products.topupMethodId })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new AppError("Product not found.", 404);

  const existing = id
    ? (await db.select().from(variations).where(eq(variations.id, id)).limit(1))[0]
    : undefined;
  if (id && !existing) throw new AppError("Package not found.", 404);
  if (id && existing && existing.productId !== input.productId) {
    throw new AppError("This package belongs to another product.", 422);
  }

  if (product.productType === "simple") {
    const [{ total }] = await db
      .select({ total: count() })
      .from(variations)
      .where(and(eq(variations.productId, input.productId), id ? sql`${variations.id} <> ${id}` : undefined));
    if (total > 0) {
      throw new AppError("A simple product holds one package. Switch the product to variable to add more.", 422);
    }
  }

  const price = money(input.price);
  const status = input.status ?? existing?.status ?? "draft";
  assertStatusChange(existing?.status ?? "draft", input.status);
  const compareAt = input.compareAtPrice ? money(input.compareAtPrice) : null;
  if (compareAt !== null && price > compareAt) {
    throw new AppError("Price cannot be higher than the regular (compare-at) price.", 422);
  }
  const saleStartsAt = parseSaleDate(input.saleStartsAt, "Sale start");
  const saleEndsAt = parseSaleDate(input.saleEndsAt, "Sale end");
  if (saleStartsAt || saleEndsAt) {
    if (compareAt === null) {
      throw new AppError("A sale window needs a regular (compare-at) price.", 422);
    }
    if (saleStartsAt && saleEndsAt && saleStartsAt >= saleEndsAt) {
      throw new AppError("Sale end must be after sale start.", 422);
    }
  }

  if (status === "published") {
    const problems = variationPublishProblems({
      price: String(price),
      topupMethodId: input.topupMethodId,
      productTopupMethodId: product.topupMethodId,
    });
    if (problems.length) throw new AppError(`Cannot publish this package: ${problems.join(", ")}.`, 422);
  }

  const values = {
    productId: input.productId,
    name: input.name,
    sku: input.sku || null,
    description: input.description,
    topupMethodId: input.topupMethodId,
    fields: input.fields,
    price: price.toFixed(2),
    compareAtPrice: compareAt !== null ? compareAt.toFixed(2) : null,
    image: input.image || null,
    stockStatus: input.stockStatus,
    stockQuantity: input.stockQuantity ?? null,
    sortOrder: input.sortOrder,
    availability: availabilityFromToggle(existing?.availability, input.isActive),
    status,
    saleStartsAt,
    saleEndsAt,
    updatedAt: new Date(),
  };

  return db.transaction(async (tx) => {
    if (input.sku) await assertSkuFree(tx, input.sku, { variationId: id });
    let variationId = id;
    if (id) {
      await tx.update(variations).set(values).where(eq(variations.id, id));
    } else {
      const [created] = await tx.insert(variations).values(values).returning({ id: variations.id });
      variationId = created.id;
    }
    await syncProductPrice(tx, input.productId);
    return { id: variationId };
  });
}

export async function deleteVariation(id: number) {
  const db = await getDb();
  const [row] = await db.select({ productId: variations.productId }).from(variations).where(eq(variations.id, id)).limit(1);
  if (!row) throw new AppError("Package not found.", 404);
  const [{ total }] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.variationId, id));
  if (total > 0) {
    throw new AppError("This package has orders, so it cannot be deleted. Disable it instead.", 409);
  }
  await db.transaction(async (tx) => {
    await tx.delete(variations).where(eq(variations.id, id));
    await syncProductPrice(tx, row.productId);
  });
}

/** Duplicates a package as a draft with no SKU, so the copy cannot sell until reviewed. */
export async function duplicateVariation(id: number) {
  const db = await getDb();
  const [source] = await db.select().from(variations).where(eq(variations.id, id)).limit(1);
  if (!source) throw new AppError("Package not found.", 404);
  const [product] = await db
    .select({ productType: products.productType })
    .from(products)
    .where(eq(products.id, source.productId))
    .limit(1);
  if (product?.productType === "simple") {
    throw new AppError("A simple product holds one package. Switch the product to variable first.", 422);
  }
  const { id: _id, createdAt: _c, updatedAt: _u, ...copy } = source;
  void _id;
  void _c;
  void _u;
  await db.transaction(async (tx) => {
    await tx.insert(variations).values({
      ...copy,
      name: `${source.name} (copy)`,
      sku: null,
      status: "draft",
      availability: "disabled",
    });
    await syncProductPrice(tx, source.productId);
  });
}

/** Creates several packages from lines like "Name | price | compare-at price". */
export async function bulkCreateVariations(input: z.infer<typeof variationBulkCreateSchema>) {
  const lines = input.lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new AppError("Enter at least one package line.", 422);
  if (lines.length > 100) throw new AppError("Create at most 100 packages at once.", 422);

  const parsed = lines.map((line, index) => {
    const [name = "", price = "", compareAt = ""] = line.split("|").map((part) => part.trim());
    if (!name) throw new AppError(`Line ${index + 1}: add a name.`, 422);
    const priceValue = money(price);
    if (!(priceValue > 0)) throw new AppError(`Line ${index + 1}: price must be above zero.`, 422);
    const compareValue = compareAt ? money(compareAt) : null;
    if (compareValue !== null && priceValue > compareValue) {
      throw new AppError(`Line ${index + 1}: price cannot exceed the compare-at price.`, 422);
    }
    return { name: name.slice(0, 200), price: priceValue, compareAt: compareValue };
  });

  const db = await getDb();
  const [product] = await db
    .select({ productType: products.productType })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!product) throw new AppError("Product not found.", 404);
  if (product.productType === "simple") {
    throw new AppError("A simple product holds one package. Switch the product to variable first.", 422);
  }

  return db.transaction(async (tx) => {
    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${variations.sortOrder}), -1)::int` })
      .from(variations)
      .where(eq(variations.productId, input.productId));
    await tx.insert(variations).values(
      parsed.map((row, index) => ({
        productId: input.productId,
        name: row.name,
        price: row.price.toFixed(2),
        compareAtPrice: row.compareAt !== null ? row.compareAt.toFixed(2) : null,
        sortOrder: maxSort + 1 + index,
        status: "draft" as const,
        isActive: true,
      })),
    );
    await syncProductPrice(tx, input.productId);
    return { created: parsed.length };
  });
}

/* ------------------------------------------------------------------ */
/* Lifecycle: publication (status) and availability transitions        */
/* ------------------------------------------------------------------ */

/** Bulk action names (validation.ts) mapped to lifecycle operations. */
const BULK_OPS: Record<string, LifecycleOp> = {
  publish: "publish",
  draft: "unpublish",
  archive: "archive",
  restore: "restore",
  enable: "enable",
  disable: "disable",
  mark_available: "mark_available",
  mark_unavailable: "mark_unavailable",
};

type Executor = Pick<Awaited<ReturnType<typeof getDb>>, "select" | "insert" | "update">;

/** Writes a lifecycle audit row through the caller's executor, so it commits or rolls back with the change. */
async function recordLifecycle(
  executor: Pick<Executor, "insert">,
  entry: {
    actorId: string | null;
    action: string;
    entity: string;
    entityId: number;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
) {
  await executor.insert(auditLogs).values({
    id: newId(),
    adminId: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entityId: String(entry.entityId),
    details: { before: entry.before, after: entry.after },
  });
}

/** Applies one lifecycle operation to a product. Publishing runs the full publish gate. */
export async function applyProductLifecycle(productId: number, op: LifecycleOp, actorId: string | null) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: products.status, availability: products.availability })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!current) throw new AppError("Product not found.", 404);

    const change = planLifecycle(current, op);
    if (change.status === "published") {
      const problems = await productPublishProblems(tx, productId);
      if (problems.length) throw new AppError(`Cannot publish: ${problems.join(" ")}`, 422);
    }

    await tx.update(products).set({ ...change, updatedAt: new Date() }).where(eq(products.id, productId));
    await recordLifecycle(tx, {
      actorId,
      action: `product.${op}`,
      entity: "product",
      entityId: productId,
      before: current,
      after: { ...current, ...change },
    });
    return change;
  });
}

/** Applies one lifecycle operation to a package. Publishing runs the package publish checks. */
export async function applyVariationLifecycle(variationId: number, op: LifecycleOp, actorId: string | null) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        productId: variations.productId,
        status: variations.status,
        availability: variations.availability,
        price: variations.price,
        topupMethodId: variations.topupMethodId,
      })
      .from(variations)
      .where(eq(variations.id, variationId))
      .limit(1);
    if (!current) throw new AppError("Package not found.", 404);

    const change = planLifecycle(current, op);
    if (change.status === "published") {
      const [product] = await tx
        .select({ topupMethodId: products.topupMethodId })
        .from(products)
        .where(eq(products.id, current.productId))
        .limit(1);
      const problems = variationPublishProblems({
        price: current.price,
        topupMethodId: current.topupMethodId,
        productTopupMethodId: product?.topupMethodId ?? null,
      });
      if (problems.length) throw new AppError(`Cannot publish: ${problems.join(" ")}`, 422);
    }

    await tx.update(variations).set({ ...change, updatedAt: new Date() }).where(eq(variations.id, variationId));
    await syncProductPrice(tx, current.productId);
    await recordLifecycle(tx, {
      actorId,
      action: `variation.${op}`,
      entity: "variation",
      entityId: variationId,
      before: { status: current.status, availability: current.availability },
      after: {
        status: change.status ?? current.status,
        availability: change.availability ?? current.availability,
      },
    });
    return change;
  });
}

/** Applies a bulk action to products. Each product runs in its own transaction; failures are reported per record. */
export async function bulkUpdateProducts(input: z.infer<typeof bulkProductActionSchema>, actorId: string | null) {
  const db = await getDb();
  const ids = [...new Set(input.ids)];
  const skipped: Array<{ id: number; reason: string }> = [];
  let updated = 0;

  for (const id of ids) {
    try {
      if (input.action === "delete") {
        await deleteProduct(id);
        await recordLifecycle(db, {
          actorId,
          action: "product.delete",
          entity: "product",
          entityId: id,
          before: {},
          after: {},
        });
      } else if (input.action === "feature" || input.action === "unfeature") {
        const [row] = await db
          .update(products)
          .set({ isFeatured: input.action === "feature", updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning({ id: products.id });
        if (!row) throw new AppError("Product not found.", 404);
      } else {
        await applyProductLifecycle(id, BULK_OPS[input.action], actorId);
      }
      updated += 1;
    } catch (error) {
      skipped.push({ id, reason: error instanceof Error ? error.message : "Could not update this product." });
    }
  }
  return { updated, skipped };
}

/** Applies a bulk action to packages. Price actions run in one statement; lifecycle actions run per package in a transaction. */
export async function bulkUpdateVariations(
  input: z.infer<typeof bulkVariationActionSchema>,
  actorId: string | null,
) {
  const db = await getDb();
  const ids = [...new Set(input.ids)];
  const rows = await db
    .select()
    .from(variations)
    .where(and(eq(variations.productId, input.productId), inArray(variations.id, ids)));
  const [product] = await db
    .select({ topupMethodId: products.topupMethodId })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!product) throw new AppError("Product not found.", 404);

  const skipped: Array<{ id: number; reason: string }> = [];
  let updated = 0;
  const found = new Set(rows.map((row) => row.id));
  for (const id of ids) {
    if (!found.has(id)) skipped.push({ id, reason: "Package not found on this product." });
  }

  if (input.action === "price_change" || input.action === "price_set") {
    if (input.amount === undefined) throw new AppError("Enter an amount.", 422);
    for (const row of rows) {
      const current = money(row.price);
      let next =
        input.action === "price_set"
          ? money(input.amount)
          : current * (1 + (input.direction === "decrease" ? -1 : 1) * (input.amount / 100));
      next = Math.round(next * 100) / 100;
      if (!(next > 0)) {
        skipped.push({ id: row.id, reason: "Price must stay above zero." });
        continue;
      }
      if (row.compareAtPrice !== null && next > money(row.compareAtPrice)) {
        skipped.push({ id: row.id, reason: "Price cannot exceed the regular price." });
        continue;
      }
      await db.update(variations).set({ price: next.toFixed(2), updatedAt: new Date() }).where(eq(variations.id, row.id));
      updated += 1;
    }
  } else if (input.action === "delete") {
    for (const row of rows) {
      try {
        await deleteVariation(row.id);
        updated += 1;
      } catch (error) {
        skipped.push({ id: row.id, reason: error instanceof Error ? error.message : "Could not delete." });
      }
    }
  } else {
    const op = BULK_OPS[input.action];
    for (const row of rows) {
      try {
        await applyVariationLifecycle(row.id, op, actorId);
        updated += 1;
      } catch (error) {
        skipped.push({ id: row.id, reason: error instanceof Error ? error.message : "Could not update this package." });
      }
    }
  }

  await syncProductPrice(db, input.productId);
  return { updated, skipped };
}

export async function listTopupMethodsAdmin() {
  const db = await getDb();
  return db.select().from(topupMethods).orderBy(asc(topupMethods.sortOrder), asc(topupMethods.name));
}

export async function saveTopupMethod(input: z.infer<typeof topupMethodSchema>, id?: number) {
  const db = await getDb();
  const existing = await db
    .select({ id: topupMethods.id })
    .from(topupMethods)
    .where(eq(topupMethods.key, input.key));
  if (existing[0] && existing[0].id !== id) {
    throw new AppError("A top-up method with this key already exists.", 409);
  }

  if (id) {
    const [updated] = await db
      .update(topupMethods)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(topupMethods.id, id))
      .returning();
    if (!updated) throw new AppError("Top-up method not found.", 404);
    return updated;
  }
  const [created] = await db.insert(topupMethods).values(input).returning();
  return created;
}

/** Products and packages using the method fall back to no method (FK set null). */
export async function deleteTopupMethod(id: number) {
  const db = await getDb();
  await db.delete(topupMethods).where(eq(topupMethods.id, id));
}

export async function listBannersAdmin() {
  const db = await getDb();
  return db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id));
}

export async function saveBanner(input: z.infer<typeof bannerSchema>, id?: number) {
  const db = await getDb();
  const values = {
    ...input,
    link: input.link || null,
    updatedAt: new Date(),
  };

  if (id) {
    const [updated] = await db.update(banners).set(values).where(eq(banners.id, id)).returning();
    if (!updated) throw new AppError("Banner not found.", 404);
    return updated;
  }
  const [created] = await db.insert(banners).values(values).returning();
  return created;
}

export async function deleteBanner(id: number) {
  const db = await getDb();
  await db.delete(banners).where(eq(banners.id, id));
}

export async function listPaymentsAdmin(input: {
  page?: number;
  search?: string;
  status?: PaymentStatus | "all";
}) {
  const db = await getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 25;
  const conditions = [];
  if (input.status && input.status !== "all") conditions.push(eq(payments.status, input.status));
  const search = input.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(users.email, pattern),
        ilike(users.name, pattern),
        ilike(payments.invoiceId, pattern),
        ilike(payments.transactionId, pattern),
        ilike(payments.senderNumber, pattern),
      ),
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        type: payments.type,
        gateway: payments.gateway,
        amount: payments.amount,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        transactionId: payments.transactionId,
        senderNumber: payments.senderNumber,
        createdAt: payments.createdAt,
        customerEmail: users.email,
        customerName: users.name,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(payments).innerJoin(users, eq(users.id, payments.userId)).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listWalletsAdmin(input: { page?: number; search?: string }) {
  const db = await getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 25;
  const search = input.search?.trim();
  const where = search
    ? or(
        ilike(users.email, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.phone, `%${search}%`),
      )
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        userId: wallets.userId,
        email: users.email,
        name: users.name,
        phone: users.phone,
        balance: wallets.balance,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .innerJoin(users, eq(users.id, wallets.userId))
      .where(where)
      .orderBy(desc(wallets.balance))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(wallets).innerJoin(users, eq(users.id, wallets.userId)).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listAdminUsers() {
  const db = await getDb();
  return db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.role), asc(adminUsers.name));
}

export async function saveAdminUser(
  input: z.infer<typeof adminEditSchema>,
  id?: string,
) {
  const db = await getDb();

  if (id) {
    const [updated] = await db
      .update(adminUsers)
      .set({
        name: input.name,
        email: input.email,
        role: input.role,
        permissions: input.permissions,
        isActive: input.isActive,
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, id))
      .returning();
    if (!updated) throw new AppError("Admin not found.", 404);
    return updated;
  }

  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email));
  if (existing[0]) throw new AppError("An admin with this email already exists.", 409);

  const [created] = await db
    .insert(adminUsers)
    .values({
      id: newId(),
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      permissions: input.permissions,
      isActive: input.isActive,
    })
    .returning();
  return created;
}

export async function deleteAdminUser(id: string) {
  const db = await getDb();
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!rows[0]) throw new AppError("Admin not found.", 404);
  if (rows[0].role === "owner") {
    const ownerCount = await db
      .select({ value: count() })
      .from(adminUsers)
      .where(eq(adminUsers.role, "owner"));
    if (Number(ownerCount[0]?.value ?? 0) <= 1) {
      throw new AppError("The last owner account cannot be deleted.", 409);
    }
  }
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}

/** Creates a draft copy of a product with its packages and category placements. The copy sells nothing until reviewed. */
export async function duplicateProductAsDraft(id: number, actorId: string | null) {
  const db = await getDb();
  const [source] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!source) throw new AppError("Product not found.", 404);
  const sourceVariations = await db
    .select()
    .from(variations)
    .where(eq(variations.productId, id))
    .orderBy(asc(variations.sortOrder), asc(variations.id));
  const placements = await db
    .select({ categoryId: categoryProducts.categoryId, sortOrder: categoryProducts.sortOrder })
    .from(categoryProducts)
    .where(eq(categoryProducts.productId, id));

  let slug: string | null = null;
  for (let n = 1; n <= 50 && slug === null; n++) {
    const candidate = n === 1 ? `${source.slug}-copy` : `${source.slug}-copy-${n}`;
    const [hit] = await db.select({ id: products.id }).from(products).where(eq(products.slug, candidate)).limit(1);
    if (!hit) slug = candidate;
  }
  if (slug === null) throw new AppError("Could not find a free slug for the copy.", 409);
  const newSlug = slug;

  const { id: _id, createdAt: _c, updatedAt: _u, ...productCopy } = source;
  void _id;
  void _c;
  void _u;
  const name = `${source.name} (copy)`;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        ...productCopy,
        name,
        slug: newSlug,
        sku: null,
        status: "draft",
        availability: "disabled",
        isFeatured: false,
      })
      .returning({ id: products.id });
    if (!created) throw new AppError("Could not create the copy.", 500);

    if (sourceVariations.length) {
      await tx.insert(variations).values(
        sourceVariations.map((variation) => {
          const { id: _vid, createdAt: _vc, updatedAt: _vu, ...rest } = variation;
          void _vid;
          void _vc;
          void _vu;
          return { ...rest, productId: created.id, sku: null, status: "draft" as const, availability: "disabled" as const };
        }),
      );
    }
    if (placements.length) {
      await tx.insert(categoryProducts).values(
        placements.map((placement) => ({ ...placement, productId: created.id })),
      );
    }
    await syncProductPrice(tx, created.id);
    await tx.insert(auditLogs).values({
      id: newId(),
      adminId: actorId,
      action: "product.duplicate",
      entity: "product",
      entityId: String(created.id),
      details: { sourceId: id, status: "draft", availability: "disabled" },
    });
    return { id: created.id, name };
  });
}

/** Adds or removes products from one products-category, reporting each record separately. */
export async function bulkAssignProductCategory(
  input: { ids: number[]; categoryId: number; mode: "add" | "remove" },
  actorId: string | null,
) {
  const db = await getDb();
  const ids = [...new Set(input.ids)];
  const [category] = await db
    .select({ id: categories.id, name: categories.name, layout: categories.layout })
    .from(categories)
    .where(eq(categories.id, input.categoryId))
    .limit(1);
  if (!category) throw new AppError("That category no longer exists.", 404);
  if (category.layout !== "products") {
    throw new AppError(`${category.name} lists games, not products. Choose a products category.`, 422);
  }

  const found = new Set(
    (await db.select({ id: products.id }).from(products).where(inArray(products.id, ids))).map((row) => row.id),
  );
  const linked = new Set(
    (
      await db
        .select({ productId: categoryProducts.productId })
        .from(categoryProducts)
        .where(and(eq(categoryProducts.categoryId, category.id), inArray(categoryProducts.productId, ids)))
    ).map((row) => row.productId),
  );

  const skipped: { id: number; reason: string }[] = [];
  const changed: number[] = [];
  for (const id of ids) {
    if (!found.has(id)) {
      skipped.push({ id, reason: "Product not found." });
    } else if (input.mode === "add" && linked.has(id)) {
      skipped.push({ id, reason: `Already in ${category.name}.` });
    } else if (input.mode === "remove" && !linked.has(id)) {
      skipped.push({ id, reason: `Not in ${category.name}.` });
    } else {
      changed.push(id);
    }
  }

  if (changed.length) {
    await db.transaction(async (tx) => {
      if (input.mode === "add") {
        const [last] = await tx
          .select({ max: sql<number>`coalesce(max(${categoryProducts.sortOrder}), -1)::int` })
          .from(categoryProducts)
          .where(eq(categoryProducts.categoryId, category.id));
        let nextSort = (last?.max ?? -1) + 1;
        await tx
          .insert(categoryProducts)
          .values(changed.map((productId) => ({ categoryId: category.id, productId, sortOrder: nextSort++ })))
          .onConflictDoNothing();
      } else {
        await tx
          .delete(categoryProducts)
          .where(and(eq(categoryProducts.categoryId, category.id), inArray(categoryProducts.productId, changed)));
      }
      await tx.insert(auditLogs).values(
        changed.map((productId) => ({
          id: newId(),
          adminId: actorId,
          action: `product.category_${input.mode}`,
          entity: "product",
          entityId: String(productId),
          details: { categoryId: category.id },
        })),
      );
    });
  }
  return { updated: changed.length, skipped };
}
