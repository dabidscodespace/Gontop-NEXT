import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  orderHistory,
  orderNotes,
  orders,
  payments,
  users,
  type OrderStatus,
} from "@/db/schema";
import { newId } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError, money, sameAmount } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { createCharge, paymentGatewayConfigured, verifyCharge } from "@/lib/uddoktapay";
import { absoluteUrl } from "@/lib/urls";
import { startProcessingAfterPayment } from "@/lib/services/orders";
import { applyWalletEntry } from "@/lib/services/wallet";

export async function initOrderGatewayPayment(orderId: number, userId: string) {
  if (!paymentGatewayConfigured()) {
    throw new AppError(
      "Online payments are not configured yet. Please use your wallet or try later.",
      503,
    );
  }

  const db = await getDb();
  const rows = await db
    .select({ order: orders, email: users.email, name: users.name })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const row = rows[0];
  if (!row || row.order.userId !== userId) {
    throw new AppError("Order not found.", 404);
  }
  if (row.order.status !== "pending_payment") {
    throw new AppError("This order is not awaiting payment.", 409);
  }

  const amount = money(row.order.gatewayAmount);
  if (amount < 1) throw new AppError("There is no gateway amount to pay.", 422);

  const publicId = row.order.publicId;
  const charge = await createCharge({
    fullName: row.order.playerFields["Player Name"] || row.name || "GONTOP customer",
    email: row.email,
    amount,
    metadata: {
      order_id: String(row.order.id),
      order_public_id: publicId,
      user_id: userId,
      type: "order",
    },
    redirectUrl: await absoluteUrl(`/orders/${publicId}`),
    cancelUrl: await absoluteUrl(`/orders/${publicId}?cancelled=1`),
    webhookUrl: await absoluteUrl("/api/webhooks/uddoktapay"),
  });

  await db.insert(payments).values({
    id: newId(),
    userId,
    orderId,
    type: "order",
    gateway: "uddoktapay",
    invoiceId: charge.invoiceId,
    amount: amount.toFixed(2),
    status: "initiated",
  });

  await db
    .update(orders)
    .set({ paymentMethod: "uddoktapay", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return { paymentUrl: charge.paymentUrl, invoiceId: charge.invoiceId, amount };
}

export async function initWalletDeposit(userId: string, requestedAmount: number) {
  if (!paymentGatewayConfigured()) {
    throw new AppError("Online deposits are not configured yet.", 503);
  }

  const settings = await getSettings();
  if (!settings.walletDepositsEnabled) {
    throw new AppError("Wallet deposits are currently disabled.", 409);
  }

  const amount = money(requestedAmount);
  if (amount < settings.minDepositAmount) {
    throw new AppError(`Minimum deposit is ৳${settings.minDepositAmount}.`, 422);
  }
  if (amount > settings.maxDepositAmount) {
    throw new AppError(`Maximum deposit is ৳${settings.maxDepositAmount}.`, 422);
  }

  const db = await getDb();
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new AppError("Account not found.", 404);

  const charge = await createCharge({
    fullName: user.name || "GONTOP customer",
    email: user.email,
    amount,
    metadata: { user_id: userId, type: "wallet_deposit" },
    redirectUrl: await absoluteUrl("/wallet"),
    cancelUrl: await absoluteUrl("/wallet?deposit=cancelled"),
    webhookUrl: await absoluteUrl("/api/webhooks/uddoktapay"),
  });

  await db.insert(payments).values({
    id: newId(),
    userId,
    type: "wallet_deposit",
    gateway: "uddoktapay",
    invoiceId: charge.invoiceId,
    amount: amount.toFixed(2),
    status: "initiated",
  });

  return { paymentUrl: charge.paymentUrl, invoiceId: charge.invoiceId, amount };
}

export type VerifyResult = {
  status: "COMPLETED" | "PENDING" | "FAILED" | "ALREADY_PROCESSED";
  orderStatus?: OrderStatus;
  credited?: number;
  orderPublicId?: string;
  message?: string;
  needsRefund?: boolean;
};

/**
 * The only place a payment is allowed to become "paid". It always calls the
 * gateway's verify endpoint; URL parameters and webhook payload statuses are
 * never trusted. Safe to call repeatedly.
 */
export async function verifyInvoice(
  invoiceId: string,
  actor: { userId?: string; isAdmin?: boolean },
): Promise<VerifyResult> {
  const db = await getDb();
  const existingRows = await db
    .select({ payment: payments })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .limit(1);

  const existing = existingRows[0]?.payment;
  if (!existing) throw new AppError("Payment record not found.", 404);
  if (!actor.isAdmin && existing.userId !== actor.userId) {
    throw new AppError("You do not have access to this payment.", 403);
  }
  if (existing.status === "completed") {
    return {
      status: "ALREADY_PROCESSED",
      credited: money(existing.amount),
    };
  }

  const result = await verifyCharge(invoiceId);
  if (result.status === "COMPLETED" && !sameAmount(result.amount, existing.amount)) {
    await db
      .update(payments)
      .set({
        status: "failed",
        raw: result.raw,
        updatedAt: new Date(),
        transactionId: result.transactionId,
      })
      .where(eq(payments.id, existing.id));

    throw new AppError(
      "The paid amount does not match this order. Please contact support.",
      409,
      "AMOUNT_MISMATCH",
    );
  }

  let processingOrderId = null as number | null;
  const committed = await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, existing.id))
      .limit(1)
      .for("update");

    if (!payment) throw new AppError("Payment record not found.", 404);
    if (payment.status === "completed") {
      return { status: "ALREADY_PROCESSED" as const, credited: money(payment.amount) };
    }

    if (result.status === "PENDING") {
      await tx
        .update(payments)
        .set({ status: "pending", raw: result.raw, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      return { status: "PENDING" as const };
    }

    if (result.status !== "COMPLETED") {
      await tx
        .update(payments)
        .set({
          status: "failed",
          raw: result.raw,
          transactionId: result.transactionId,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      return { status: "FAILED" as const, message: result.message ?? "Payment failed." };
    }

    await tx
      .update(payments)
      .set({
        status: "completed",
        transactionId: result.transactionId,
        paymentMethod: result.paymentMethod,
        senderNumber: result.senderNumber,
        raw: result.raw,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    if (payment.type === "wallet_deposit") {
      await applyWalletEntry(tx, {
        userId: payment.userId,
        amount: money(payment.amount),
        type: "deposit",
        description: `Wallet deposit ${payment.invoiceId ?? ""}`.trim(),
        referenceType: "payment",
        referenceId: payment.id,
        idempotent: true,
      });

      return { status: "COMPLETED" as const, credited: money(payment.amount) };
    }

    if (!payment.orderId) {
      return { status: "COMPLETED" as const };
    }

    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1)
      .for("update");

    if (!order) throw new AppError("Order not found.", 404);

    if (order.status === "cancelled" || order.status === "refunded") {
      await tx.insert(orderNotes).values({
        orderId: order.id,
        content:
          "Payment completed at the gateway after this order was already cancelled. Refund required.",
      });
      return {
        status: "COMPLETED" as const,
        needsRefund: true,
        orderPublicId: order.publicId,
        orderStatus: order.status,
        message: "Payment received for a cancelled order. Support has been notified.",
      };
    }

    if (order.status === "pending_payment") {
      await tx
        .update(orders)
        .set({
          status: "processing",
          paymentStatus: "paid",
          fulfillmentStatus: "processing",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      processingOrderId = order.id;

      await tx.insert(orderHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "processing",
        changedByType: "system",
        note: `Payment verified${result.transactionId || payment.invoiceId ? `: ${result.transactionId ?? payment.invoiceId}` : ""}. Processing started.`,
        customerVisible: true,
      });
    }

    return {
      status: "COMPLETED" as const,
      orderPublicId: order.publicId,
      orderStatus: order.status === "pending_payment" ? ("processing" as const) : order.status,
    };
  });

  if (!processingOrderId) return committed;
  const orderStatus = await startProcessingAfterPayment(processingOrderId);
  return { ...committed, orderStatus };
}

export async function expireStaleInvoices(userId: string) {
  const db = await getDb();
  await db
    .update(payments)
    .set({ status: "failed", updatedAt: new Date() })
    .where(
      and(
        eq(payments.userId, userId),
        inArray(payments.status, ["initiated"]),
        eq(payments.type, "order"),
      ),
    );
}
