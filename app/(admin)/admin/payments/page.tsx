import { redirect } from "next/navigation";
import { CreditCard, Mail, ReceiptText } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageHeader, Pagination, SearchBar, selectCls, tdCls, thCls } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listPaymentsAdmin } from "@/lib/services/admin-catalog";
import { verifyPaymentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "payments.view")) return <NoAccess />;

  const params = await searchParams;
  const status = PAYMENT_STATUSES.includes(params.status as PaymentStatus) ? (params.status as PaymentStatus) : "all";
  const result = await listPaymentsAdmin({
    page: params.page ? Number(params.page) : 1,
    search: params.q,
    status,
  });

  const hrefFor = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (status !== "all") query.set("status", status);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return `/admin/payments${value ? `?${value}` : ""}`;
  };
  const activeFilters = Boolean(params.q || status !== "all");
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Money movement"
        title="Payments"
        description={`${result.total.toLocaleString()} payment record${result.total === 1 ? "" : "s"}${activeFilters ? " match the current filters" : " across gateway and wallet flows"}. Gateway payments are always re-verified on the server.`}
      />

      <SearchBar
        defaultValue={params.q ?? ""}
        placeholder="Invoice, transaction, sender or customer"
        resetHref={activeFilters ? "/admin/payments" : undefined}
      >
        <select name="status" defaultValue={status} className={`${selectCls} h-11 w-auto min-w-40`}>
          <option value="all">All statuses</option>
          {PAYMENT_STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
        </select>
      </SearchBar>

      <Card padded={false} className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[940px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Invoice</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Flow</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Method / transaction</th>
                <th className={thCls}>Created</th>
                <th className={`${thCls} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((payment) => (
                <tr key={payment.id} className="hover:bg-orange-50/30">
                  <td className={`${tdCls} font-mono text-xs font-bold text-gray-700`}>
                    {payment.invoiceId ?? payment.id.slice(0, 10)}
                  </td>
                  <td className={tdCls}>
                    <p className="max-w-[190px] truncate text-sm font-bold text-gray-800">{payment.customerName || "Unnamed customer"}</p>
                    <p className="max-w-[200px] truncate text-[11px] text-gray-400">{payment.customerEmail}</p>
                  </td>
                  <td className={`${tdCls} capitalize`}>
                    <p className="text-xs font-bold text-gray-700">{payment.type.replace(/_/g, " ")}</p>
                    <p className="text-[10px] capitalize text-gray-400">via {payment.gateway}</p>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap font-black text-gray-950`}>{formatBDT(payment.amount)}</td>
                  <td className={tdCls}><StatusBadge status={payment.status} /></td>
                  <td className={`${tdCls} text-xs text-gray-500`}>
                    <p className="font-bold capitalize text-gray-700">{payment.paymentMethod || "—"}</p>
                    <p className="max-w-[170px] truncate font-mono text-[10px]" title={payment.transactionId ?? undefined}>{payment.transactionId || payment.senderNumber || "No reference"}</p>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>
                    {new Date(payment.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {payment.invoiceId && payment.status !== "completed" ? (
                      <VerifyPayment invoiceId={payment.invoiceId} />
                    ) : <span className="text-[11px] font-semibold text-gray-300">No action</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-gray-100 md:hidden">
          {result.rows.map((payment) => (
            <li key={payment.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-black text-gray-900">{payment.invoiceId ?? payment.id.slice(0, 10)}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500"><Mail className="h-3 w-3" /> {payment.customerEmail}</p>
                </div>
                <StatusBadge status={payment.status} className="px-2 py-0.5 text-[10px]" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3">
                <div><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Amount</p><p className="mt-1 truncate text-sm font-black text-gray-950">{formatBDT(payment.amount)}</p></div>
                <div><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Type</p><p className="mt-1 truncate text-xs font-bold capitalize text-gray-700">{payment.type.replace(/_/g, " ")}</p></div>
                <div><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Method</p><p className="mt-1 truncate text-xs font-bold capitalize text-gray-700">{payment.paymentMethod || payment.gateway}</p></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="truncate text-[10px] font-medium text-gray-400">{new Date(payment.createdAt).toLocaleString("en-GB")}</p>
                {payment.invoiceId && payment.status !== "completed" && <VerifyPayment invoiceId={payment.invoiceId} />}
              </div>
            </li>
          ))}
        </ul>

        {result.rows.length === 0 && (
          <EmptyState icon={activeFilters ? ReceiptText : CreditCard} title="No payments found" description={activeFilters ? "Try clearing or broadening the filters." : "Gateway and wallet payments appear here."} />
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

function VerifyPayment({ invoiceId }: { invoiceId: string }) {
  return (
    <ActionForm action={verifyPaymentAction} submitLabel="Verify" hideButton>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-[11px] font-extrabold text-white transition hover:bg-gray-800">
        <CreditCard className="h-3.5 w-3.5" /> Verify
      </button>
    </ActionForm>
  );
}
