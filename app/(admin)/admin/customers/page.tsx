import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

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
  const result = await getCustomers({
    search: params.q,
    page: params.page ? Number(params.page) : 1,
  });

  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    const qs = query.toString();
    return `/admin/customers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${result.total} registered customer(s).`} />

      <SearchBar defaultValue={params.q ?? ""} placeholder="Search name or email" />

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Phone</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}>Wallet</th>
                <th className={thCls}>Joined</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((customer) => (
                <tr key={customer.id} className="transition hover:bg-orange-50/40">
                  <td className={tdCls}>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="font-semibold text-gray-900 hover:text-accent-orange"
                    >
                      {customer.name || "Unnamed customer"}
                    </Link>
                    <p className="text-xs text-gray-400">{customer.email}</p>
                  </td>
                  <td className={tdCls}>{customer.phone || "—"}</td>
                  <td className={tdCls}>{customer.orderCount}</td>
                  <td className={`${tdCls} font-bold text-gray-900`}>{formatBDT(customer.balance)}</td>
                  <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                    {new Date(customer.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className={tdCls}>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        customer.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-red-50 text-red-600 ring-red-200"
                      }`}
                    >
                      {customer.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.rows.length === 0 && (
          <EmptyState icon={Users} title="No customers found" description="Try a different name or email." />
        )}
      </Card>

      <Pagination page={result.page} pageCount={result.pageCount} buildHref={hrefFor} />
    </div>
  );
}
