import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Phone,
  SearchX,
  UserCheck,
  Users,
  UserX,
  Wallet,
} from "lucide-react";

import { CustomerMoneyNav } from "@/components/admin/workspace-nav";
import {
  btnSecondary,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  SearchBar,
  StatCard,
  tdCls,
  thCls,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getCustomers } from "@/lib/services/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CustomerFilter = "all" | "active" | "disabled";

const FILTERS: Array<{ key: CustomerFilter; label: string; icon: typeof Users }> = [
  { key: "all", label: "All customers", icon: Users },
  { key: "active", label: "Active", icon: UserCheck },
  { key: "disabled", label: "Disabled", icon: UserX },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "customers.view")) return <NoAccess />;

  const params = await searchParams;
  const status: CustomerFilter = ["active", "disabled"].includes(params.status ?? "")
    ? (params.status as CustomerFilter)
    : "all";
  const result = await getCustomers({
    search: params.q,
    status,
    page: params.page ? Number(params.page) : 1,
  });

  const hrefFor = (overrides: { page?: number; status?: CustomerFilter } = {}) => {
    const nextStatus = overrides.status ?? status;
    const page = overrides.page ?? 1;
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (nextStatus !== "all") query.set("status", nextStatus);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return `/admin/customers${value ? `?${value}` : ""}`;
  };
  const activeFilters = Boolean(params.q || status !== "all");
  const resetSearchHref = status === "all" ? "/admin/customers" : `/admin/customers?status=${status}`;
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);
  const counts: Record<CustomerFilter, number> = {
    all: result.summary.total,
    active: result.summary.active,
    disabled: result.summary.disabled,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Customer relationships"
        title="Customers"
        description="Find an account, understand its order and wallet history, then take the right action from one profile."
      />

      <CustomerMoneyNav admin={admin} active="customers" />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card padded={false} className="overflow-hidden">
          <nav aria-label="Filter customers by account status" className="grid grid-cols-3 divide-x divide-gray-100">
            {FILTERS.map(({ key, label, icon: Icon }) => {
              const active = status === key;
              return (
                <Link
                  key={key}
                  href={hrefFor({ status: key })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-w-0 items-center gap-2.5 px-3 py-3.5 transition sm:px-4",
                    active ? "bg-gray-950 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <span className={cn("hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:flex", active ? "bg-white/10 text-accent-orange" : "bg-gray-100 text-gray-500 group-hover:text-accent-orange")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[10px] font-black uppercase tracking-[0.08em]", active ? "text-white/55" : "text-gray-400")}>{label}</span>
                    <span className="mt-0.5 block text-lg font-black tabular-nums">{counts[key].toLocaleString()}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </Card>
        <StatCard
          label="Customer wallet funds"
          value={formatBDT(result.summary.walletBalance)}
          hint={`${result.summary.withWallet.toLocaleString()} customer wallet${result.summary.withWallet === 1 ? "" : "s"}`}
          icon={Wallet}
          tone="emerald"
          href={hasPermission(admin, "wallet.manage") ? "/admin/wallets" : undefined}
        />
      </div>

      <SearchBar
        defaultValue={params.q ?? ""}
        placeholder="Search name, email or phone number"
        resetHref={params.q ? resetSearchHref : undefined}
        submitLabel="Filter"
      >
        {status !== "all" && <input type="hidden" name="status" value={status} />}
      </SearchBar>

      <Card
        title={activeFilters ? "Matching customers" : "Customer directory"}
        description={activeFilters ? `${result.total.toLocaleString()} account${result.total === 1 ? "" : "s"} match the current view.` : "Every registered customer, newest first."}
        padded={false}
        className="overflow-hidden"
      >
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Contact</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}>Wallet balance</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Access</th>
                <th className={`${thCls} text-right`}>Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((customer) => {
                const initial = (customer.name || customer.email).charAt(0).toUpperCase();
                return (
                  <tr key={customer.id} className="transition hover:bg-orange-50/30">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-xs font-black text-white">
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/customers/${customer.id}`} className="block max-w-[220px] truncate font-extrabold text-gray-900 hover:text-accent-orange">
                            {customer.name || "Unnamed customer"}
                          </Link>
                          <p className="max-w-[220px] truncate text-[11px] text-gray-400">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <p className="flex items-center gap-1.5 text-xs text-gray-600"><Phone className="h-3 w-3 text-gray-400" /> {customer.phone || "No phone"}</p>
                    </td>
                    <td className={tdCls}>
                      {hasPermission(admin, "orders.view") ? (
                        <Link href={`/admin/orders?q=${encodeURIComponent(customer.email)}`} className="inline-flex min-w-8 items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-black text-gray-700 transition hover:bg-orange-50 hover:text-accent-orange">{customer.orderCount}</Link>
                      ) : (
                        <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-black text-gray-700">{customer.orderCount}</span>
                      )}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {hasPermission(admin, "wallet.manage") ? (
                        <Link href={`/admin/customers/${customer.id}?tab=wallet`} className="font-black text-gray-950 hover:text-accent-orange">{formatBDT(customer.balance)}</Link>
                      ) : (
                        <span className="font-black text-gray-950">{formatBDT(customer.balance)}</span>
                      )}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>
                      {new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className={tdCls}><CustomerStatus active={customer.isActive} /></td>
                    <td className={`${tdCls} text-right`}>
                      <Link href={`/admin/customers/${customer.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-gray-100 md:hidden">
          {result.rows.map((customer) => {
            const initial = (customer.name || customer.email).charAt(0).toUpperCase();
            return (
              <li key={customer.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-sm font-black text-white">{initial}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/customers/${customer.id}`} className="truncate text-sm font-extrabold text-gray-900">{customer.name || "Unnamed customer"}</Link>
                      <CustomerStatus active={customer.isActive} compact />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500"><Mail className="h-3 w-3" /> {customer.email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3 w-3" /> {customer.phone || "No phone"}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
                  <MobileFact label="Orders" value={String(customer.orderCount)} />
                  <MobileFact label="Wallet" value={formatBDT(customer.balance)} />
                  <MobileFact label="Joined" value={new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                </div>
                <Link href={`/admin/customers/${customer.id}`} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700 transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">
                  View account, orders & wallet <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>

        {result.rows.length === 0 && (
          <EmptyState
            icon={activeFilters ? SearchX : Users}
            title={activeFilters ? "No customers match" : "No customers yet"}
            description={activeFilters ? "Try another search or clear the current account-status filter." : "Registered customer accounts will appear here."}
            action={activeFilters ? <Link href="/admin/customers" className={btnSecondary}>Clear filters</Link> : undefined}
          />
        )}

        {result.rows.length > 0 && (
          <footer className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
            <p className="text-xs font-semibold text-gray-500">Showing {rangeStart}–{rangeEnd} of {result.total.toLocaleString()}</p>
            <Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => hrefFor({ page })} />
          </footer>
        )}
      </Card>
    </div>
  );
}

function CustomerStatus({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold ring-1 ring-inset ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function MobileFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">{label}</p><p className="mt-0.5 truncate font-black text-gray-900">{value}</p></div>;
}
