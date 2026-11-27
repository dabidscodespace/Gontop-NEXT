import { redirect } from "next/navigation";
import { BarChart3, CreditCard, Package, PackageX, TrendingUp, Undo2 } from "lucide-react";

import { Card, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getLowStock, getReports } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "reports.view")) return <NoAccess />;

  const [reports, lowStock] = await Promise.all([getReports(), getLowStock()]);
  const maxMonth = Math.max(1, ...reports.monthly.map((month) => month.revenue));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Revenue, payment mix and best-selling packages." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatBDT(reports.revenue)} icon={TrendingUp} tone="orange" />
        <StatCard label="Paid orders" value={reports.orders} icon={BarChart3} tone="blue" />
        <StatCard label="Refunds" value={formatBDT(reports.refunds.total)} icon={Undo2} tone="violet" />
        <StatCard label="Low stock items" value={lowStock.length} icon={Package} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Monthly revenue" icon={TrendingUp}>
          <div className="space-y-3">
            {reports.monthly.map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-gray-500">{month.month}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-orange to-orange-400"
                    style={{ width: `${Math.max(3, (month.revenue / maxMonth) * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-bold text-gray-800">
                  {formatBDT(month.revenue)}
                </span>
              </div>
            ))}
            {reports.monthly.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No revenue yet.</p>}
          </div>
        </Card>

        <Card title="Payment mix" icon={CreditCard}>
          <div className="space-y-2">
            {reports.byMethod.map((method) => (
              <div key={method.method} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold capitalize text-gray-800">
                  {method.method === "wallet" ? "G Coin wallet" : method.method}
                </span>
                <span className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{formatBDT(method.total)}</span> · {method.count} txn
                </span>
              </div>
            ))}
            {reports.byMethod.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No completed payments yet.</p>}
          </div>
        </Card>

        <Card title="Top products" icon={BarChart3} padded={false}>
          <ul className="divide-y divide-gray-100">
            {reports.topProducts.map((product, index) => (
              <li key={`${product.name}-${index}`} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-accent-orange">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{product.name}</span>
                <span className="text-xs text-gray-500">{product.quantity} sold</span>
                <span className="w-24 text-right text-sm font-bold text-gray-900">{formatBDT(product.revenue)}</span>
              </li>
            ))}
          </ul>
          {reports.topProducts.length === 0 && <EmptyState icon={BarChart3} title="No sales yet" />}
        </Card>

        <Card title="Stock alerts" icon={PackageX} padded={false}>
          <ul className="divide-y divide-gray-100">
            {lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.productName}</p>
                  <p className="truncate text-xs text-gray-400">{item.name}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                    item.stockStatus === "outofstock"
                      ? "bg-red-50 text-red-600 ring-red-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  {item.stockStatus === "outofstock" ? "Out of stock" : `${item.stockQuantity ?? 0} left`}
                </span>
              </li>
            ))}
          </ul>
          {lowStock.length === 0 && <EmptyState icon={Package} title="Everything is well stocked" />}
        </Card>
      </div>
    </div>
  );
}
