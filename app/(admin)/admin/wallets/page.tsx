import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, Users } from "lucide-react";

import { Card, EmptyState, PageHeader, Pagination, StatCard, tdCls, thCls } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listWalletsAdmin } from "@/lib/services/admin-catalog";
import { getWalletTotals } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "wallet.manage")) return <NoAccess />;

  const params = await searchParams;
  const [result, totals] = await Promise.all([
    listWalletsAdmin({ page: params.page ? Number(params.page) : 1 }),
    getWalletTotals(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets"
        description="Customer balances are backed by an immutable transaction ledger."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total customer balance" value={formatBDT(totals.total)} icon={Wallet} tone="emerald" />
        <StatCard label="Active wallets" value={totals.count} icon={Users} tone="blue" />
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Balance</th>
                <th className={thCls}>Last updated</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((wallet) => (
                <tr key={wallet.userId} className="transition hover:bg-orange-50/40">
                  <td className={tdCls}>
                    <p className="font-semibold text-gray-900">{wallet.name || "Unnamed customer"}</p>
                    <p className="text-xs text-gray-400">{wallet.email}</p>
                  </td>
                  <td className={`${tdCls} text-base font-extrabold text-gray-900`}>{formatBDT(wallet.balance)}</td>
                  <td className={`${tdCls} text-xs text-gray-500`}>
                    {new Date(wallet.updatedAt).toLocaleString("en-GB")}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <Link
                      href={`/admin/customers/${wallet.userId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-accent-orange ring-1 ring-inset ring-orange-200 transition hover:bg-accent-orange hover:text-white"
                    >
                      <Wallet className="h-3.5 w-3.5" /> Adjust
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.rows.length === 0 && (
          <EmptyState icon={Wallet} title="No wallets yet" description="Wallets appear once customers deposit or pay." />
        )}
      </Card>

      <Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => `/admin/wallets?page=${page}`} />
    </div>
  );
}
