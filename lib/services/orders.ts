import "server-only";

import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { z } from "zod";

import {
  adminUsers,
  fulfillmentAttempts,
  games,
  orderHistory,
  orderItems,
  orderNotes,
  orders,
  payments,
  products,
  refunds,
  topupMethods,
  users,
  variations,
  type OrderFulfillmentStatus,
  type OrderPaymentStatus,
  type OrderStatus,
  type ProductField,
} from "@/db/schema";
import {
  effectivePricing,
  isSellableVariation,
} from "@/lib/catalog-rules";
import { newId } from "@/lib/crypto";
import { getFulfillmentProvider, type FulfillmentProvider, type FulfillmentResult } from "@/lib/fulfillment";
import { fulfillmentStatusFor, ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/lib/order-status";
import { getDb, type Tx } from "@/lib/db";
import { AppError, money, round2 } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import type { checkoutSchema } from "@/lib/validation";
import { assertProductBuyable, loadGameLiveness } from "@/lib/services/eligibility";
import { applyWalletEntry } from "@/lib/services/wallet";

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, TERMINAL_STATUSES } from "@/lib/order-status";


export function newOrderPublicId() {
  return `GT-${Date.now().toString(36).toUpperCase()}${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

export async function recordStatus(
  tx: Tx,
  input: {
    orderId: number;
    fromStatus: string | null;
    toStatus: OrderStatus;
    byType: "customer" | "admin" | "system";
    byId?: string | null;
    note?: string;
    customerVisible?: boolean;
  },
) {
  await tx.insert(orderHistory).values({
    orderId: input.orderId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    changedByType: input.byType,
    changedById: input.byId ?? null,
    // Every status change keeps a readable note, even when the caller gives none.
    note: input.note?.trim() || `Status changed to ${ORDER_STATUS_LABELS[input.toStatus]}.`,
    customerVisible: input.customerVisible ?? false,
  });
}

/**
 * Creates a direct top-up order. All prices, totals and payment portions are
 * calculated here from database records — the browser only supplies ids and
 * quantities. Wallet debits are atomic and happen in the same transaction.
 */
export async function createOrder(userId: string, input: CheckoutInput) {
  const settings = await getSettings();
  const db = await getDb();

  const productRows = await db
    .select({ product: products, game: games })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(eq(products.id, input.productId))
    .limit(1);

  const found = productRows[0];
  if (!found) {
    throw new AppError("This product is not available.", 404);
  }
  const gameLive = (await loadGameLiveness(db)).get(found.product.gameId) ?? false;
  assertProductBuyable(found.product, gameLive);

  const variationIds = [...new Set(input.items.map((item) => item.variationId))];
  const variationRows = await db
    .select()
    .from(variations)
    .where(and(eq(variations.productId, found.product.id), inArray(variations.id, variationIds)));

  if (variationRows.length !== variationIds.length) {
    throw new AppError("One of the selected packages is invalid.", 422);
  }

  const quantityByVariation = new Map<number, number>();
  for (const item of input.items) {
    quantityByVariation.set(
      item.variationId,
      (quantityByVariation.get(item.variationId) ?? 0) + item.quantity,
    );
  }

  // Required customer fields come from the selected packages: each package uses
  // its own fields when overridden, otherwise the product's. Fields are merged by
  // id, so a mixed cart asks for everything its packages need.
  const selectedVariations = variationIds.map((id) => variationRows.find((v) => v.id === id)!);
  const fieldsById = new Map<string, ProductField>();
  for (const variation of selectedVariations) {
    for (const field of variation.fields ?? found.product.fields ?? []) {
      if (!fieldsById.has(field.id)) fieldsById.set(field.id, field);
    }
  }
  const methodIds = new Set(
    selectedVariations
      .map((variation) => variation.topupMethodId ?? found.product.topupMethodId)
      .filter((id): id is number => id !== null),
  );
  const methodNames = new Map<number, string>();
  if (methodIds.size > 0) {
    const methodRows = await db
      .select({ id: topupMethods.id, name: topupMethods.name })
      .from(topupMethods)
      .where(inArray(topupMethods.id, [...methodIds]));
    for (const row of methodRows) methodNames.set(row.id, row.name);
  }

  const playerFields: Record<string, string> = {};
  for (const field of fieldsById.values()) {
    const value = String(input.playerFields[field.id] ?? "").trim();
    if (field.required && !value) {
      throw new AppError(`${field.label} is required.`, 422);
    }
    if (value && (field.type === "select" || field.type === "radio") && field.options?.length) {
      if (!field.options.some((option) => option.value === value)) {
        throw new AppError(`Choose a valid option for ${field.label}.`, 422);
      }
    }
    if (value) playerFields[field.label] = value.slice(0, 300);
  }

  let subtotal = 0;
  let itemCount = 0;
  const lineItems: Array<{
    variation: (typeof variationRows)[number];
    unitPrice: string;
    quantity: number;
    lineTotal: number;
  }> = [];
  const now = new Date();

  for (const variationId of variationIds) {
    const variation = variationRows.find((v) => v.id === variationId);
    const quantity = quantityByVariation.get(variationId) ?? 0;

    if (!variation || !isSellableVariation(variation)) {
      throw new AppError("One of the selected packages is not available.", 409);
    }
    if (variation.stockStatus === "outofstock") {
      throw new AppError(`${variation.name} is out of stock.`, 409);
    }
    if (variation.stockQuantity !== null && quantity > variation.stockQuantity) {
      throw new AppError(`Only ${variation.stockQuantity} of ${variation.name} left.`, 409);
    }

    // Server-side price: includes any active sale window at this moment.
    const unitPrice = effectivePricing(variation, now).price;
    const lineTotal = round2(money(unitPrice) * quantity);
    subtotal = round2(subtotal + lineTotal);
    itemCount += quantity;
    lineItems.push({ variation, unitPrice, quantity, lineTotal });
  }

  if (subtotal < settings.minOrderAmount) {
    throw new AppError(`Minimum order amount is ৳${settings.minOrderAmount}.`, 422);
  }

  let walletPortion = 0;
  if (input.paymentType === "wallet") {
    if (!settings.walletPaymentsEnabled) {
      throw new AppError("Wallet payments are currently disabled.", 409);
    }
    walletPortion = subtotal;
  } else if (input.paymentType === "hybrid") {
    if (!settings.walletPaymentsEnabled) {
      throw new AppError("Wallet payments are currently disabled.", 409);
    }
    walletPortion = round2(Math.min(input.walletAmount ?? 0, subtotal));
    if (walletPortion <= 0) {
      throw new AppError("Enter a wallet amount to use.", 422);
    }
    if (round2(subtotal - walletPortion) < settings.minOrderAmount) {
      throw new AppError(
        `The gateway amount must be at least ৳${settings.minOrderAmount}.`,
        422,
      );
    }
  }

  const gatewayPortion = round2(subtotal - walletPortion);
  // Payment is tracked separately. A fully paid order enters Processing
  // immediately; there is no intermediate lifecycle status named "Paid".
  const status: OrderStatus = gatewayPortion === 0 ? "processing" : "pending_payment";
  const publicId = newOrderPublicId();

  const result = await db.transaction(async (tx) => {
    // Re-check the packages under row locks: the prices and availability above were
    // read before this transaction, so an admin edit in between must not be priced in.
    const lockedVariations = await tx
      .select()
      .from(variations)
      .where(inArray(variations.id, variationIds))
      .for("update");
    const [freshProduct] = await tx
      .select({ status: products.status, availability: products.availability })
      .from(products)
      .where(eq(products.id, found.product.id))
      .limit(1);
    if (!freshProduct) throw new AppError("One of the selected packages is invalid.", 422);
    assertProductBuyable(freshProduct, gameLive);
    for (const line of lineItems) {
      const current = lockedVariations.find((v) => v.id === line.variation.id);
      if (
        !current ||
        !isSellableVariation(current) ||
        current.stockStatus === "outofstock" ||
        effectivePricing(current, now).price !== line.unitPrice
      ) {
        throw new AppError("Your cart changed while checking out. Review it and try again.", 409);
      }
    }

    // Reserve stock atomically.
    for (const line of lineItems) {
      if (line.variation.stockQuantity === null) continue;
      const updated = await tx
        .update(variations)
        .set({
          stockQuantity: sql`${variations.stockQuantity} - ${line.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(variations.id, line.variation.id),
            gte(variations.stockQuantity, line.quantity),
          ),
        )
        .returning({ id: variations.id });

      if (!updated[0]) {
        throw new AppError(`${line.variation.name} just went out of stock.`, 409);
      }
    }

    const [order] = await tx
      .insert(orders)
      .values({
        publicId,
        userId,
        status,
        paymentStatus: gatewayPortion === 0 ? "paid" : "pending",
        fulfillmentStatus: gatewayPortion === 0 ? "processing" : "pending",
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        walletAmount: walletPortion.toFixed(2),
        gatewayAmount: gatewayPortion.toFixed(2),
        itemCount,
        paymentMethod:
          gatewayPortion === 0 ? "wallet" : walletPortion > 0 ? "uddoktapay+wallet" : "uddoktapay",
        playerFields,
        customerNote: input.customerNote ?? "",
        paidAt: gatewayPortion === 0 ? new Date() : null,
      })
      .returning();

    if (walletPortion > 0) {
      await applyWalletEntry(tx, {
        userId,
        amount: -walletPortion,
        type: "order_payment",
        description: `Payment for order ${publicId}`,
        referenceType: "order",
        referenceId: publicId,
        idempotent: true,
      });

      await tx.insert(payments).values({
        id: newId(),
        userId,
        orderId: order.id,
        type: "order",
        gateway: "wallet",
        amount: walletPortion.toFixed(2),
        status: "completed",
        paymentMethod: "Wallet",
        completedAt: new Date(),
      });
    }

    await tx.insert(orderItems).values(
      lineItems.map((line) => ({
        orderId: order.id,
        productId: found.product.id,
        variationId: line.variation.id,
        productName: found.product.name,
        variationName: line.variation.name,
        topupMethod:
          methodNames.get(line.variation.topupMethodId ?? found.product.topupMethodId ?? -1) ?? "",
        sku: line.variation.sku,
        image: line.variation.image ?? found.product.image,
        unitPrice: money(line.unitPrice).toFixed(2),
        quantity: line.quantity,
        lineTotal: line.lineTotal.toFixed(2),
      })),
    );

    await recordStatus(tx, {
      orderId: order.id,
      fromStatus: null,
      toStatus: status,
      byType: "customer",
      byId: userId,
      note:
        status === "processing"
          ? "Paid with wallet. Processing started."
          : "Order placed, awaiting payment.",
    });

    return {
      orderId: order.id,
      publicId: order.publicId,
      status,
      total: subtotal,
      walletPortion,
      gatewayPortion,
    };
  });

  if (result.status === "processing") {
    return { ...result, status: await startProcessingAfterPayment(result.orderId) };
  }
  return result;
}

