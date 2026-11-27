import Link from "next/link";
import { ArrowRight, ReceiptText, X } from "lucide-react";

import { addOrderNoteAction, updateOrderStatusAction } from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/admin/copy-button";
import { DrawerBehavior, DrawerClose } from "@/components/admin/drawer-controls";
import { btnPrimary, btnSecondary, selectCls } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import type { OrderPaymentStatus, OrderStatus } from "@/db/schema";
import { formatBDT } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-status";
import type { getAdminOrder } from "@/lib/services/orders";
import { cn } from "@/lib/utils";

type OrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

const PAYMENT_TONE: Record<OrderPaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  partially_refunded: "bg-purple-50 text-purple-700 ring-purple-200",
  refunded: "bg-purple-50 text-purple-700 ring-purple-200",
};

const dateTime = (value: Date | string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function OrderQuickView({
  detail,
  totalSpent,
  paidOrderCount,
  previousOrderCount,
  canUpdate,
  transitions,
  closeHref,
}: {
  detail: OrderDetail;
  totalSpent: string;
  paidOrderCount: number;
  previousOrderCount: number;
  canUpdate: boolean;
  transitions: OrderStatus[];
  closeHref: string;
}) {
  const { order } = detail;
  const latestPayment = detail.payments[0];
  const verifiedPayment = detail.payments.find((payment) => payment.completedAt);
  const playerFields = Object.entries(order.playerFields ?? {});
  const messages = detail.notes.filter((note) => note.customerVisible).slice().reverse();

  return (
    <>
      <DrawerBehavior closeHref={closeHref} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order #${order.orderNumber}`}
        className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-gray-50 text-gray-900"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent-orange">Order workspace</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-black tracking-tight text-gray-950 sm:text-xl">
                Order #{order.orderNumber}
              </h2>
              <CopyButton value={String(order.orderNumber)} compact label="Copy order number" />
              <StatusBadge status={order.status} />
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
                  PAYMENT_TONE[order.paymentStatus],
                )}
              >
                Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-gray-500">Placed {dateTime(order.createdAt)}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden border-r border-gray-200 pr-4 text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order total</p>
              <p className="text-lg font-black text-gray-950">{formatBDT(order.total)}</p>
            </div>
            <Link href={`/admin/orders/${order.id}`} className={cn(btnPrimary, "h-10 px-3 sm:px-4")}>
              Full order <ArrowRight className="h-4 w-4" />
            </Link>
            <DrawerClose
              href={closeHref}
              label="Close order workspace"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-950"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </div>
        </header>

        <div className="admin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6">
          <div className="mx-auto grid max-w-[1600px] items-start gap-4 xl:grid-cols-[minmax(280px,.8fr)_minmax(420px,1.25fr)_minmax(320px,.9fr)]">
            <div className="space-y-4">
              <Section title="Customer">
                <dl className="space-y-3 text-sm">
                  <Row label="Name">{detail.customerName || "—"}</Row>
                  <Row label="Email">
                    <span className="min-w-0 break-all">{detail.customerEmail}</span>
                    <CopyButton value={detail.customerEmail} />
                  </Row>
                  <Row label="Phone">
                    {detail.customerPhone ? (
                      <>
                        <span className="font-mono text-xs">{detail.customerPhone}</span>
                        <CopyButton value={detail.customerPhone} />
                      </>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="Total spent">
                    {formatBDT(totalSpent)}
                    <span className="font-normal text-gray-500">· {paidOrderCount} paid</span>
                  </Row>
                  <Row label="Previous orders">{previousOrderCount}</Row>
                </dl>
                <Link
                  href={`/admin/customers/${detail.customerId}`}
                  className={cn(btnSecondary, "mt-4 h-9 w-full justify-center")}
                >
                  View customer
                </Link>
              </Section>

              <Section title="Payment">
                <dl className="space-y-3 text-sm">
                  <Row label="Total">
                    <span className="text-base font-black">{formatBDT(order.total)}</span>
                  </Row>
                  <Row label="Method">{order.paymentMethod}</Row>
                  <Row label="Transaction ID">
                    {latestPayment?.transactionId ? (
                      <>
                        <span className="font-mono text-xs">{latestPayment.transactionId}</span>
                        <CopyButton value={latestPayment.transactionId} />
                      </>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="Sender">
                    {latestPayment?.senderNumber ? (
                      <>
                        <span className="font-mono text-xs">{latestPayment.senderNumber}</span>
                        <CopyButton value={latestPayment.senderNumber} />
                      </>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="Paid at">{order.paidAt ? dateTime(order.paidAt) : "Not paid yet"}</Row>
                  <Row label="Verified at">
                    {verifiedPayment?.completedAt ? dateTime(verifiedPayment.completedAt) : "—"}
                  </Row>
                </dl>
              </Section>
            </div>

            <Section title="Items and delivery details" className="xl:min-h-[calc(100dvh-8.75rem)]">
              <ul className="space-y-3">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ReceiptText className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-gray-950">{item.productName}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {item.variationName || "Standard"} · × {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-gray-950">{formatBDT(item.lineTotal)}</p>
                      </div>
                      {item.sku ? (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-gray-100">
                          <span className="font-mono text-gray-600">SKU {item.sku}</span>
                          <CopyButton value={item.sku} />
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              {playerFields.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Player information</p>
                  <dl className="grid gap-2 rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-sm sm:grid-cols-2">
                    {playerFields.map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-white/80 p-2.5 ring-1 ring-orange-100/70">
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
                        <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-xs font-bold text-gray-900">
                          <span className="min-w-0 break-all">{value}</span>
                          {value ? <CopyButton value={value} /> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {order.customerNote ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">Customer note</p>
                  <p className="mt-1 whitespace-pre-wrap">{order.customerNote}</p>
                </div>
              ) : null}
            </Section>

            <div className="space-y-4">
              <Section title="Order workflow">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order</p>
                    <p className="mt-1 text-sm font-extrabold text-gray-900">{ORDER_STATUS_LABELS[order.status]}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment</p>
                    <p className="mt-1 text-sm font-extrabold text-gray-900">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
                  </div>
                </div>
                {!canUpdate ? (
                  <p className="text-sm text-gray-500">You do not have permission to change order status.</p>
                ) : transitions.length === 0 ? (
                  <p className="text-sm text-gray-500">This order is final. Use the refund workflow if money must be returned.</p>
                ) : (
                  <ActionForm action={updateOrderStatusAction} submitLabel="Save status" className="space-y-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-gray-600">New status</span>
                      <select name="status" className={cn(selectCls, "w-full")}>
                        {transitions.map((next) => (
                          <option key={next} value={next}>
                            {ORDER_STATUS_LABELS[next]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </ActionForm>
                )}
              </Section>

              <Section title="Messages with customer">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500">No customer-visible messages yet.</p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {messages.map((note) => (
                      <li key={note.id} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                        <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
                        <p className="mt-1 text-[11px] text-gray-500">{dateTime(note.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <ActionForm action={addOrderNoteAction} submitLabel="Send to customer" className="mt-3 space-y-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="customerVisible" value="1" />
                  <textarea
                    name="content"
                    rows={4}
                    maxLength={2000}
                    required
                    placeholder="Delivery information, OTP request, or another customer update…"
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-orange focus:outline-none focus:ring-2 focus:ring-accent-orange/20"
                  />
                </ActionForm>
              </Section>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.14em] text-accent-orange">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right font-semibold text-gray-900">
        {children}
      </dd>
    </div>
  );
}
