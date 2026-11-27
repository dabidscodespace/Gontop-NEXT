import "server-only";

import { games } from "@/db/schema";
import { isGameLive, purchaseBlockReason } from "@/lib/catalog-rules";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";

/**
 * Single source for "can this be shown or bought". Storefront pages, search, the product
 * page, public APIs and checkout all read eligibility through these helpers, so a game
 * disabled in one place is hidden everywhere. Publication and availability rules live in
 * lib/catalog-rules.ts; this module adds the game-hierarchy and database lookups.
 */

type Db = Awaited<ReturnType<typeof getDb>>;

/** Liveness of each game, from the games already loaded. A game is live when it and all its ancestors are active. */
export function gameLivenessMap(rows: { id: number; isActive: boolean; parentId: number | null }[]) {
  const byId = new Map(rows.map((game) => [game.id, game]));
  return new Map(rows.map((game) => [game.id, isGameLive(game.id, byId)]));
}

/** Liveness of every game, from one query. */
export async function loadGameLiveness(db: Pick<Db, "select">): Promise<Map<number, boolean>> {
  return gameLivenessMap(await db.select({ id: games.id, isActive: games.isActive, parentId: games.parentId }).from(games));
}

/** Throws the customer-facing reason when the product (or product-level state) forbids a purchase. */
export function assertProductBuyable(product: { status: string; availability: string }, gameLive: boolean) {
  const block = purchaseBlockReason(product, gameLive);
  if (block) throw new AppError(block, 404);
}
