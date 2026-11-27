import "server-only";

import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

import {
  orderItems,
  orders,
  payments,
  products,
  refunds,
  users,
  variations,
  walletTransactions,
  wallets,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { money } from "@/lib/money";

export async function getDashboardStats() {
  const db = await getDb();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [statusRows, totalsRow, todayRow, walletRow, recentOrders, recentCustomers, recentTx, weekRows] =
    await Promise.all([
      db
        .select({ status: orders.status, value: count() })
        .from(orders)
        .groupBy(orders.status),
      db
        .select({
          revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
          paidOrders: count(),
        })
        .from(orders)
        .where(inArray(orders.status, ["processing", "completed", "on_hold"])),
      db
        .select({
          todayOrders: count(),
          todayRevenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, startOfToday)),
      db
        .select({
          balance: sql<string>`coalesce(sum(${wallets.balance}), 0)`,
          wallets: count(),
        })
        .from(wallets),
      db
        .select({
          id: orders.id,
          publicId: orders.publicId,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
          customerName: users.name,
          customerEmail: users.email,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .orderBy(desc(orders.createdAt))
        .limit(6),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(6),
      db
        .select({
          id: walletTransactions.id,
          type: walletTransactions.type,
          amount: walletTransactions.amount,
          description: walletTransactions.description,
          createdAt: walletTransactions.createdAt,
          userEmail: users.email,
        })
        .from(walletTransactions)
        .innerJoin(users, eq(users.id, walletTransactions.userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(6),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
          value: sql<string>`coalesce(sum(${orders.total}), 0)`,
          orders: count(),
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
            inArray(orders.status, ["processing", "completed", "on_hold"]),
          ),
        )
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) statusCounts[row.status] = Number(row.value);

  return {
    statusCounts,
    totalOrders: statusRows.reduce((sum, row) => sum + Number(row.value), 0),
    revenue: money(totalsRow[0]?.revenue),
    paidOrders: Number(totalsRow[0]?.paidOrders ?? 0),
    todayOrders: Number(todayRow[0]?.todayOrders ?? 0),
    todayRevenue: money(todayRow[0]?.todayRevenue),
    walletBalance: money(walletRow[0]?.balance),
    walletCount: Number(walletRow[0]?.wallets ?? 0),
    recentOrders,
    recentCustomers,
    recentTransactions: recentTx,
    week: weekRows.map((row) => ({ ...row, value: money(row.value), orders: Number(row.orders) })),
  };
}

export async function getCustomers(input: {
  search?: string;
  status?: "all" | "active" | "disabled";
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const search = input.search?.trim();
  const searchWhere = search
    ? or(
        ilike(users.email, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.phone, `%${search}%`),
      )
    : undefined;
  const statusWhere = input.status === "active"
    ? eq(users.isActive, true)
    : input.status === "disabled"
      ? eq(users.isActive, false)
      : undefined;
  const where = searchWhere && statusWhere ? and(searchWhere, statusWhere) : searchWhere ?? statusWhere;

  const [rows, totalRows, summaryRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
        balance: wallets.balance,
        orderCount: sql<number>`(
          select count(*)::int from ${orders} o where o.user_id = ${users.id}
        )`,
      })
      .from(users)
      .leftJoin(wallets, eq(wallets.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(users).where(where),
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
        disabled: sql<number>`count(*) filter (where ${users.isActive} = false)::int`,
        withWallet: sql<number>`count(${wallets.userId})::int`,
        walletBalance: sql<string>`coalesce(sum(${wallets.balance}), 0)`,
      })
      .from(users)
      .leftJoin(wallets, eq(wallets.userId, users.id)),
  ]);

  const summary = summaryRows[0];
  return {
    rows: rows.map((row) => ({ ...row, balance: money(row.balance ?? 0) })),
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(totalRows[0]?.value ?? 0) / pageSize)),
    summary: {
      total: Number(summary?.total ?? 0),
      active: Number(summary?.active ?? 0),
      disabled: Number(summary?.disabled ?? 0),
      withWallet: Number(summary?.withWallet ?? 0),
      walletBalance: money(summary?.walletBalance),
    },
  };
}

export async function getCustomerDetail(userId: string) {
  const db = await getDb();
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user) return null;

  const [orderRows, walletRows, txRows, orderSummaryRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(20),
    db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(20),
    db
      .select({
        total: count(),
        paid: sql<number>`count(*) filter (where ${orders.status} in ('processing', 'completed', 'on_hold'))::int`,
        spent: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('processing', 'completed', 'on_hold')), 0)`,
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(eq(orders.userId, userId)),
  ]);

  const orderSummary = orderSummaryRows[0];
  return {
    user,
    balance: money(walletRows[0]?.balance),
    orders: orderRows,
    transactions: txRows,
    summary: {
      orders: Number(orderSummary?.total ?? 0),
      paidOrders: Number(orderSummary?.paid ?? 0),
      spent: money(orderSummary?.spent),
      lastOrderAt: orderSummary?.lastOrderAt ?? null,
    },
  };
}

export async function getReports() {
  const db = await getDb();

  const [revenueRows, byMethod, topProducts, monthly, refundRows] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orders: count(),
      })
      .from(orders)
      .where(inArray(orders.status, ["processing", "completed", "on_hold"])),
    db
      .select({
        method: payments.gateway,
        total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        count: count(),
      })
      .from(payments)
      .where(eq(payments.status, "completed"))
      .groupBy(payments.gateway),
    db
      .select({
        name: orderItems.productName,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<string>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(inArray(orders.status, ["processing", "completed", "on_hold"]))
      .groupBy(orderItems.productName)
      .orderBy(sql`sum(${orderItems.lineTotal}) desc`)
      .limit(8),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orders: count(),
      })
      .from(orders)
      .where(inArray(orders.status, ["processing", "completed", "on_hold"]))
      .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('month', ${orders.createdAt}) desc`)
      .limit(6),
    db
      .select({
        total: sql<string>`coalesce(sum(${refunds.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(refunds)
      .where(eq(refunds.status, "completed")),
  ]);

  return {
    revenue: money(revenueRows[0]?.revenue),
    orders: Number(revenueRows[0]?.orders ?? 0),
    byMethod: byMethod.map((row) => ({ ...row, total: money(row.total), count: Number(row.count) })),
    topProducts: topProducts.map((row) => ({
      ...row,
      revenue: money(row.revenue),
      quantity: Number(row.quantity),
    })),
    monthly: monthly.map((row) => ({ ...row, revenue: money(row.revenue), orders: Number(row.orders) })),
    refunds: { total: money(refundRows[0]?.total), count: Number(refundRows[0]?.count ?? 0) },
  };
}

export async function getLowStock(limit = 10) {
  const db = await getDb();
  return db
    .select({
      id: variations.id,
      productId: products.id,
      name: variations.name,
      stockQuantity: variations.stockQuantity,
      stockStatus: variations.stockStatus,
      productName: products.name,
    })
    .from(variations)
    .innerJoin(products, eq(products.id, variations.productId))
    .where(sql`(${variations.stockQuantity} is not null and ${variations.stockQuantity} <= 5) or ${variations.stockStatus} = 'outofstock'`)
    .limit(limit);
}
