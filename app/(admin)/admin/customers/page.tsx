import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Phone, Users, Wallet } from "lucide-react";

import { Card, EmptyState, PageHeader, Pagination, SearchBar, tdCls, thCls } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getCustomers } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "customers.view")) return <NoAccess />;

  const params = await searchParams;
  const result = await getCustomers({ search: params.q, page: params.page ? Number(params.page) : 1 });

  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return `/admin/customers${value ? `?${value}` : ""}`;
  };
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Customer relationships"
        title="Customers"
        description={`${result.total.toLocaleString()} customer${result.total === 1 ? "" : "s"}${params.q ? " match this search" : " registered on GONTOP"}. Open a profile to review orders or manage their wallet.`}
      />

      <SearchBar
        defaultValue={params.q ?? ""}
        placeholder="Search name, email or phone number"
        resetHref={params.q ? "/admin/customers" : undefined}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Contact</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}>Wallet balance</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Status</th>
                <th className={`${thCls} text-right`}>Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((customer) => {
                const initial = (customer.name || customer.email).charAt(0).toUpperCase();
                return (
                  <tr key={customer.id} className="hover:bg-orange-50/30">
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
                      <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-black text-gray-700">{customer.orderCount}</span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap font-black text-gray-950`}>{formatBDT(customer.balance)}</td>
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
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Orders</p><p className="mt-0.5 font-black text-gray-900">{customer.orderCount}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Wallet</p><p className="mt-0.5 truncate font-black text-gray-900">{formatBDT(customer.balance)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Joined</p><p className="mt-0.5 font-bold text-gray-700">{new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p></div>
                </div>
                <Link href={`/admin/customers/${customer.id}`} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-extrabold text-gray-700">
                  View customer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>

        {result.rows.length === 0 && (
          <EmptyState icon={Users} title="No customers found" description="Try a different name, email, or phone number." />
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

function CustomerStatus({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold ring-1 ring-inset ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
      {active ? "Active" : "Disabled"}
    </span>
  );
}
