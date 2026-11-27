import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CircleCheckBig,
  CreditCard,
  Mail,
  ReceiptText,
  RefreshCw,
  SearchX,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
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
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listPaymentsAdmin } from "@/lib/services/admin-catalog";
import { cn } from "@/lib/utils";
import { verifyPaymentAction } from "../actions";

export const dynamic = "force-dynamic";

type PaymentFlow = "all" | "order" | "wallet_deposit";
const PAYMENT_FILTERS: Array<PaymentStatus | "all"> = ["all", ...PAYMENT_STATUSES];

const PAYMENT_LABELS: Record<PaymentStatus | "all", string> = {
  all: "All",
  initiated: "Initiated",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; type?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "payments.view")) return <NoAccess />;
  const canViewCustomers = hasPermission(admin, "customers.view");
  const canViewOrders = hasPermission(admin, "orders.view");

  const params = await searchParams;
  const status = PAYMENT_STATUSES.includes(params.status as PaymentStatus) ? (params.status as PaymentStatus) : "all";
  const type: PaymentFlow = params.type === "order" || params.type === "wallet_deposit" ? params.type : "all";
  const result = await listPaymentsAdmin({
    page: params.page ? Number(params.page) : 1,
    search: params.q,
    status,
    type,
  });

  const hrefFor = (overrides: { page?: number; status?: PaymentStatus | "all"; type?: PaymentFlow } = {}) => {
    const nextStatus = overrides.status ?? status;
    const nextType = overrides.type ?? type;
    const page = overrides.page ?? 1;
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (nextStatus !== "all") query.set("status", nextStatus);
    if (nextType !== "all") query.set("type", nextType);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return `/admin/payments${value ? `?${value}` : ""}`;
  };
  const activeFilters = Boolean(params.q || status !== "all" || type !== "all");
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Payment ledger"
        title="Payments"
        description="A dedicated financial record of gateway charges and wallet deposits, with safe invoice verification and direct links to source records."
        icon={CreditCard}
        tone="blue"
        signal={result.summary.needsVerification > 0 ? `${result.summary.needsVerification} need verification` : "Gateway records current"}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Completed volume" value={formatBDT(result.summary.completedAmount)} hint={`${result.summary.counts.completed.toLocaleString()} completed`} icon={CircleCheckBig} tone="emerald" href={hrefFor({ status: "completed" })} />
        <StatCard label="Needs a re-check" value={result.summary.needsVerification.toLocaleString()} hint="Initiated, pending or failed" icon={RefreshCw} tone="amber" href={hrefFor({ status: "pending" })} />
        <StatCard label="Order payments" value={result.summary.orderPayments.toLocaleString()} hint="Checkout payment attempts" icon={ShoppingBag} tone="blue" href={hrefFor({ type: "order", status: "all" })} />
        <StatCard label="Wallet deposits" value={result.summary.walletDeposits.toLocaleString()} hint="Balance funding attempts" icon={Wallet} tone="violet" href={hrefFor({ type: "wallet_deposit", status: "all" })} />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><ShieldCheck className="h-4 w-4" /></span>
        <div>
          <p className="font-extrabold">Verification is read-only and server checked</p>
          <p className="mt-0.5 text-xs leading-relaxed text-blue-700">Verify asks the configured gateway for the current invoice state. It never marks a payment complete from browser input alone.</p>
        </div>
      </div>

      <SearchBar
        defaultValue={params.q ?? ""}
        placeholder="Invoice, transaction, sender or customer"
        resetHref={activeFilters ? "/admin/payments" : undefined}
        submitLabel="Filter"
      >
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <select name="type" defaultValue={type} className={`${selectCls} h-11 w-auto min-w-44`} aria-label="Payment flow">
          <option value="all">All payment flows</option>
          <option value="order">Order checkout</option>
          <option value="wallet_deposit">Wallet deposits</option>
        </select>
      </SearchBar>

      <Card padded={false} className="overflow-hidden">
        <nav aria-label="Filter payments by status" className="admin-scrollbar flex gap-1.5 overflow-x-auto border-b border-gray-100 bg-gray-50/60 px-3 py-3 sm:px-4">
          {PAYMENT_FILTERS.map((item) => {
            const active = status === item;
            const count = item === "all" ? result.summary.all : result.summary.counts[item];
            return (
              <Link
                key={item}
                href={hrefFor({ status: item })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-extrabold transition",
                  active ? "bg-gray-950 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm",
                )}
              >
                {PAYMENT_LABELS[item]}
                <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] tabular-nums", active ? "bg-white/15 text-white/80" : "bg-gray-200/70 text-gray-500")}>{count.toLocaleString()}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1040px]">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className={thCls}>Payment</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Related record</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Method & reference</th>
                <th className={thCls}>Created</th>
                <th className={`${thCls} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((payment) => (
                <tr key={payment.id} className="transition hover:bg-orange-50/30">
                  <td className={tdCls}>
                    <p className="font-mono text-xs font-black text-gray-800">{payment.invoiceId ?? payment.id.slice(0, 10)}</p>
                    <FlowBadge type={payment.type} />
                  </td>
                  <td className={tdCls}>
                    {canViewCustomers ? (
                      <Link href={`/admin/customers/${payment.userId}`} className="block max-w-[190px] truncate text-sm font-extrabold text-gray-800 hover:text-accent-orange">{payment.customerName || "Unnamed customer"}</Link>
                    ) : (
                      <p className="max-w-[190px] truncate text-sm font-extrabold text-gray-800">{payment.customerName || "Unnamed customer"}</p>
                    )}
                    <p className="max-w-[200px] truncate text-[11px] text-gray-400">{payment.customerEmail}</p>
                  </td>
                  <td className={tdCls}>
                    {payment.orderId && canViewOrders ? (
                      <Link href={`/admin/orders/${payment.orderId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-accent-orange">Order #{payment.orderNumber ?? payment.orderId} <ArrowRight className="h-3 w-3" /></Link>
                    ) : !payment.orderId && canViewCustomers ? (
                      <Link href={`/admin/customers/${payment.userId}?tab=wallet`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-accent-orange">Customer wallet <ArrowRight className="h-3 w-3" /></Link>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">{payment.orderId ? `Order #${payment.orderNumber ?? payment.orderId}` : "Customer wallet"}</span>
                    )}
                  </td>
                  <td className={`${tdCls} whitespace-nowrap font-black text-gray-950`}>{formatBDT(payment.amount)}</td>
                  <td className={tdCls}><StatusBadge status={payment.status} /></td>
                  <td className={`${tdCls} text-xs text-gray-500`}>
                    <p className="font-bold capitalize text-gray-700">{payment.paymentMethod || payment.gateway}</p>
                    <p className="max-w-[180px] truncate font-mono text-[10px]" title={payment.transactionId ?? payment.senderNumber ?? undefined}>{payment.transactionId || payment.senderNumber || "No reference yet"}</p>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-xs font-medium text-gray-500`}>
                    {new Date(payment.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {payment.invoiceId && payment.status !== "completed" ? <VerifyPayment invoiceId={payment.invoiceId} /> : <span className="text-[11px] font-semibold text-gray-300">No action</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-gray-100 lg:hidden">
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
                <MobileFact label="Amount" value={formatBDT(payment.amount)} />
                <MobileFact label="Flow" value={payment.type === "order" ? "Order" : "Deposit"} />
                <MobileFact label="Method" value={payment.paymentMethod || payment.gateway} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {canViewCustomers ? (
                  <Link href={`/admin/customers/${payment.userId}`} className="min-w-0 truncate text-[11px] font-bold text-gray-600 hover:text-accent-orange">{payment.customerName || "Open customer"} →</Link>
                ) : (
                  <span className="min-w-0 truncate text-[11px] font-bold text-gray-500">{payment.customerName || payment.customerEmail}</span>
                )}
                {payment.invoiceId && payment.status !== "completed" && <VerifyPayment invoiceId={payment.invoiceId} />}
              </div>
            </li>
          ))}
        </ul>

        {result.rows.length === 0 && (
          <EmptyState
            icon={activeFilters ? SearchX : CreditCard}
            title={activeFilters ? "No payments match" : "No payments yet"}
            description={activeFilters ? "Try a broader search, another flow, or a different status." : "Gateway payment attempts and wallet deposits will appear here."}
            action={activeFilters ? <Link href="/admin/payments" className={btnSecondary}>Clear filters</Link> : undefined}
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

function VerifyPayment({ invoiceId }: { invoiceId: string }) {
  return (
    <ActionForm action={verifyPaymentAction} submitLabel="Verify" hideButton>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-[11px] font-extrabold text-white transition hover:bg-gray-800">
        <RefreshCw className="h-3.5 w-3.5" /> Re-check
      </button>
    </ActionForm>
  );
}

function FlowBadge({ type }: { type: "order" | "wallet_deposit" }) {
  const Icon = type === "order" ? ReceiptText : Wallet;
  return <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500"><Icon className="h-2.5 w-2.5" />{type === "order" ? "Order" : "Wallet deposit"}</span>;
}

function MobileFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 truncate text-xs font-black capitalize text-gray-800">{value}</p></div>;
}