/** Cancels an unpaid order and restores any wallet portion that was debited. */
export async function cancelUnpaidOrder(orderId: number, reason: string) {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
      .for("update");

    if (!order) throw new AppError("Order not found.", 404);
    if (order.status !== "pending_payment") return order;

    const walletAmount = money(order.walletAmount);
    if (walletAmount > 0) {
      await applyWalletEntry(tx, {
        userId: order.userId,
        amount: walletAmount,
        type: "refund",
        description: `Wallet portion returned for cancelled order ${order.publicId}`,
        referenceType: "order_cancel",
        referenceId: order.publicId,
        idempotent: true,
      });
    }

    await tx
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(
        and(
          eq(payments.orderId, order.id),
          eq(payments.type, "order"),
          inArray(payments.status, ["initiated", "pending"]),
        ),
      );

    const [updated] = await tx
      .update(orders)
      .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();
    await releaseOrderStock(tx, order.id);

    await recordStatus(tx, {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "cancelled",
      byType: "system",
      note: reason,
    });

    return updated;
  });
}

export async function getUserOrders(userId: string, limit = 50) {
  const db = await getDb();

  return db
    .select({
      id: orders.id,
      publicId: orders.publicId,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      itemCount: orders.itemCount,
      createdAt: orders.createdAt,
      productName: sql<string>`(
        select ${orderItems.productName} from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
        order by ${orderItems.id} asc limit 1
      )`,
      image: sql<string | null>`(
        select ${orderItems.image} from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
        order by ${orderItems.id} asc limit 1
      )`,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getOrderWithDetails(publicId: string) {
  const db = await getDb();

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.publicId, publicId))
    .limit(1);

  const order = rows[0];
  if (!order) return null;

  const [items, history, orderPayments, visibleNotes, attempts] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(orderItems.id)),
    db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, order.id))
      .orderBy(asc(orderHistory.createdAt)),
    db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.createdAt)),
    db
      .select({ id: orderNotes.id, content: orderNotes.content, createdAt: orderNotes.createdAt })
      .from(orderNotes)
      .where(and(eq(orderNotes.orderId, order.id), eq(orderNotes.customerVisible, true)))
      .orderBy(asc(orderNotes.createdAt)),
    db
      .select()
      .from(fulfillmentAttempts)
      .where(eq(fulfillmentAttempts.orderId, order.id))
      .orderBy(desc(fulfillmentAttempts.createdAt)),
  ]);

  return { order, items, history, payments: orderPayments, visibleNotes, attempts };
}

