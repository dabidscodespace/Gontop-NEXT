import "server-only";

import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import { orderHistory, orders, payments, refunds } from "@/db/schema";
import { newId } from "@/lib/crypto";
import { getDb, type Tx } from "@/lib/db";
import { AppError, money, round2 } from "@/lib/money";
import { refundCharge } from "@/lib/uddoktapay";
import { recordStatus, releaseOrderStock } from "@/lib/services/orders";
import { applyWalletEntry } from "@/lib/services/wallet";

export async function getOrderRefundSummary(orderId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      refunded: sql<string>`coalesce(sum(${refunds.amount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(refunds)
    .where(and(eq(refunds.orderId, orderId), eq(refunds.status, "completed")));

  return {
    refunded: money(rows[0]?.refunded),
    count: Number(rows[0]?.count ?? 0),
  };
}

/**
 * Refunds are capped by both the order total and the original payment, so the
 * same money cannot be returned twice through wallet and gateway paths.
 */
export async function refundOrder(input: {
  orderId: number;
  amount: number;
  method: "wallet" | "gateway";
  reason: string;
  adminId: string;
  externalReference?: string;
  recordOnly?: boolean;
}) {
  const amount = round2(input.amount);
  if (amount <= 0) throw new AppError("Enter a refund amount.", 422);

  const db = await getDb();
  const refundId = newId();

  if (input.method === "wallet") {
    return db.transaction(async (tx) => {
      const order = await lockOrderForRefund(tx, input.orderId);
      await assertRefundable(tx, order, amount, null);

      const entry = await applyWalletEntry(tx, {
        userId: order.userId,
        amount,
        type: "refund",
        description: `Refund for order ${order.publicId}: ${input.reason}`,
        referenceType: "refund",
        referenceId: refundId,
        adminId: input.adminId,
      });

      await tx.insert(refunds).values({
        id: refundId,
        orderId: order.id,
        userId: order.userId,
        amount: amount.toFixed(2),
        method: "wallet",
        reason: input.reason,
        status: "completed",
        processedByAdminId: input.adminId,
      });

      const fullyRefunded = await finalizeRefund(tx, order, {
        amount,
        adminId: input.adminId,
        note: `Refunded ৳${amount.toFixed(2)} to wallet`,
      });

      return { refundId, balanceAfter: entry?.balanceAfter ?? null, fullyRefunded };
    });
  }

  // Gateway refund: reserve a pending row under the order lock, call the gateway
  // outside any transaction, then settle. In-flight rows count against the cap, so
  // concurrent or repeated clicks cannot return the same money twice.
  const reservation = await db.transaction(async (tx) => {
    const order = await lockOrderForRefund(tx, input.orderId);
    const payment = await assertRefundable(tx, order, amount, "gateway");
    if (!payment) throw new AppError("No gateway payment is available for this order.", 409);

    let gatewayReference = input.externalReference?.trim() || null;
    if (input.recordOnly) {
      if (!gatewayReference) {
        throw new AppError(
          "Enter the reference of the externally processed refund before recording it.",
          422,
        );
      }
    } else if (!payment.transactionId || !payment.paymentMethod) {
      throw new AppError(
        "The original transaction details are incomplete. Record an externally processed refund instead.",
        409,
      );
    }

    await tx.insert(refunds).values({
      id: refundId,
      orderId: order.id,
      paymentId: payment.id,
      userId: order.userId,
      amount: amount.toFixed(2),
      method: "gateway",
      reason: input.reason,
      gatewayReference,
      status: "pending",
      processedByAdminId: input.adminId,
    });
    await recordStatus(tx, {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      byType: "admin",
      byId: input.adminId,
      note: `Gateway refund of ৳${amount.toFixed(2)} requested (pending).`,
    });

    return { order, payment, gatewayReference, recordOnly: Boolean(input.recordOnly) };
  });

  const { order, payment } = reservation;
  let gatewayReference = reservation.gatewayReference;

  if (!reservation.recordOnly) {
    try {
      const result = await refundCharge({
        transactionId: payment.transactionId!,
        paymentMethod: payment.paymentMethod!,
        amount,
        productName: `GONTOP order ${order.publicId}`,
        reason: input.reason,
      });
      gatewayReference = result.reference ?? gatewayReference;
    } catch (error) {
      await db.update(refunds).set({ status: "failed" }).where(eq(refunds.id, refundId));
      await db.transaction((tx) =>
        recordStatus(tx, {
          orderId: reservation.order.id,
          fromStatus: reservation.order.status,
          toStatus: reservation.order.status,
          byType: "admin",
          byId: input.adminId,
          note: `Gateway refund of ৳${amount.toFixed(2)} failed: ${error instanceof Error ? error.message : "unknown gateway error"}.`,
        }),
      );
      throw error;
    }
  }

  return db.transaction(async (tx) => {
    await tx
      .update(refunds)
      .set({ status: "completed", gatewayReference })
      .where(eq(refunds.id, refundId));

    const gatewayTotal = await refundedTotal(tx, and(eq(refunds.paymentId, payment.id), eq(refunds.method, "gateway")));
    await tx
      .update(payments)
      .set({
        status: round2(gatewayTotal) >= money(payment.amount) ? "refunded" : payment.status,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    const fullyRefunded = await finalizeRefund(tx, order, {
      amount,
      adminId: input.adminId,
      note: `Refunded ৳${amount.toFixed(2)} to the original payment`,
    });

    return { refundId, gatewayReference, fullyRefunded };
  });
}

type RefundTx = Tx;

/** Sum of refunds that are completed or still in flight (pending counts as reserved). */
async function refundedTotal(tx: RefundTx, condition: SQL | undefined) {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` })
    .from(refunds)
    .where(and(condition, inArray(refunds.status, ["completed", "pending"])));
  return money(row?.total);
}

