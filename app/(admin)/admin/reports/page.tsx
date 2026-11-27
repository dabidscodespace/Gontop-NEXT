import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
  Package,
  PackageX,
  ReceiptText,
  TrendingUp,
  Undo2,
} from "lucide-react";

import { Card, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { CustomerMoneyNav, WorkspaceNav } from "@/components/admin/workspace-nav";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getLowStock, getReports } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

type ReportView = "overview" | "products" | "inventory";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "reports.view")) return <NoAccess />;
  const canManageProducts = hasPermission(admin, "products.manage");

  const query = await searchParams;
  const view: ReportView = query.view === "products" || query.view === "inventory" ? query.view : "overview";
  const [reports, lowStock] = await Promise.all([getReports(), getLowStock()]);
  const maxMonth = Math.max(1, ...reports.monthly.map((month) => month.revenue));
  const paymentTotal = reports.byMethod.reduce((sum, method) => sum + method.total, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="Understand recognized revenue, payment performance, product demand and stock risk without mixing unrelated tasks."
      />

      <CustomerMoneyNav admin={admin} active="reports" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Recognized revenue" value={formatBDT(reports.revenue)} hint="Processing, on-hold & completed" icon={TrendingUp} tone="orange" />
        <StatCard label="Recognized orders" value={reports.orders.toLocaleString()} hint="Orders included in revenue" icon={ReceiptText} tone="blue" href={hasPermission(admin, "orders.view") ? "/admin/orders" : undefined} />
        <StatCard label="Completed refunds" value={formatBDT(reports.refunds.total)} hint={`${reports.refunds.count.toLocaleString()} refund${reports.refunds.count === 1 ? "" : "s"}`} icon={Undo2} tone="violet" />
        <StatCard label="Stock alerts" value={lowStock.length.toLocaleString()} hint="Packages at five or fewer" icon={PackageX} tone="amber" href="/admin/reports?view=inventory" />
      </div>

      <WorkspaceNav
        label="Report sections"
        active={view}
        compact
        items={[
          { key: "overview", label: "Revenue overview", href: "/admin/reports", icon: TrendingUp },
          { key: "products", label: "Product performance", href: "/admin/reports?view=products", icon: BarChart3, badge: reports.topProducts.length },
          { key: "inventory", label: "Inventory risk", href: "/admin/reports?view=inventory", icon: Boxes, badge: lowStock.length },
        ]}
      />

      {view === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Monthly revenue" icon={TrendingUp} description="The latest six active months, based on recognized orders.">
            {reports.monthly.length > 0 ? (
              <div className="space-y-4">
                {reports.monthly.map((month) => (
                  <div key={month.month}>
                    <div className="mb-1.5 flex items-end justify-between gap-3">
                      <span className="text-xs font-extrabold text-gray-700">{formatMonth(month.month)}</span>
                      <span className="text-right text-xs text-gray-500"><strong className="text-gray-900">{formatBDT(month.revenue)}</strong> · {month.orders} orders</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent-orange to-orange-400" style={{ width: `${Math.max(3, (month.revenue / maxMonth) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="No recognized revenue yet" description="Processing, on-hold and completed orders will populate this report." />
            )}
          </Card>

          <Card
            title="Completed payment mix"
            icon={CreditCard}
            description="How completed payment volume is distributed by gateway."
            actions={hasPermission(admin, "payments.view") ? <Link href="/admin/payments?status=completed" className="text-xs font-extrabold text-accent-orange hover:underline">Open payments</Link> : undefined}
          >
            {reports.byMethod.length > 0 ? (
              <div className="space-y-3">
                {reports.byMethod.map((method) => {
                  const share = paymentTotal > 0 ? (method.total / paymentTotal) * 100 : 0;
                  return (
                    <div key={method.method} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold capitalize text-gray-800">{method.method === "wallet" ? "G Coin wallet" : method.method}</p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{method.count.toLocaleString()} transaction{method.count === 1 ? "" : "s"}</p>
                        </div>
                        <div className="text-right"><p className="text-sm font-black text-gray-950">{formatBDT(method.total)}</p><p className="text-[10px] font-bold text-gray-400">{share.toFixed(1)}% of volume</p></div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(2, share)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={CreditCard} title="No completed payments yet" description="The payment mix appears once gateway or wallet payments complete." />
            )}
          </Card>
        </div>
      )}

      {view === "products" && (
        <Card
          title="Top products"
          icon={BarChart3}
          description="Ranked by recognized line-item revenue across processing, on-hold and completed orders."
          padded={false}
        >
          <ul className="divide-y divide-gray-100">
            {reports.topProducts.map((product, index) => {
              const share = reports.revenue > 0 ? (product.revenue / reports.revenue) * 100 : 0;
              return (
                <li key={`${product.name}-${index}`} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-black text-accent-orange ring-1 ring-orange-100">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-gray-900">{product.name}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{product.quantity.toLocaleString()} units · {share.toFixed(1)}% of recognized revenue</p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-gray-950">{formatBDT(product.revenue)}</span>
                  </div>
                  <div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-accent-orange" style={{ width: `${Math.min(100, Math.max(2, share))}%` }} /></div>
                </li>
              );
            })}
          </ul>
          {reports.topProducts.length === 0 && <EmptyState icon={Package} title="No product sales yet" description="Recognized order items will be ranked here." />}
        </Card>
      )}

      {view === "inventory" && (
        <Card
          title="Stock alerts"
          icon={PackageX}
          description="Packages marked out of stock or with a tracked quantity of five or fewer."
          actions={canManageProducts ? <Link href="/admin/products?availability=unavailable" className="text-xs font-extrabold text-accent-orange hover:underline">Review unavailable products</Link> : undefined}
          padded={false}
        >
          <ul className="divide-y divide-gray-100">
            {lowStock.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {canManageProducts ? (
                    <Link href={`/admin/products/${item.productId}`} className="truncate text-sm font-extrabold text-gray-900 hover:text-accent-orange">{item.productName}</Link>
                  ) : (
                    <p className="truncate text-sm font-extrabold text-gray-900">{item.productName}</p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-gray-500">Package: {item.name}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${item.stockStatus === "outofstock" ? "bg-red-50 text-red-600 ring-red-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>{item.stockStatus === "outofstock" ? "Out of stock" : `${item.stockQuantity ?? 0} left`}</span>
                  {canManageProducts && <Link href={`/admin/products/${item.productId}`} className="text-xs font-extrabold text-accent-orange hover:underline">Manage product</Link>}
                </div>
              </li>
            ))}
          </ul>
          {lowStock.length === 0 && <EmptyState icon={Package} title="Everything is well stocked" description="There are no packages at or below the stock-alert threshold." />}
        </Card>
      )}
    </div>
  );
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}
