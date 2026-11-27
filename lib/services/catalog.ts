import "server-only";

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  banners,
  categories,
  categoryGames,
  categoryProducts,
  games,
  products,
  topupMethods,
  variations,
  type ProductField,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import {
  effectivePricing,
  isProductBuyable,
  isProductListed,
  isSellableVariation,
} from "@/lib/catalog-rules";
import { gameLivenessMap, loadGameLiveness } from "@/lib/services/eligibility";

/** One homepage tile. Both category layouts use this shape, so one card design renders everything. */
export type HomeCard = {
  id: number;
  name: string;
  image: string | null;
  href: string;
  stockStatus: string;
  stockQuantity: number | null;
  /** Popular Games only: the buyable regional products shown in the variant modal. */
  variants?: HomeCard[];
};

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  layout: "parent_games" | "products";
  items: HomeCard[];
};

async function loadStorefront() {
  const db = await getDb();

  const [
    bannerRows,
    gameRows,
    productRows,
    variationRows,
    categoryRows,
    gameLinks,
    productLinks,
  ] = await Promise.all([
    db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), asc(banners.id)),
    db
      .select()
      .from(games)
      .orderBy(asc(games.sortOrder), asc(games.name)),
    db
      .select({
        id: products.id,
        gameId: products.gameId,
        name: products.name,
        slug: products.slug,
        image: products.image,
      })
      .from(products)
      .where(and(eq(products.status, "published"), eq(products.availability, "available")))
      .orderBy(desc(products.isFeatured), asc(products.sortOrder), asc(products.name)),
    db
      .select({
        id: variations.id,
        productId: variations.productId,
        price: variations.price,
        compareAtPrice: variations.compareAtPrice,
        saleStartsAt: variations.saleStartsAt,
        saleEndsAt: variations.saleEndsAt,
        stockStatus: variations.stockStatus,
        stockQuantity: variations.stockQuantity,
      })
      .from(variations)
      .where(and(eq(variations.status, "published"), eq(variations.availability, "available")))
      .orderBy(asc(variations.sortOrder), asc(variations.id)),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.showOnHome, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
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
        sortOrder: categoryProducts.sortOrder,
      })
      .from(categoryProducts)
      .orderBy(asc(categoryProducts.sortOrder)),
  ]);

  // Cheapest package per product: its price, stock and quantity represent the product card,
  // matching the original game listing. Products without an active package are not buyable.
  const cheapestByProduct = new Map<number, (typeof variationRows)[number]>();
  for (const v of variationRows) {
    const current = cheapestByProduct.get(v.productId);
    const price = Number(effectivePricing(v).price);
    if (!current || price < Number(effectivePricing(current).price)) cheapestByProduct.set(v.productId, v);
  }

  const gamesById = new Map(gameRows.map((game) => [game.id, game]));
  const liveGames = gameLivenessMap(gameRows);
  const buyableProducts = new Map<number, (typeof productRows)[number]>();
  for (const product of productRows) {
    if (cheapestByProduct.has(product.id) && liveGames.get(product.gameId)) {
      buyableProducts.set(product.id, product);
    }
  }

  const productCard = (product: (typeof productRows)[number]): HomeCard => {
    const cheapest = cheapestByProduct.get(product.id)!;
    return {
      id: product.id,
      name: product.name,
      image: product.image,
      href: `/product/${product.slug}`,
      stockStatus: cheapest.stockStatus,
      stockQuantity: cheapest.stockQuantity,
    };
  };

  const homeCategories: StoreCategory[] = categoryRows.map((category) => {
    let items: HomeCard[];

    if (category.layout === "products") {
      items = productLinks
        .filter((link) => link.categoryId === category.id)
        .map((link) => buyableProducts.get(link.productId))
        .filter((product): product is (typeof productRows)[number] => Boolean(product))
        .map(productCard);
    } else {
      items = gameLinks
        .filter((link) => link.categoryId === category.id)
        .map((link) => gamesById.get(link.gameId))
        .filter((game): game is (typeof gameRows)[number] => Boolean(game))
        .filter((game) => game.isActive && liveGames.get(game.id))
        .map((game): HomeCard | null => {
          // Regional games (children) sell under their parent's card.
          const regionIds = new Set([game.id, ...gameRows.filter((g) => g.parentId === game.id).map((g) => g.id)]);
          const gameVariants = [...buyableProducts.values()]
            .filter((product) => regionIds.has(product.gameId))
            .map(productCard);
          if (gameVariants.length === 0) return null;
          // One buyable variant links straight to its product; several open the game's variant list.
          const single = gameVariants.length === 1 ? gameVariants[0] : null;
          return {
            id: game.id,
            name: game.name,
            image: game.image,
            href: single ? single.href : `/games/${game.slug}`,
            stockStatus: "instock",
            stockQuantity: null,
            // Several regional packages open in the Popular Games variant modal.
            variants: single ? undefined : gameVariants,
          };
        })
        .filter((card): card is HomeCard => card !== null);
    }

    if (category.gameLimit > 0) items = items.slice(0, category.gameLimit);

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      layout: category.layout === "products" ? "products" : "parent_games",
      items,
    };
  });

  return {
    banners: bannerRows.map((banner) => ({
      id: banner.id,
      title: banner.title,
      description: banner.description,
      image: banner.image,
      link: banner.link,
    })),
    categories: homeCategories,
  };
}

