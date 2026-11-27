import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageHeader, Pagination, tdCls, thCls } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listPaymentsAdmin } from "@/lib/services/admin-catalog";
import { verifyPaymentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "payments.view")) return <NoAccess />;

  const params = await searchParams;
  const result = await listPaymentsAdmin({ page: params.page ? Number(params.page) : 1 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={`${result.total} gateway and wallet payment record(s). Gateway status is always re-verified server-side.`}
      />

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Invoice</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Method / TXN</th>
                <th className={thCls}>Created</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((payment) => (
                <tr key={payment.id} className="transition hover:bg-orange-50/40">
                  <td className={`${tdCls} font-mono text-xs text-gray-600`}>
                    {payment.invoiceId ?? payment.id.slice(0, 8)}
                  </td>
                  <td className={tdCls}>{payment.customerEmail}</td>
                  <td className={`${tdCls} capitalize`}>
                    {payment.type.replace(/_/g, " ")} <span className="text-gray-400">· {payment.gateway}</span>
                  </td>
                  <td className={`${tdCls} font-bold text-gray-900`}>{formatBDT(payment.amount)}</td>
                  <td className={tdCls}>
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className={`${tdCls} text-xs text-gray-500`}>
                    <p className="capitalize">{payment.paymentMethod || "—"}</p>
                    <p className="font-mono">{payment.transactionId || ""}</p>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                    {new Date(payment.createdAt).toLocaleString("en-GB")}
                  </td>
                  <td className={tdCls}>
                    {payment.invoiceId && payment.status !== "completed" && (
                      <ActionForm action={verifyPaymentAction} submitLabel="Verify" hideButton>
                        <input type="hidden" name="invoiceId" value={payment.invoiceId} />
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-secondary"
                        >
                          Verify
                        </button>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.rows.length === 0 && (
          <EmptyState icon={CreditCard} title="No payments yet" description="Gateway and wallet payments appear here." />
        )}
      </Card>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        buildHref={(page) => `/admin/payments?page=${page}`}
      />
    </div>
  );
}
