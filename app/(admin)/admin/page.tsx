import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PackagePlus,
  PauseCircle,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { Card, PageIdentity, StatCard, btnOnDark, btnOnDarkPrimary } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getDashboardStats } from "@/lib/services/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function startCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildWeek(rows: Array<{ day: string; value: string | number; orders: number }>) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    const row = byDay.get(key);
    return {
      key,
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: Number(row?.value ?? 0),
      orders: Number(row?.orders ?? 0),
    };
  });
}

export default async function AdminDashboardPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "dashboard.view")) return <NoAccess />;

  const stats = await getDashboardStats();
  const week = buildWeek(stats.week);
  const maxWeek = Math.max(1, ...week.map((day) => day.value));
  const firstName = (admin.name || "there").trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const queues = [
    {
      label: "Awaiting payment",
      value: stats.statusCounts.pending_payment ?? 0,
      hint: "Customer action needed",
      href: "/admin/orders?status=pending_payment",
      icon: Clock3,
      tone: "amber",
    },
    {
      label: "Processing",
      value: stats.statusCounts.processing ?? 0,
      hint: "Ready for fulfilment",
      href: "/admin/orders?status=processing",
      icon: TrendingUp,
      tone: "blue",
    },
    {
      label: "On hold",
      value: stats.statusCounts.on_hold ?? 0,
      hint: "Needs a decision",
      href: "/admin/orders?status=on_hold",
      icon: PauseCircle,
      tone: "orange",
    },
    {
      label: "Failed",
      value: stats.statusCounts.failed ?? 0,
      hint: "Review or retry",
      href: "/admin/orders?status=failed",
      icon: AlertCircle,
      tone: "red",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageIdentity
        eyebrow="Live operations overview"
        title={`${greeting}, ${firstName}`}
        description={`${today}. Your cross-store briefing highlights the queues, momentum and signals that matter now.`}
        icon={TrendingUp}
        tone="slate"
        signal={`${stats.todayOrders.toLocaleString()} order${stats.todayOrders === 1 ? "" : "s"} today`}
        actions={
          <>
            {hasPermission(admin, "orders.view") && (
              <Link href="/admin/orders" className={btnOnDark}>
                <ShoppingBag className="h-4 w-4" /> View orders
              </Link>
            )}
            {hasPermission(admin, "products.manage") && (
              <Link href="/admin/products/new" className={btnOnDarkPrimary}>
                <PackagePlus className="h-4 w-4" /> Add product
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatBDT(stats.todayRevenue)}
          hint={`${stats.todayOrders.toLocaleString()} order${stats.todayOrders === 1 ? "" : "s"} today`}
          icon={CircleDollarSign}
          tone="emerald"
          href="/admin/orders"
        />
        <StatCard
          label="Total revenue"
          value={formatBDT(stats.revenue)}
          hint={`${stats.paidOrders.toLocaleString()} paid orders`}
          icon={TrendingUp}
          tone="orange"
          href="/admin/reports"
        />
        <StatCard
          label="Completed orders"
          value={(stats.statusCounts.completed ?? 0).toLocaleString()}
          hint={`${stats.totalOrders.toLocaleString()} orders overall`}
          icon={CheckCircle2}
          tone="blue"
          href="/admin/orders?status=completed"
        />
        <StatCard
          label="Customer wallets"
          value={formatBDT(stats.walletBalance)}
          hint={`${stats.walletCount.toLocaleString()} active wallets`}
          icon={Wallet}
          tone="violet"
          href="/admin/wallets"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.75fr)]">
        <Card
          title="Sales momentum"
          description="Paid order revenue over the last seven days"
          icon={TrendingUp}
          actions={
            <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-accent-orange">
              Full report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">7-day revenue</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-gray-950">
                {formatBDT(week.reduce((sum, day) => sum + day.value, 0))}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-500 ring-1 ring-inset ring-gray-100">
              <span className="h-2 w-2 rounded-full bg-accent-orange" /> Revenue
            </div>
          </div>

          <div className="grid h-52 grid-cols-7 items-end gap-2 sm:gap-3" aria-label="Revenue chart for the last seven days">
            {week.map((day) => {
              const height = day.value > 0 ? Math.max(12, (day.value / maxWeek) * 150) : 5;
              return (
                <div key={day.key} className="group flex h-full min-w-0 flex-col justify-end">
                  <div className="relative flex flex-1 items-end justify-center">
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-gray-950 px-2.5 py-1.5 text-center text-[10px] font-semibold text-white shadow-lg group-hover:block">
                      <p>{formatBDT(day.value)}</p>
                      <p className="text-white/55">{day.orders} order{day.orders === 1 ? "" : "s"}</p>
                    </div>
                    <div
                      className={cn(
                        "w-full max-w-12 rounded-t-lg transition-all duration-300",
                        day.value > 0
                          ? "bg-gradient-to-t from-[#e95700] to-[#ff9654] group-hover:from-accent-orange group-hover:to-orange-300"
                          : "bg-gray-100",
                      )}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <p className="mt-2 truncate text-center text-[10px] font-extrabold text-gray-600">{day.label}</p>
                  <p className="truncate text-center text-[9px] text-gray-400">{day.date.split(" ")[0]}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Needs attention" description="Live operational queues" icon={AlertCircle} padded={false}>
          <div className="divide-y divide-gray-100">
            {queues.map((queue) => (
              <Link
                key={queue.label}
                href={queue.href}
                className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    queue.tone === "amber" && "bg-amber-50 text-amber-600",
                    queue.tone === "blue" && "bg-blue-50 text-blue-600",
                    queue.tone === "orange" && "bg-orange-50 text-orange-600",
                    queue.tone === "red" && "bg-red-50 text-red-600",
                  )}
                >
                  <queue.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-800">{queue.label}</span>
                  <span className="block text-[11px] text-gray-400">{queue.hint}</span>
                </span>
                <span className="text-lg font-black tabular-nums text-gray-950">{queue.value.toLocaleString()}</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-accent-orange" />
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-3">
            <p className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
              <span>Cancelled / refunded</span>
              <span className="font-black text-gray-700">
                {(stats.statusCounts.cancelled ?? 0) + (stats.statusCounts.refunded ?? 0)}
              </span>
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
        <Card
          title="Recent orders"
          description="Latest activity across all payment methods"
          icon={ShoppingBag}
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-bold text-accent-orange">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          padded={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-gray-100 bg-gray-50/70">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Order</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-orange-50/30">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-black text-gray-900 hover:text-accent-orange">
                        #{order.orderNumber}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3.5">
                      <p className="truncate text-sm font-bold text-gray-800">{order.customerName || "Unnamed customer"}</p>
                      <p className="truncate text-[11px] text-gray-400">{order.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3.5 text-right text-sm font-black text-gray-950">{formatBDT(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.recentOrders.length === 0 && <p className="px-5 py-12 text-center text-sm text-gray-400">No orders yet.</p>}
        </Card>

        <Card title="Live activity" description="Customers and wallet movement" icon={Users} padded={false}>
          <div className="divide-y divide-gray-100">
            {stats.recentCustomers.slice(0, 3).map((customer) => (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UserPlus className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-gray-800">{customer.name || customer.email}</span>
                  <span className="block truncate text-[10px] text-gray-400">New customer · {new Date(customer.createdAt).toLocaleDateString("en-GB")}</span>
                </span>
              </Link>
            ))}
            {stats.recentTransactions.slice(0, 3).map((transaction) => {
              const positive = Number(transaction.amount) > 0;
              return (
                <div key={transaction.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", positive ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600")}>
                    {positive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-gray-800">{startCase(transaction.type)}</span>
                    <span className="block truncate text-[10px] text-gray-400">{transaction.userEmail}</span>
                  </span>
                  <span className={cn("text-xs font-black", positive ? "text-emerald-600" : "text-gray-800")}>
                    {positive ? "+" : ""}{formatBDT(transaction.amount)}
                  </span>
                </div>
              );
            })}
          </div>
          {stats.recentCustomers.length === 0 && stats.recentTransactions.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-gray-400">No recent activity.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
