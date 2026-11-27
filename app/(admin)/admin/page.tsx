import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { Card, StatCard } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getDashboardStats } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "dashboard.view")) return <NoAccess />;

  const stats = await getDashboardStats();
  const maxWeek = Math.max(1, ...stats.week.map((day) => day.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">A live look at sales, payments and customers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatBDT(stats.revenue)}
          hint={`${stats.paidOrders} paid orders`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Today's orders"
          value={stats.todayOrders.toLocaleString()}
          hint={`${formatBDT(stats.todayRevenue)} today`}
          icon={ShoppingBag}
          tone="blue"
        />
        <StatCard
          label="Pending payment"
          value={(stats.statusCounts.pending_payment ?? 0).toLocaleString()}
          hint={`${stats.statusCounts.processing ?? 0} processing`}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Completed"
          value={(stats.statusCounts.completed ?? 0).toLocaleString()}
          hint={`${stats.statusCounts.failed ?? 0} failed`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Wallet balances"
          value={formatBDT(stats.walletBalance)}
          hint={`${stats.walletCount} wallets`}
          icon={Wallet}
          tone="orange"
        />
        <StatCard
          label="Total orders"
          value={stats.totalOrders.toLocaleString()}
          hint={`${stats.statusCounts.cancelled ?? 0} cancelled · ${stats.statusCounts.refunded ?? 0} refunded`}
          icon={CreditCard}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Last 7 days" description="Paid order revenue per day">
          <div className="flex h-56 items-end gap-3">
            {stats.week.length === 0 ? (
              <p className="w-full text-center text-sm text-gray-400">No sales yet.</p>
            ) : (
              stats.week.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {day.value > 0 ? formatBDT(day.value) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-accent-orange to-orange-300 transition-all hover:from-orange-600"
                    style={{ height: `${Math.max(6, (day.value / maxWeek) * 170)}px` }}
                    title={`${day.orders} orders`}
                  />
                  <span className="text-[10px] font-medium text-gray-400">{day.day.slice(5)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card
          title="Recent orders"
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-orange">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          }
          padded={false}
        >
          <div className="divide-y divide-gray-100">
            {stats.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-gray-800">{order.publicId}</p>
                  <p className="truncate text-xs text-gray-400">{order.customerName || order.customerEmail}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-bold text-gray-900">{formatBDT(order.total)}</p>
                  <StatusBadge status={order.status} className="px-2 py-0.5 text-[10px]" />
                </div>
              </Link>
            ))}
            {stats.recentOrders.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No orders yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent customers" icon={Users} padded={false}>
          <div className="divide-y divide-gray-100">
            {stats.recentCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {customer.name || "Unnamed customer"}
                  </p>
                  <p className="truncate text-xs text-gray-400">{customer.email}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(customer.createdAt).toLocaleDateString("en-GB")}
                </span>
              </Link>
            ))}
            {stats.recentCustomers.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No customers yet.</p>
            )}
          </div>
        </Card>

        <Card title="Recent wallet activity" icon={Wallet} padded={false}>
          <div className="divide-y divide-gray-100">
            {stats.recentTransactions.map((transaction) => {
              const positive = Number(transaction.amount) > 0;
              return (
                <div key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold capitalize text-gray-800">
                      {transaction.type.replace(/_/g, " ")}
                    </p>
                    <p className="truncate text-xs text-gray-400">{transaction.userEmail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {positive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    <span className={`text-sm font-bold ${positive ? "text-emerald-600" : "text-gray-800"}`}>
                      {positive ? "+" : ""}
                      {formatBDT(transaction.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
            {stats.recentTransactions.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No wallet activity yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
