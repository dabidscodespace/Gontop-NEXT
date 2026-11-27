/**
 * Publication (what has been approved to show) and availability (whether it can be
 * bought right now) are separate states on products and packages. Keep this file free
 * of server-only imports: storefront pages, checkout, search and admin previews all call
 * these functions, so the rules cannot drift between them.
 */

import { AppError } from "@/lib/money";

/** Publication state. Only "published" items can reach the storefront. */
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_TYPES = ["simple", "variable"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Availability. "disabled" hides a published item; "unavailable" shows it as not buyable. */
export const AVAILABILITY_STATUSES = ["available", "unavailable", "disabled"] as const;
export type Availability = (typeof AVAILABILITY_STATUSES)[number];

export type Lifecycle = { status: string; availability: string };

/* ------------------------------------------------------------------ */
/* Transitions                                                        */
/* ------------------------------------------------------------------ */

const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

/** Availability edges. "disabled" can only be lifted back to "available". */
const AVAILABILITY_TRANSITIONS: Record<Availability, Availability[]> = {
  available: ["unavailable", "disabled"],
  unavailable: ["available", "disabled"],
  disabled: ["available"],
};

/** Publication can move only along these edges. Same-state moves are not transitions. */
export function canChangeStatus(from: string, to: string): boolean {
  if (from === to) return false;
  return (STATUS_TRANSITIONS[from as ProductStatus] ?? []).includes(to as ProductStatus);
}

/** Availability can move only along AVAILABILITY_TRANSITIONS. */
export function canChangeAvailability(from: string, to: string): boolean {
  return (AVAILABILITY_TRANSITIONS[from as Availability] ?? []).includes(to as Availability);
}

export type LifecycleOp =
  | "publish"
  | "unpublish"
  | "archive"
  | "restore"
  | "enable"
  | "disable"
  | "mark_available"
  | "mark_unavailable";

export const LIFECYCLE_OPS = [
  "publish",
  "unpublish",
  "archive",
  "restore",
  "enable",
  "disable",
  "mark_available",
  "mark_unavailable",
] as const satisfies readonly LifecycleOp[];

/**
 * The column changes a lifecycle operation makes, or a 409 when the record is
 * not in a state the operation applies to (409). Every publication and availability change goes
 * through here, so the admin service and bulk actions cannot disagree.
 */
export function availableLifecycleOps(current: Lifecycle): LifecycleOp[] {
  return LIFECYCLE_OPS.filter((op) => {
    try {
      planLifecycle(current, op);
      return true;
    } catch {
      return false;
    }
  });
}

export function planLifecycle(
  current: Lifecycle,
  op: LifecycleOp,
): { status?: ProductStatus; availability?: Availability } {
  const deny = (message: string): never => {
    throw new AppError(message, 409);
  };
  switch (op) {
    case "publish":
      if (current.status === "published") deny("Already published.");
      if (!canChangeStatus(current.status, "published")) deny("Restore the record before publishing it.");
      return { status: "published" };
    case "unpublish":
      if (current.status !== "published") deny("Only published records can be unpublished.");
      return { status: "draft" };
    case "archive":
      if (!canChangeStatus(current.status, "archived")) deny("Already archived.");
      return { status: "archived" };
    case "restore":
      if (current.status !== "archived") deny("Only archived records can be restored.");
      return { status: "draft" };
    case "enable":
      if (current.availability !== "disabled") deny("Only disabled records can be enabled.");
      return { availability: "available" };
    case "disable":
      if (!canChangeAvailability(current.availability, "disabled")) deny("Already disabled.");
      return { availability: "disabled" };
    case "mark_available":
      if (current.availability !== "unavailable") deny("Only unavailable records can be marked available.");
      return { availability: "available" };
    case "mark_unavailable":
      if (current.availability !== "available") deny("Only available records can be marked unavailable.");
      return { availability: "unavailable" };
  }
}

/* ------------------------------------------------------------------ */
/* Visibility and purchasability                                      */
/* ------------------------------------------------------------------ */

/** A package can be bought only when published and available. */
export function isSellableVariation(variation: Lifecycle): boolean {
  return variation.status === "published" && variation.availability === "available";
}

export function sellableVariations<T extends Lifecycle>(list: T[]): T[] {
  return list.filter(isSellableVariation);
}

/**
 * A game is live when it and every ancestor are active. Regional games hang off a
 * parent (games.parent_id), so disabling a parent hides its regions too.
 */
export function isGameLive(
  gameId: number,
  gamesById: Map<number, { isActive: boolean; parentId: number | null }>,
): boolean {
  const seen = new Set<number>();
  let current: number | null = gameId;
  while (current !== null) {
    if (seen.has(current) || seen.size > 10) return false;
    seen.add(current);
    const game = gamesById.get(current);
    if (!game || !game.isActive) return false;
    current = game.parentId;
  }
  return true;
}

/** Product page reachable: published and not disabled, in a live game. Unavailable products show a notice. */
export function isProductListed(product: Lifecycle, gameLive: boolean): boolean {
  return product.status === "published" && product.availability !== "disabled" && gameLive;
}

/** Product can be bought: published, available, in a live game. */
export function isProductBuyable(product: Lifecycle, gameLive: boolean): boolean {
  return product.status === "published" && product.availability === "available" && gameLive;
}

/** Customer-facing reason a checkout line is refused, or null when it may be bought. */
export function purchaseBlockReason(
  product: Lifecycle,
  gameLive: boolean,
  variation?: Lifecycle,
): string | null {
  if (!isProductBuyable(product, gameLive)) return "This product is not available.";
  if (variation && !isSellableVariation(variation)) return "One of the selected packages is not available.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Pricing                                                            */
/* ------------------------------------------------------------------ */

export type PricedVariation = {
  price: string;
  compareAtPrice: string | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
};

/**
 * Charged and displayed prices for a package at a given moment.
 *
 * Without a sale window, `price` is charged and `compareAtPrice` (if set) is
 * shown struck through. With a sale window, `price` is charged only while the
 * window is open. Outside it, the regular price (`compareAtPrice`) is charged.
 */
export function effectivePricing(variation: PricedVariation, now: Date = new Date()) {
  const regular = variation.compareAtPrice;
  const hasWindow = Boolean(variation.saleStartsAt || variation.saleEndsAt);
  if (!hasWindow || regular === null) {
    return { price: variation.price, compareAtPrice: regular, onSale: false };
  }
  const started = !variation.saleStartsAt || now >= variation.saleStartsAt;
  const notEnded = !variation.saleEndsAt || now < variation.saleEndsAt;
  if (started && notEnded) {
    return { price: variation.price, compareAtPrice: regular, onSale: true };
  }
  return { price: regular, compareAtPrice: null, onSale: false };
}

/* ------------------------------------------------------------------ */
/* Publishing gate                                                    */
/* ------------------------------------------------------------------ */

export type PublishCheckInput = {
  name: string;
  image: string | null;
  productType: string;
  topupMethodId: number | null;
  gameLive: boolean;
  variations: Array<Lifecycle & {
    price: string;
    topupMethodId: number | null;
  }>;
};

/**
 * Problems that block publishing a product. An empty array means it can be published.
 * Drafts are never purchasable, so these checks guard the moment a product goes live.
 */
export function publishProblems(input: PublishCheckInput): string[] {
  const problems: string[] = [];
  if (!input.gameLive) problems.push("Its game is disabled. Enable the game first.");
  if (!input.name.trim()) problems.push("Add a product name.");
  if (!input.image) problems.push("Add a product image.");

  if (input.productType === "simple" && input.variations.length !== 1) {
    problems.push("A simple product needs exactly one package.");
  }

  const sellable = sellableVariations(input.variations);
  if (sellable.length === 0) {
    problems.push("Publish at least one available package.");
  }
  for (const variation of sellable) {
    if (!(Number(variation.price) > 0)) {
      problems.push("Every published package needs a price above zero.");
      break;
    }
  }
  const hasMethod = sellable.every(
    (variation) => (variation.topupMethodId ?? input.topupMethodId) !== null,
  );
  if (!hasMethod) problems.push("Choose a top-up method for the product or each published package.");
  return problems;
}