export async function getOrderStatusForUser(publicId: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      publicId: orders.publicId,
      status: orders.status,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(eq(orders.publicId, publicId), eq(orders.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}



/** Returns reserved stock for an order's tracked variations. Call once, when the order is closed without delivery. */
export async function releaseOrderStock(tx: Tx, orderId: number) {
  const lines = await tx
    .select({ variationId: orderItems.variationId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  for (const line of lines) {
    if (!line.variationId) continue;
    await tx
      .update(variations)
      .set({
        stockQuantity: sql`${variations.stockQuantity} + ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(and(eq(variations.id, line.variationId), isNotNull(variations.stockQuantity)));
  }
}

/** A stuck in-progress attempt (e.g. a crash mid-call) can be reclaimed after this long. */
const STALE_IN_PROGRESS_MS = 10 * 60 * 1000;

export async function updateOrderStatus(input: {
  orderId: number;
  status: OrderStatus;
  note?: string;
  customerVisible?: boolean;
  adminId: string;
}) {
  const { order, changed } = await applyOrderStatusChange(input);
  if (input.status === "processing" && changed) {
    const provider = getFulfillmentProvider();
    if (provider.automatic) {
      return runAutomaticFulfillment(order.id, provider, input.adminId);
    }
  }
  return order;
}

async function applyOrderStatusChange(input: {
  orderId: number;
  status: OrderStatus;
  note?: string;
  customerVisible?: boolean;
  adminId: string | null;
}): Promise<{ order: typeof orders.$inferSelect; changed: boolean }> {
  if (input.status === "refunded") {
    throw new AppError("Use the refund workflow to mark an order as refunded.", 422);
  }

  const db = await getDb();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .for("update");

    if (!order) throw new AppError("Order not found.", 404);

    if (order.status === input.status) return { order, changed: false };

    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        `Cannot change an order from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[input.status]}.`,
        409,
      );
    }

    if (input.status === "processing" || input.status === "completed") {
      if (!order.paidAt) {
        throw new AppError("This order has not been paid yet.", 409);
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: input.status,
        ...(fulfillmentStatusFor(input.status)
          ? { fulfillmentStatus: fulfillmentStatusFor(input.status)! }
          : {}),
        updatedAt: new Date(),
        completedAt: input.status === "completed" ? new Date() : order.completedAt,
      })
      .where(eq(orders.id, order.id))
      .returning();

    // Unpaid orders that are cancelled or failed never reach fulfillment, so their reserved stock returns.
    if (!order.paidAt && (input.status === "cancelled" || input.status === "failed")) {
      await releaseOrderStock(tx, order.id);
    }

    await recordStatus(tx, {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: input.status,
      byType: input.adminId ? "admin" : "system",
      byId: input.adminId,
      note: input.note ?? "",
      customerVisible: input.customerVisible ?? false,
    });

    return { order: updated, changed: true };
  });
}

/**
 * Called after payment has atomically moved an order to Processing. It starts
 * automatic fulfillment when configured; otherwise the order remains in
 * Processing until an admin completes it. Fulfillment failures are recorded on
 * the order and never roll back a payment that has already succeeded.
 */
export async function startProcessingAfterPayment(orderId: number): Promise<OrderStatus> {
  const db = await getDb();
  try {
    const [order] = await db
      .select({ id: orders.id, status: orders.status, paidAt: orders.paidAt })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) throw new AppError("Order not found.", 404);

    const provider = getFulfillmentProvider();
    if (order.status === "processing" && order.paidAt && provider.automatic) {
      await runAutomaticFulfillment(order.id, provider, null);
    }
  } catch (error) {
    console.error(`Automatic processing failed for order ${orderId}`, error);
  }

  const [current] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return current?.status ?? "pending_payment";
}

/**
 * Runs an automatic provider for a processing order. The attempt is claimed
 * under the order row lock so concurrent admin clicks cannot both call the
 * supplier, and a completed attempt blocks any further run (no double top-up).
 */
async function runAutomaticFulfillment(
  orderId: number,
  provider: FulfillmentProvider,
  adminId: string | null,
) {
  const db = await getDb();

  const claimed = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
      .for("update");
    if (!order) throw new AppError("Order not found.", 404);

    const attempts = await tx
      .select()
      .from(fulfillmentAttempts)
      .where(eq(fulfillmentAttempts.orderId, orderId))
      .orderBy(desc(fulfillmentAttempts.id));

    if (attempts.some((attempt) => attempt.outcome === "completed")) {
      throw new AppError("This order has already been fulfilled.", 409);
    }
    const live = attempts.find(
      (attempt) =>
        attempt.outcome === "in_progress" &&
        Date.now() - attempt.createdAt.getTime() < STALE_IN_PROGRESS_MS,
    );
    if (live) {
      throw new AppError("Fulfillment is already in progress for this order.", 409);
    }

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id));

    const [attempt] = await tx
      .insert(fulfillmentAttempts)
      .values({
        orderId,
        provider: provider.key,
        outcome: "in_progress",
        adminId,
      })
      .returning();

    return {
      attemptId: attempt.id,
      snapshot: {
        orderId,
        publicId: order.publicId,
        productName: items[0]?.productName ?? "",
        variationNames: items.map((item) => item.variationName),
        playerFields: order.playerFields,
      },
    };
  });

  let result: FulfillmentResult;
  try {
    result = await provider.fulfill(claimed.snapshot);
  } catch (error) {
    result = {
      outcome: "failed",
      message: error instanceof Error ? error.message : "Provider error.",
      retryable: true,
    };
  }

  const reference = result.outcome === "completed" ? result.reference ?? "" : "";
  const message =
    result.outcome === "manual_required" ? result.message : result.message ?? "";
  await db
    .update(fulfillmentAttempts)
    .set({
      outcome: result.outcome,
      message,
      reference,
      retryable: result.outcome === "failed" ? Boolean(result.retryable) : false,
      updatedAt: new Date(),
    })
    .where(eq(fulfillmentAttempts.id, claimed.attemptId));

  if (result.outcome === "completed") {
    const { order } = await applyOrderStatusChange({
      orderId,
      status: "completed",
      note: `Fulfilled by ${provider.label}${reference ? ` (ref ${reference})` : ""}`,
      adminId,
    });
    return order;
  }
  if (result.outcome === "failed") {
    const { order } = await applyOrderStatusChange({
      orderId,
      status: "failed",
      note: `${provider.label} failed: ${result.message}`,
      adminId,
    });
    return order;
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return order;
}

export async function listFulfillmentAttempts(orderId: number) {
  const db = await getDb();
  return db
    .select()
    .from(fulfillmentAttempts)
    .where(eq(fulfillmentAttempts.orderId, orderId))
    .orderBy(desc(fulfillmentAttempts.createdAt));
}

function adminOrderSearchCondition(rawSearch?: string) {
  const search = rawSearch?.trim();
  if (!search) return undefined;

  const pattern = `%${search}%`;
  const exactOrderNumber = /^\d+$/.test(search) && Number.isSafeInteger(Number(search));
  return sql`(
    ${orders.publicId} ilike ${pattern}
    or ${exactOrderNumber ? sql`${orders.orderNumber} = ${Number(search)}` : sql`false`}
    or ${users.email} ilike ${pattern}
    or coalesce(${users.name}, '') ilike ${pattern}
    or coalesce(${users.phone}, '') ilike ${pattern}
    or cast(${orders.playerFields} as text) ilike ${pattern}
    or exists (
      select 1 from ${orderItems} oi
      where oi.order_id = ${orders.id}
      and (
        oi.product_name ilike ${pattern}
        or coalesce(oi.sku, '') ilike ${pattern}
        or cast(oi.imported_data as text) ilike ${pattern}
      )
    )
    or exists (
      select 1 from ${payments} p
      where p.order_id = ${orders.id}
      and (
        coalesce(p.transaction_id, '') ilike ${pattern}
        or coalesce(p.sender_number, '') ilike ${pattern}
        or coalesce(p.invoice_id, '') ilike ${pattern}
      )
    )
  )`;
}

export async function getAdminOrders(filters: {
  status?: OrderStatus | "all";
  paymentStatus?: OrderPaymentStatus | "all";
  fulfillmentStatus?: OrderFulfillmentStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, filters.pageSize ?? 20));

  const conditions = [];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  }
  if (filters.fulfillmentStatus && filters.fulfillmentStatus !== "all") {
    conditions.push(eq(orders.fulfillmentStatus, filters.fulfillmentStatus));
  }
  const searchCondition = adminOrderSearchCondition(filters.search);
  if (searchCondition) conditions.push(searchCondition);

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        total: orders.total,
        itemCount: orders.itemCount,
        createdAt: orders.createdAt,
        customerEmail: users.email,
        customerName: users.name,
        productName: sql<string>`(
          select ${orderItems.productName} from ${orderItems}
          where ${orderItems.orderId} = ${orders.id}
          order by ${orderItems.id} asc limit 1
        )`,
        productImage: sql<string | null>`(
          select ${orderItems.image} from ${orderItems}
          where ${orderItems.orderId} = ${orders.id}
          order by ${orderItems.id} asc limit 1
        )`,
        transactionId: sql<string | null>`(
          select ${payments.transactionId} from ${payments}
          where ${payments.orderId} = ${orders.id} and ${payments.type} = 'order'
          order by ${payments.createdAt} desc limit 1
        )`,
        senderNumber: sql<string | null>`(
          select ${payments.senderNumber} from ${payments}
          where ${payments.orderId} = ${orders.id} and ${payments.type} = 'order'
          order by ${payments.createdAt} desc limit 1
        )`,
        paymentMethod: orders.paymentMethod,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(where),
  ]);

  return {
    rows,
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(totalRows[0]?.value ?? 0) / pageSize)),
  };
}

export async function getOrderStatusCounts(search?: string) {
  const db = await getDb();
  const rows = await db
    .select({ status: orders.status, value: count() })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(adminOrderSearchCondition(search))
    .groupBy(orders.status);
  const counts: Record<string, number> = {};
  let all = 0;
  for (const row of rows) {
    counts[row.status] = Number(row.value);
    all += Number(row.value);
  }
  return { counts, all };
}

export async function getAdminOrder(orderId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      order: orders,
      customerEmail: users.email,
      customerName: users.name,
      customerPhone: users.phone,
      customerId: users.id,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [itemRows, history, notes, orderPayments, attempts] = await Promise.all([
    db
      .select({ item: orderItems, gameName: games.name })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(games, eq(games.id, products.gameId))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id)),
    db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(asc(orderHistory.createdAt)),
    db
      .select()
      .from(orderNotes)
      .where(eq(orderNotes.orderId, orderId))
      .orderBy(desc(orderNotes.createdAt)),
    db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt)),
    listFulfillmentAttempts(orderId),
  ]);

  const items = itemRows.map((r) => ({ ...r.item, gameName: r.gameName ?? "" }));
  return { ...row, items, history, notes, payments: orderPayments, attempts };
}

/** Other recent orders from the same customer, newest first (used on the order detail page). */
export async function getCustomerRecentOrders(userId: string, excludeOrderId: number, limit = 5) {
  const db = await getDb();
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), sql`${orders.id} <> ${excludeOrderId}`))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

/** Lifetime paid-order summary for one customer (used on the order detail header). */
export async function getCustomerPaidSummary(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      count: count(),
      total: sql<string>`coalesce(sum(${orders.total}), 0)::text`,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), sql`${orders.paidAt} is not null`));
  return { count: Number(row?.count ?? 0), total: row?.total ?? "0" };
}

/** Number of other orders a customer has placed (used by the admin quick view). */
export async function countCustomerOtherOrders(userId: string, excludeOrderId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(eq(orders.userId, userId), sql`${orders.id} <> ${excludeOrderId}`));
  return Number(row?.count ?? 0);
}

/** Display labels (name or email) for admin users who changed an order. */
export async function getAdminLabels(ids: string[]) {
  const labels = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return labels;
  const db = await getDb();
  const rows = await db
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role })
    .from(adminUsers)
    .where(inArray(adminUsers.id, unique));
  for (const row of rows) labels.set(row.id, `${row.name || row.email} (${row.role})`);
  return labels;
}

export async function deleteOrderNote(orderId: number, noteId: number) {
  const db = await getDb();
  const deleted = await db
    .delete(orderNotes)
    .where(and(eq(orderNotes.id, noteId), eq(orderNotes.orderId, orderId)))
    .returning({ id: orderNotes.id });
  if (deleted.length === 0) throw new AppError("Note not found.", 404);
}

export async function saveDeliveryMessage(orderId: number, message: string) {
  const db = await getDb();
  const [updated] = await db
    .update(orders)
    .set({ deliveryMessage: message, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });
  if (!updated) throw new AppError("Order not found.", 404);
}

/** Refund records for one order, newest first. */
export async function listOrderRefunds(orderId: number) {
  const db = await getDb();
  return db.select().from(refunds).where(eq(refunds.orderId, orderId)).orderBy(desc(refunds.createdAt));
}