async function lockOrderForRefund(tx: RefundTx, orderId: number) {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
    .for("update");
  if (!order) throw new AppError("Order not found.", 404);
  return order;
}

/** Re-checks payment and caps under the order lock. Returns the gateway payment when `method` is gateway. */
async function assertRefundable(
  tx: RefundTx,
  order: typeof orders.$inferSelect,
  amount: number,
  method: "gateway" | null,
) {
  const paidRows = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.orderId, order.id),
        eq(payments.type, "order"),
        eq(payments.status, "completed"),
      ),
    );
  if (paidRows.length === 0 || !order.paidAt) {
    throw new AppError("Unpaid orders cannot be refunded.", 409);
  }

  const reserved = await refundedTotal(tx, eq(refunds.orderId, order.id));
  const remaining = round2(money(order.total) - reserved);
  if (amount > remaining) {
    throw new AppError(`Only ৳${remaining.toFixed(2)} remains refundable on this order.`, 409);
  }

  if (method !== "gateway") return null;

  const payment =
    paidRows.find((p) => p.gateway === "uddoktapay" && p.transactionId) ??
    paidRows.find((p) => p.gateway === "uddoktapay");
  if (!payment) {
    throw new AppError("No gateway payment is available for this order. Use a wallet refund.", 409);
  }

  const gatewayReserved = await refundedTotal(
    tx,
    and(eq(refunds.paymentId, payment.id), eq(refunds.method, "gateway")),
  );
  const gatewayRemaining = round2(money(payment.amount) - gatewayReserved);
  if (amount > gatewayRemaining) {
    throw new AppError(
      `Only ৳${gatewayRemaining.toFixed(2)} can be refunded through the original payment.`,
      409,
    );
  }
  return payment;
}