/**
 * Public homepage catalog. Cached and tagged "storefront": admin saves call
 * updateTag("storefront") so changes show immediately; the 60s window is a backstop
 * (e.g. stock changes made by orders).
 */
export const getStorefront = unstable_cache(loadStorefront, ["storefront-catalog"], {
  tags: ["storefront"],
  revalidate: 60,
});

export async function getProductBySlug(slug: string) {
  const db = await getDb();

  const rows = await db
    .select({ product: products, game: games })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(eq(products.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const gameLive = (await loadGameLiveness(db)).get(row.game.id) ?? false;
  // Unpublished, disabled and drafts-in-disabled-games stay unreachable; unavailable products still render with a notice.
  if (!isProductListed(row.product, gameLive)) return null;
  const buyable = isProductBuyable(row.product, gameLive);

  const variationRows = buyable
    ? (
        await db
          .select()
          .from(variations)
          .where(eq(variations.productId, row.product.id))
          .orderBy(asc(variations.sortOrder), asc(variations.id))
      ).filter(isSellableVariation)
    : [];
  const now = new Date();

  // Each package carries its effective top-up method and customer fields:
  // its own override when set, otherwise the product's.
  const methodIds = [
    ...new Set(
      [row.product.topupMethodId, ...variationRows.map((v) => v.topupMethodId)].filter(
        (id): id is number => id !== null,
      ),
    ),
  ];
  const methodRows = methodIds.length
    ? await db
        .select({ id: topupMethods.id, name: topupMethods.name })
        .from(topupMethods)
        .where(inArray(topupMethods.id, methodIds))
    : [];
  const methodName = (id: number | null) => methodRows.find((m) => m.id === id)?.name ?? "";

  return {
    product: row.product,
    game: row.game,
    buyable,
    variations: variationRows.map((variation) => ({
      ...variation,
      // Charged and displayed prices reflect any sale window at this moment.
      ...effectivePricing(variation, now),
      fields: (variation.fields ?? row.product.fields ?? []) as ProductField[],
      topupMethodName: methodName(variation.topupMethodId ?? row.product.topupMethodId),
    })),
    fields: (row.product.fields ?? []) as ProductField[],
    topupMethodName: methodName(row.product.topupMethodId),
  };
}

export async function getProductById(id: number) {
  const db = await getDb();
  const rows = await db
    .select({ product: products, game: games })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!rows[0]) return null;

  const variationRows = await db
    .select()
    .from(variations)
    .where(eq(variations.productId, id))
    .orderBy(asc(variations.sortOrder), asc(variations.id));

  return { ...rows[0], variations: variationRows };
}

export async function getProductNameMap(ids: number[]) {
  if (ids.length === 0) return new Map<number, string>();
  const db = await getDb();
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(inArray(products.id, ids));
  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function getSearchIndex() {
  const db = await getDb();
  const rows = await db
    .select({
      id: products.id,
      gameId: products.gameId,
      name: products.name,
      slug: products.slug,
      image: products.image,
      gameName: games.name,
    })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(and(eq(products.status, "published"), eq(products.availability, "available")))
    .orderBy(asc(products.name));

  const liveGames = await loadGameLiveness(db);
  const sellable = new Set(
    (
      await db
        .select({ productId: variations.productId })
        .from(variations)
        .where(and(eq(variations.status, "published"), eq(variations.availability, "available")))
    ).map((row) => row.productId),
  );

  return rows
    .filter((row) => sellable.has(row.id) && liveGames.get(row.gameId) === true)
    .slice(0, 500);
}
