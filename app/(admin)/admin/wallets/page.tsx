import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, SearchX, Users, Wallet } from "lucide-react";

import { Card, EmptyState, PageHeader, Pagination, SearchBar, StatCard, tdCls, thCls } from "@/components/admin/ui";
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
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "wallet.manage")) return <NoAccess />;

  const params = await searchParams;
  const [result, totals] = await Promise.all([
    listWalletsAdmin({ page: params.page ? Number(params.page) : 1, search: params.q }),
    getWalletTotals(),
  ]);

  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return `/admin/wallets${value ? `?${value}` : ""}`;
  };
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Wallet ledger"
        title="Wallets"
        description="Customer balances are backed by an immutable transaction ledger. Open a customer to make a fully audited adjustment."
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Customer funds" value={formatBDT(totals.total)} hint="Across every wallet" icon={Wallet} tone="emerald" />
        <StatCard label="Active wallets" value={totals.count.toLocaleString()} hint="Customers with a wallet" icon={Users} tone="blue" />
      </div>

      <SearchBar defaultValue={params.q ?? ""} placeholder="Search customer name, email or phone" resetHref={params.q ? "/admin/wallets" : undefined} />

      <Card padded={false} className="overflow-hidden">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[650px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Contact</th>
                <th className={thCls}>Balance</th>
                <th className={thCls}>Last updated</th>
                <th className={`${thCls} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((wallet) => (
                <tr key={wallet.userId} className="hover:bg-orange-50/30">
                  <td className={tdCls}>
                    <Link href={`/admin/customers/${wallet.userId}`} className="font-extrabold text-gray-900 hover:text-accent-orange">{wallet.name || "Unnamed customer"}</Link>
                    <p className="text-[11px] text-gray-400">{wallet.email}</p>
                  </td>
                  <td className={`${tdCls} text-xs text-gray-500`}>{wallet.phone || "No phone"}</td>
                  <td className={`${tdCls} whitespace-nowrap text-base font-black text-gray-950`}>{formatBDT(wallet.balance)}</td>
                  <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>
                    {new Date(wallet.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <Link href={`/admin/customers/${wallet.userId}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">
                      Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-gray-100 sm:hidden">
          {result.rows.map((wallet) => (
            <li key={wallet.userId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/customers/${wallet.userId}`} className="block truncate text-sm font-extrabold text-gray-900">{wallet.name || "Unnamed customer"}</Link>
                  <p className="truncate text-xs text-gray-500">{wallet.email}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{wallet.phone || "No phone"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Balance</p>
                  <p className="mt-1 text-base font-black text-gray-950">{formatBDT(wallet.balance)}</p>
                </div>
              </div>
              <Link href={`/admin/customers/${wallet.userId}`} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700">
                Open wallet ledger <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>

        {result.rows.length === 0 && (
          <EmptyState icon={params.q ? SearchX : Wallet} title={params.q ? "No wallets match" : "No wallets yet"} description={params.q ? "Try another customer name, email, or phone." : "Wallets appear once customers deposit or pay."} />
        )}

        {result.rows.length > 0 && (
          <footer className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
            <p className="text-xs font-semibold text-gray-500">Showing {rangeStart}–{rangeEnd} of {result.total.toLocaleString()}</p>
            <Pagination page={result.page} pageCount={result.pageCount} buildHref={hrefFor} />
          </footer>
        )}
      </Card>
    </div>
  );
}
