import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDownUp, ReceiptText, Wallet } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, Field, inputCls, PageHeader, selectCls, textareaCls } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getCustomerDetail } from "@/lib/services/admin";
import { adjustWalletAction, toggleCustomerAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "customers.view")) return <NoAccess />;

  const { id } = await params;
  const data = await getCustomerDetail(id);
  if (!data) notFound();

  const initial = (data.user.name || data.user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={data.user.name || "Unnamed customer"}
        description={data.user.email}
        actions={
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              data.user.isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-red-50 text-red-600 ring-red-200"
            }`}
          >
            {data.user.isActive ? "Active" : "Disabled"}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-5">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-orange to-orange-400 text-2xl font-extrabold text-white shadow-lg shadow-orange-500/30">
                {initial}
              </span>
              <dl className="grid flex-1 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phone</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{data.user.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Joined</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">
                    {new Date(data.user.createdAt).toLocaleDateString("en-GB")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Wallet</dt>
                  <dd className="mt-0.5 font-extrabold text-gray-900">{formatBDT(data.balance)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sign-in</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">
                    {data.user.googleId ? "Google" : "Email & password"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <ActionForm
                action={toggleCustomerAction}
                submitLabel={data.user.isActive ? "Disable account" : "Enable account"}
                confirm={
                  data.user.isActive
                    ? "Disable this customer? They will not be able to sign in."
                    : "Enable this customer?"
                }
                buttonClassName="bg-white text-red-600 border border-red-200 shadow-none hover:bg-red-50"
              >
                <input type="hidden" name="userId" value={data.user.id} />
              </ActionForm>
            </div>
          </Card>

          <Card title="Recent orders" icon={ReceiptText} padded={false}>
            <ul className="divide-y divide-gray-100">
              {data.orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-orange-50/40"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-gray-900">{order.publicId}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("en-GB")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="w-24 text-right text-sm font-bold text-gray-900">{formatBDT(order.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {data.orders.length === 0 && (
              <EmptyState icon={ReceiptText} title="No orders yet" description="Orders from this customer appear here." />
            )}
          </Card>

          <Card title="Wallet activity" icon={ArrowDownUp} padded={false}>
            <ul className="divide-y divide-gray-100">
              {data.transactions.map((transaction) => {
                const positive = Number(transaction.amount) > 0;
                return (
                  <li key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize text-gray-800">
                        {transaction.type.replace(/_/g, " ")}
                      </p>
                      <p className="truncate text-xs text-gray-400">{transaction.description}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${positive ? "text-emerald-600" : "text-gray-700"}`}>
                      {positive ? "+" : ""}
                      {formatBDT(transaction.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {data.transactions.length === 0 && (
              <EmptyState icon={Wallet} title="No wallet activity" description="Deposits, payments and refunds show here." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {hasPermission(admin, "wallet.manage") && (
            <Card title="Adjust wallet" icon={Wallet} description="Every adjustment needs a reason and is written to the ledger.">
              <ActionForm
                action={adjustWalletAction}
                submitLabel="Apply adjustment"
                confirm="Apply this wallet adjustment?"
                className="space-y-4"
              >
                <input type="hidden" name="userId" value={data.user.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (৳)">
                    <input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required className={inputCls} />
                  </Field>
                  <Field label="Direction">
                    <select name="direction" className={selectCls}>
                      <option value="credit">Credit (+)</option>
                      <option value="debit">Debit (−)</option>
                    </select>
                  </Field>
                </div>
                <Field label="Reason">
                  <textarea name="reason" rows={2} required placeholder="Required" className={textareaCls} />
                </Field>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