/** Updates the order's refund state. Returns whether the order is now fully refunded. */
async function finalizeRefund(
  tx: RefundTx,
  order: typeof orders.$inferSelect,
  input: { amount: number; adminId: string; note: string },
) {
  const total = await refundedTotal(tx, eq(refunds.orderId, order.id));
  const fullyRefunded = round2(total) >= money(order.total);

  if (!fullyRefunded) {
    await tx
      .update(orders)
      .set({ paymentStatus: "partially_refunded", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await recordStatus(tx, {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      byType: "admin",
      byId: input.adminId,
      note: `${input.note}. Payment partially refunded; order status unchanged.`,
    });
    return false;
  }

  await tx
    .update(orders)
    .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  await tx.insert(orderHistory).values({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: "refunded",
    changedByType: "admin",
    changedById: input.adminId,
    note: input.note,
  });
  // Stock comes back only when nothing was delivered yet; a supplier may already have delivered
  // an order that is still processing or on hold, so those are never restocked automatically.
  if (order.fulfillmentStatus === "pending" || order.fulfillmentStatus === "failed") {
    await releaseOrderStock(tx, order.id);
  }
  return true;
}

/**
 * Settles a gateway refund that was left `pending` (for example, the process stopped after the
 * gateway accepted it). `completed` requires the gateway's reference; `failed` releases the reserved amount.
 */
export async function resolvePendingGatewayRefund(input: {
  refundId: string;
  outcome: "completed" | "failed";
  gatewayReference?: string;
  adminId: string;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [pendingRefund] = await tx
      .select({ orderId: refunds.orderId })
      .from(refunds)
      .where(eq(refunds.id, input.refundId))
      .limit(1);
    if (!pendingRefund) throw new AppError("Refund not found.", 404);

    // Lock the order first, matching the refund creation path, then re-read the refund row.
    const order = await lockOrderForRefund(tx, pendingRefund.orderId);
    const [refund] = await tx
      .select()
      .from(refunds)
      .where(eq(refunds.id, input.refundId))
      .limit(1)
      .for("update");
    if (!refund || refund.status !== "pending" || refund.method !== "gateway") {
      throw new AppError("Only pending gateway refunds can be resolved.", 409);
    }

    if (input.outcome === "failed") {
      await tx.update(refunds).set({ status: "failed" }).where(eq(refunds.id, refund.id));
      await recordStatus(tx, {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        byType: "admin",
        byId: input.adminId,
        note: `Pending gateway refund of ৳${refund.amount} marked failed by admin.`,
      });
      return { fullyRefunded: false };
    }

    const gatewayReference = input.gatewayReference?.trim() || refund.gatewayReference;
    if (!gatewayReference) {
      throw new AppError("Enter the gateway refund reference to mark this refund completed.", 422);
    }
    await tx
      .update(refunds)
      .set({ status: "completed", gatewayReference })
      .where(eq(refunds.id, refund.id));

    if (refund.paymentId) {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, refund.paymentId))
        .limit(1);
      if (payment) {
        const gatewayTotal = await refundedTotal(
          tx,
          and(eq(refunds.paymentId, payment.id), eq(refunds.method, "gateway")),
        );
        await tx
          .update(payments)
          .set({
            status: round2(gatewayTotal) >= money(payment.amount) ? "refunded" : payment.status,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      }
    }

    const fullyRefunded = await finalizeRefund(tx, order, {
      amount: money(refund.amount),
      adminId: input.adminId,
      note: `Pending gateway refund of ৳${money(refund.amount).toFixed(2)} confirmed by admin`,
    });
    return { fullyRefunded };
  });
}

/** Gateway refunds still pending settlement; each one blocks its amount on the order. */
export async function countPendingGatewayRefunds() {
  const db = await getDb();
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(refunds)
    .where(and(eq(refunds.status, "pending"), eq(refunds.method, "gateway")));
  return Number(row?.value ?? 0);
}

export async function listRefunds(orderId?: number) {
  const db = await getDb();
  const query = db.select().from(refunds);
  if (orderId) {
    return query.where(eq(refunds.orderId, orderId)).orderBy(refunds.createdAt);
  }
  return query.orderBy(refunds.createdAt).limit(100);
}

export async function adminRefundableOrders(limit = 20) {
  const db = await getDb();
  return db
    .select({
      id: orders.id,
      publicId: orders.publicId,
      total: orders.total,
      status: orders.status,
    })
    .from(orders)
    .where(inArray(orders.status, ["processing", "completed", "failed", "on_hold", "cancelled"]))
    .orderBy(orders.createdAt)
    .limit(limit);
}
