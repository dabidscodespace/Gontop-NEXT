import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownUp,
  ArrowRight,
  CircleDollarSign,
  History,
  SearchX,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import {
  btnSecondary,
  Card,
  EmptyState,
  PageIdentity,
  Pagination,
  SearchBar,
  selectCls,
  StatCard,
  tdCls,
  thCls,
} from "@/components/admin/ui";
import { WorkspaceNav } from "@/components/admin/workspace-nav";
import { NoAccess } from "@/components/admin/no-access";
import { WALLET_TX_TYPES, type WalletTxType } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listWalletsAdmin, listWalletTransactionsAdmin } from "@/lib/services/admin-catalog";
import { getWalletTotals } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

type WalletView = "balances" | "activity";
type BalanceFilter = "all" | "funded" | "zero";

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; view?: string; balance?: string; type?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "wallet.manage")) return <NoAccess />;

  const params = await searchParams;
  const view: WalletView = params.view === "activity" ? "activity" : "balances";
  const balance: BalanceFilter = params.balance === "funded" || params.balance === "zero" ? params.balance : "all";
  const type = WALLET_TX_TYPES.includes(params.type as WalletTxType) ? (params.type as WalletTxType) : "all";
  const page = params.page ? Number(params.page) : 1;

  const [totals, walletResult, activityResult] = await Promise.all([
    getWalletTotals(),
    view === "balances" ? listWalletsAdmin({ page, search: params.q, balance }) : Promise.resolve(null),
    view === "activity" ? listWalletTransactionsAdmin({ page, search: params.q, type }) : Promise.resolve(null),
  ]);

  const result = view === "balances" ? walletResult! : activityResult!;
  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams();
    if (view === "activity") query.set("view", "activity");
    if (params.q) query.set("q", params.q);
    if (view === "balances" && balance !== "all") query.set("balance", balance);
    if (view === "activity" && type !== "all") query.set("type", type);
    if (nextPage > 1) query.set("page", String(nextPage));
    const value = query.toString();
    return `/admin/wallets${value ? `?${value}` : ""}`;
  };
  const activeFilters = Boolean(params.q || (view === "balances" ? balance !== "all" : type !== "all"));
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Stored-value ledger"
        title="Wallets"
        description="A protected workspace for customer balances and every credit or debit that produced them. Wallet operations stay separate from gateway payments."
        icon={Wallet}
        tone="emerald"
        signal={`${formatBDT(totals.total)} held`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Customer funds" value={formatBDT(totals.total)} hint="Current balance total" icon={CircleDollarSign} tone="emerald" />
        <StatCard label="All wallets" value={totals.count.toLocaleString()} hint="Created customer wallets" icon={Wallet} tone="blue" href="/admin/wallets" />
        <StatCard label="Funded wallets" value={totals.funded.toLocaleString()} hint="Balance above zero" icon={Users} tone="orange" href="/admin/wallets?balance=funded" />
        <StatCard label="Zero balance" value={totals.zero.toLocaleString()} hint="No funds currently held" icon={History} tone="slate" href="/admin/wallets?balance=zero" />
      </div>

      <WorkspaceNav
        label="Wallet views"
        active={view}
        compact
        tone="emerald"
        items={[
          { key: "balances", label: "Customer balances", href: "/admin/wallets", icon: Wallet, badge: totals.count },
          { key: "activity", label: "Ledger activity", href: "/admin/wallets?view=activity", icon: ArrowDownUp, badge: view === "activity" ? activityResult?.total : undefined },
        ]}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-4 w-4" /></span>
        <div>
          <p className="font-extrabold">Balances are derived from ledger entries</p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-700">Adjustments lock the wallet, prevent negative balances, require a reason, and record the acting administrator.</p>
        </div>
      </div>

      {view === "balances" && walletResult && (
        <>
          <SearchBar
            defaultValue={params.q ?? ""}
            placeholder="Search customer name, email or phone"
            resetHref={activeFilters ? "/admin/wallets" : undefined}
            submitLabel="Filter"
          >
            <select name="balance" defaultValue={balance} className={`${selectCls} h-11 w-auto min-w-40`} aria-label="Balance filter">
              <option value="all">All balances</option>
              <option value="funded">Funded only</option>
              <option value="zero">Zero balance</option>
            </select>
          </SearchBar>

          <Card title="Customer balances" description={`${walletResult.total.toLocaleString()} wallet${walletResult.total === 1 ? "" : "s"} in this view, highest balance first.`} padded={false} className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px]">
                <thead className="border-b border-gray-100 bg-gray-50/70">
                  <tr>
                    <th className={thCls}>Customer</th>
                    <th className={thCls}>Contact</th>
                    <th className={thCls}>Balance</th>
                    <th className={thCls}>Ledger</th>
                    <th className={thCls}>Last balance change</th>
                    <th className={`${thCls} text-right`}>Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {walletResult.rows.map((wallet) => (
                    <tr key={wallet.userId} className="transition hover:bg-orange-50/30">
                      <td className={tdCls}>
                        <Link href={`/admin/customers/${wallet.userId}`} className="font-extrabold text-gray-900 hover:text-accent-orange">{wallet.name || "Unnamed customer"}</Link>
                        <p className="max-w-[230px] truncate text-[11px] text-gray-400">{wallet.email}</p>
                      </td>
                      <td className={`${tdCls} text-xs text-gray-500`}>{wallet.phone || "No phone"}</td>
                      <td className={`${tdCls} whitespace-nowrap text-base font-black text-gray-950`}>{formatBDT(wallet.balance)}</td>
                      <td className={tdCls}>
                        <p className="text-xs font-black text-gray-800">{wallet.transactionCount.toLocaleString()} entries</p>
                        <p className="mt-0.5 text-[10px] capitalize text-gray-400">{wallet.lastTransactionType ? `Latest: ${wallet.lastTransactionType.replace(/_/g, " ")}` : "No activity yet"}</p>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>{new Date(wallet.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className={`${tdCls} text-right`}>
                        <Link href={`/admin/customers/${wallet.userId}?tab=wallet`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">Ledger & adjust <ArrowRight className="h-3 w-3" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-gray-100 md:hidden">
              {walletResult.rows.map((wallet) => (
                <li key={wallet.userId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/customers/${wallet.userId}`} className="block truncate text-sm font-extrabold text-gray-900">{wallet.name || "Unnamed customer"}</Link>
                      <p className="truncate text-xs text-gray-500">{wallet.email}</p>
                      <p className="mt-1 text-[11px] capitalize text-gray-400">{wallet.transactionCount} ledger entries{wallet.lastTransactionType ? ` · ${wallet.lastTransactionType.replace(/_/g, " ")}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Balance</p>
                      <p className="mt-1 text-base font-black text-gray-950">{formatBDT(wallet.balance)}</p>
                    </div>
                  </div>
                  <Link href={`/admin/customers/${wallet.userId}?tab=wallet`} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700 transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">Open ledger & adjust <ArrowRight className="h-3.5 w-3.5" /></Link>
                </li>
              ))}
            </ul>

            {walletResult.rows.length === 0 && (
              <EmptyState icon={activeFilters ? SearchX : Wallet} title={activeFilters ? "No wallets match" : "No wallets yet"} description={activeFilters ? "Try another customer or clear the balance filter." : "Wallets appear after a customer first uses the wallet system."} action={activeFilters ? <Link href="/admin/wallets" className={btnSecondary}>Clear filters</Link> : undefined} />
            )}
            <ResultFooter result={walletResult} rangeStart={rangeStart} rangeEnd={rangeEnd} hrefFor={hrefFor} />
          </Card>
        </>
      )}

      {view === "activity" && activityResult && (
        <>
          <SearchBar
            defaultValue={params.q ?? ""}
            placeholder="Customer, reason or reference"
            resetHref={activeFilters ? "/admin/wallets?view=activity" : undefined}
            submitLabel="Filter"
          >
            <input type="hidden" name="view" value="activity" />
            <select name="type" defaultValue={type} className={`${selectCls} h-11 w-auto min-w-44`} aria-label="Ledger entry type">
              <option value="all">All entry types</option>
              {WALLET_TX_TYPES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
          </SearchBar>

          <Card title="Ledger activity" description="Newest entries first. Each row shows the signed change and resulting balance." padded={false} className="overflow-hidden">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-gray-100 bg-gray-50/70">
                  <tr>
                    <th className={thCls}>Customer</th>
                    <th className={thCls}>Entry</th>
                    <th className={thCls}>Change</th>
                    <th className={thCls}>Balance</th>
                    <th className={thCls}>Reference</th>
                    <th className={thCls}>Recorded</th>
                    <th className={`${thCls} text-right`}>Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activityResult.rows.map((entry) => {
                    const positive = Number(entry.amount) > 0;
                    return (
                      <tr key={entry.id} className="transition hover:bg-orange-50/30">
                        <td className={tdCls}>
                          <Link href={`/admin/customers/${entry.userId}?tab=wallet`} className="font-extrabold text-gray-900 hover:text-accent-orange">{entry.customerName || "Unnamed customer"}</Link>
                          <p className="max-w-[220px] truncate text-[11px] text-gray-400">{entry.customerEmail}</p>
                        </td>
                        <td className={tdCls}>
                          <p className="text-xs font-extrabold capitalize text-gray-800">{entry.type.replace(/_/g, " ")}</p>
                          <p className="mt-0.5 max-w-[260px] truncate text-[11px] text-gray-500" title={entry.description}>{entry.description || "No description"}</p>
                        </td>
                        <td className={`${tdCls} whitespace-nowrap text-sm font-black ${positive ? "text-emerald-600" : "text-gray-800"}`}>{positive ? "+" : ""}{formatBDT(entry.amount)}</td>
                        <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}><span className="font-semibold">{formatBDT(entry.balanceBefore)}</span> → <span className="font-black text-gray-900">{formatBDT(entry.balanceAfter)}</span></td>
                        <td className={`${tdCls} text-xs text-gray-500`}><p className="capitalize">{entry.referenceType || "—"}</p><p className="max-w-[150px] truncate font-mono text-[10px]">{entry.referenceId || "No reference"}</p></td>
                        <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>{new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className={`${tdCls} text-right`}><Link href={`/admin/customers/${entry.userId}?tab=wallet`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 hover:border-gray-900 hover:bg-gray-950 hover:text-white">Open <ArrowRight className="h-3 w-3" /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-gray-100 lg:hidden">
              {activityResult.rows.map((entry) => {
                const positive = Number(entry.amount) > 0;
                return (
                  <li key={entry.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-extrabold capitalize text-gray-900">{entry.type.replace(/_/g, " ")}</p><p className="truncate text-xs text-gray-500">{entry.customerName || entry.customerEmail}</p></div>
                      <p className={`shrink-0 text-sm font-black ${positive ? "text-emerald-600" : "text-gray-800"}`}>{positive ? "+" : ""}{formatBDT(entry.amount)}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">{entry.description || "No description"}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-gray-400"><span>Balance {formatBDT(entry.balanceAfter)}</span><span>{new Date(entry.createdAt).toLocaleString("en-GB")}</span></div>
                    <Link href={`/admin/customers/${entry.userId}?tab=wallet`} className="mt-3 flex h-9 w-full items-center justify-center rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700">Open customer ledger</Link>
                  </li>
                );
              })}
            </ul>

            {activityResult.rows.length === 0 && <EmptyState icon={activeFilters ? SearchX : ArrowDownUp} title={activeFilters ? "No ledger entries match" : "No wallet activity yet"} description={activeFilters ? "Try a broader search or another entry type." : "Deposits, payments, refunds and adjustments will appear here."} action={activeFilters ? <Link href="/admin/wallets?view=activity" className={btnSecondary}>Clear filters</Link> : undefined} />}
            <ResultFooter result={activityResult} rangeStart={rangeStart} rangeEnd={rangeEnd} hrefFor={hrefFor} />
          </Card>
        </>
      )}
    </div>
  );
}

function ResultFooter({
  result,
  rangeStart,
  rangeEnd,
  hrefFor,
}: {
  result: { rows: unknown[]; total: number; page: number; pageCount: number };
  rangeStart: number;
  rangeEnd: number;
  hrefFor: (page: number) => string;
}) {
  if (result.rows.length === 0) return null;
  return (
    <footer className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
      <p className="text-xs font-semibold text-gray-500">Showing {rangeStart}–{rangeEnd} of {result.total.toLocaleString()}</p>
      <Pagination page={result.page} pageCount={result.pageCount} buildHref={hrefFor} />
    </footer>
  );
}
