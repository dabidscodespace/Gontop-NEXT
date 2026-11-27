import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { walletTransactions, wallets, type WalletTxType } from "@/db/schema";
import { newId } from "@/lib/crypto";
import { getDb, type Tx } from "@/lib/db";
import { AppError, money, round2 } from "@/lib/money";

export type WalletEntryInput = {
  userId: string;
  /** Signed amount: positive credits, negative debits. */
  amount: number;
  type: WalletTxType;
  description: string;
  referenceType?: string;
  referenceId?: string;
  adminId?: string | null;
  /** When set, an existing entry with the same reference is not duplicated. */
  idempotent?: boolean;
};

async function ensureWallet(tx: Tx, userId: string) {
  await tx.insert(wallets).values({ userId, balance: "0" }).onConflictDoNothing();
}

/** Must be called inside a transaction; locks the wallet row. */
export async function applyWalletEntry(tx: Tx, input: WalletEntryInput) {
  const amount = round2(input.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new AppError("Wallet amount must be non-zero.", 422);
  }

  if (input.idempotent && input.referenceType && input.referenceId) {
    const existing = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.referenceType, input.referenceType),
          eq(walletTransactions.referenceId, input.referenceId),
          eq(walletTransactions.type, input.type),
        ),
      )
      .limit(1);
    if (existing[0]) return null;
  }

  await ensureWallet(tx, input.userId);

  const [locked] = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, input.userId))
    .for("update");

  const before = money(locked?.balance);
  const after = round2(before + amount);

  if (after < 0) {
    throw new AppError("Insufficient wallet balance.", 400, "INSUFFICIENT_WALLET");
  }

  await tx
    .update(wallets)
    .set({ balance: after.toFixed(2), updatedAt: new Date() })
    .where(eq(wallets.userId, input.userId));

  const id = newId();
  await tx.insert(walletTransactions).values({
    id,
    userId: input.userId,
    type: input.type,
    amount: amount.toFixed(2),
    balanceBefore: before.toFixed(2),
    balanceAfter: after.toFixed(2),
    status: "completed",
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    description: input.description,
    createdByAdminId: input.adminId ?? null,
  });

  return { id, amount, balanceBefore: before, balanceAfter: after };
}

export async function getWalletBalance(userId: string) {
  const db = await getDb();
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  return money(rows[0]?.balance);
}

export async function getWalletSummary(userId: string, limit = 25) {
  const db = await getDb();
  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit),
  ]);

  return { balance, transactions };
}

export async function adminAdjustWallet(input: {
  userId: string;
  amount: number;
  credit: boolean;
  reason: string;
  adminId: string;
}) {
  if (!input.reason.trim()) throw new AppError("A reason is mandatory for wallet adjustments.", 422);
  const db = await getDb();

  return db.transaction(async (tx) => {
    return applyWalletEntry(tx, {
      userId: input.userId,
      amount: input.credit ? Math.abs(input.amount) : -Math.abs(input.amount),
      type: input.credit ? "admin_credit" : "admin_debit",
      description: input.reason.trim(),
      adminId: input.adminId,
      referenceType: "admin",
      referenceId: input.adminId,
    });
  });
}

export async function getWalletTotals() {
  const db = await getDb();
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${wallets.balance}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(wallets);
  return { total: money(rows[0]?.total), count: Number(rows[0]?.count ?? 0) };
}
