import Link from "next/link";
import { ArrowRight, ReceiptText, X } from "lucide-react";

import { addOrderNoteAction, updateOrderStatusAction } from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/admin/copy-button";
import { DrawerBehavior, DrawerClose } from "@/components/admin/drawer-controls";
import { AdminOverlayPortal } from "@/components/admin/overlay-portal";
import { btnPrimary, selectCls } from "@/components/admin/ui";
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
    <AdminOverlayPortal>
      <DrawerBehavior closeHref={closeHref} />
      <DrawerClose
        href={closeHref}
        label="Close quick view"
        className="fixed inset-0 z-[90] bg-gray-950/45 backdrop-blur-[3px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order #${order.orderNumber}`}
        className="animate-slide-right fixed inset-y-0 right-0 z-[100] flex w-full flex-col border-l border-gray-200 bg-white text-gray-900 shadow-2xl sm:w-[38rem] sm:max-w-[calc(100vw-1rem)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-base font-bold">Order #{order.orderNumber}</p>
            <p className="text-xs text-gray-500">{dateTime(order.createdAt)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                  PAYMENT_TONE[order.paymentStatus],
                )}
              >
                Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </span>
            </div>
          </div>
          <DrawerClose
            href={closeHref}
            label="Close quick view"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </DrawerClose>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
          <Section title="Customer">
            <dl className="space-y-2.5 text-sm">
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
                {formatBDT(totalSpent)} <span className="font-normal text-gray-500">· {paidOrderCount} paid</span>
              </Row>
              <Row label="Previous orders">{previousOrderCount}</Row>
            </dl>
            <Link
              href={`/admin/customers/${detail.customerId}`}
              className="mt-3 inline-block text-xs font-semibold text-accent-orange hover:underline"
            >
              View customer
            </Link>
          </Section>

          <Section title="Payment">
            <dl className="space-y-2.5 text-sm">
              <Row label="Total">
                <span className="text-base">{formatBDT(order.total)}</span>
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

          <Section title="Items">
            <ul className="space-y-3">
              {detail.items.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ReceiptText className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{item.productName}</p>
                        <p className="truncate text-xs text-gray-500">
                          {item.variationName || "Standard"} · × {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-gray-900">{formatBDT(item.lineTotal)}</p>
                    </div>
                    {item.sku ? (
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-gray-600">SKU {item.sku}</span>
                        <CopyButton value={item.sku} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {playerFields.length > 0 ? (
              <dl className="mt-3 space-y-2.5 rounded-xl bg-orange-50/60 p-3 text-sm">
                {playerFields.map(([label, value]) => (
                  <Row key={label} label={label}>
                    <span className="min-w-0 break-all font-mono text-xs">{value}</span>
                    {value ? <CopyButton value={value} /> : null}
                  </Row>
                ))}
              </dl>
            ) : null}

            {order.customerNote ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                Customer note: {order.customerNote}
              </p>
            ) : null}
          </Section>

          <Section title="Change status">
            {!canUpdate ? (
              <p className="text-sm text-gray-500">You do not have permission to change order status.</p>
            ) : transitions.length === 0 ? (
              <p className="text-sm text-gray-500">This order is final. Use a refund if money must be returned.</p>
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
              <p className="text-sm text-gray-500">No messages sent to the customer yet.</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((note) => (
                  <li key={note.id} className="rounded-xl bg-gray-50 p-3">
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
                rows={3}
                maxLength={2000}
                required
                placeholder="Message to customer (delivery info, ask for OTP…)"
                className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-orange focus:outline-none focus:ring-2 focus:ring-accent-orange/20"
              />
            </ActionForm>
          </Section>
        </div>

        <footer className="shrink-0 border-t border-gray-200 p-4">
          <Link href={`/admin/orders/${order.id}`} className={cn(btnPrimary, "w-full justify-center")}>
            Open full order <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </aside>
    </AdminOverlayPortal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-accent-orange">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right font-semibold text-gray-900">
        {children}
      </dd>
    </div>
  );
}
