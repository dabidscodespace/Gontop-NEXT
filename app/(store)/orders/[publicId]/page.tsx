import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Package } from "lucide-react";

import { OrderActions } from "@/components/store/order-actions";
import { OrderTracker } from "@/components/store/order-tracker";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT, money } from "@/lib/money";
import { getOrderWithDetails } from "@/lib/services/orders";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order status",
  robots: { index: false },
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ invoice_id?: string; cancelled?: string }>;
}) {
  const [{ publicId }, query, { user }, settings] = await Promise.all([
    params,
    searchParams,
    getSession(),
    getSettings(),
  ]);

  if (!user) redirect(`/login?next=/orders/${publicId}`);

  const data = await getOrderWithDetails(publicId);
  if (!data || data.order.userId !== user.id) notFound();

  const { order, items, history, payments, visibleNotes } = data;
  const gatewayPayment = payments.find((payment) => payment.gateway === "uddoktapay");

  return (
    <div className="min-h-screen bg-cover bg-center bg-repeat-y" style={{ backgroundImage: "url('/swiper_bg.svg')" }}>
      <div className="mx-auto max-w-3xl px-3 py-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-accent-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All orders
        </Link>

        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Order</p>
              <h1 className="font-mono text-lg font-bold text-gray-900">{order.publicId}</h1>
              <p className="mt-0.5 text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <OrderTracker
            publicId={order.publicId}
            initialStatus={order.status}
            invoiceId={query.invoice_id}
            pollingSeconds={settings.orderPollingSeconds}
          />

          {query.cancelled === "1" && order.status === "pending_payment" && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Payment was not completed. You can retry from this page or cancel the order to
              release any G Coin used.
            </div>
          )}

          {order.status === "pending_payment" && (
            <OrderActions
              publicId={order.publicId}
              canRetryPayment={money(order.gatewayAmount) > 0}
            />
          )}
        </div>

        {(order.deliveryMessage || visibleNotes.length > 0) && (
          <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800">Message from the store</h2>
            {order.deliveryMessage && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{order.deliveryMessage}</p>
            )}
            {visibleNotes.map((note) => (
              <div key={note.id} className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {new Date(note.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Items</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-500">{item.variationName}</p>
                  {item.sku && <p className="text-[10px] text-gray-400">SKU: {item.sku}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">×{item.quantity}</p>
                  <p className="font-semibold text-gray-800">{formatBDT(item.lineTotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {Object.keys(order.playerFields).length > 0 && (
          <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800">Game details</h2>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(order.playerFields).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 break-all text-sm font-semibold text-gray-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Payment</h2>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatBDT(order.subtotal)}</span>
            </div>
            {money(order.walletAmount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Paid with G Coin</span>
                <span>{formatBDT(order.walletAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatBDT(order.total)}</span>
            </div>
            {gatewayPayment?.transactionId && (
              <p className="pt-1 text-[11px] text-gray-500">
                Gateway transaction: <span className="font-mono">{gatewayPayment.transactionId}</span>
              </p>
            )}
            {gatewayPayment?.status === "initiated" && order.status === "pending_payment" && (
              <p className="pt-1 text-[11px] text-amber-600">
                A gateway payment was started. Use “Check payment” above after paying.
              </p>
            )}
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Order timeline</h2>
          <ol className="mt-3 space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-orange" />
                <div>
                  <p className="text-sm font-medium capitalize text-gray-800">
                    {entry.toStatus.replace(/_/g, " ")}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.createdAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {entry.note && entry.customerVisible && <p className="mt-0.5 text-xs text-gray-500">{entry.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
