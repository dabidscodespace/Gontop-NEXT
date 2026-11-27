import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, ShieldCheck, ShoppingBag } from "lucide-react";

import {
  refundAction,
  resolvePendingRefundAction,
  verifyPaymentAction,
  addOrderNoteAction,
  deleteOrderNoteAction,
  saveDeliveryMessageAction,
} from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/action-form";
import {
  Card,
  PageHeader,
  inputCls,
  selectCls,
  tdCls,
  textareaCls,
  thCls,
} from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/copy-button";
import { OrderStatusPanel } from "@/components/admin/order-status-panel";
import { NoAccess } from "@/components/admin/no-access";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { getFulfillmentProvider } from "@/lib/fulfillment";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import {
  getAdminLabels,
  getAdminOrder,
  getCustomerPaidSummary,
  listOrderRefunds,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS as TRANSITIONS,
} from "@/lib/services/orders";
import type { OrderStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function durationText(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="min-w-0 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { admin } = await getSession();
  if (!hasPermission(admin, "orders.view")) return <NoAccess />;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const detail = await getAdminOrder(orderId);
  if (!detail) notFound();

  const { order, items, history, notes, payments, attempts, customerId, customerName, customerEmail, customerPhone } =
    detail;

  const [summary, refunds, labels] = await Promise.all([
    getCustomerPaidSummary(customerId),
    listOrderRefunds(orderId),
    getAdminLabels([
      ...history.map((h) => h.changedById ?? ""),
      ...notes.map((n) => n.adminId ?? ""),
    ]),
  ]);

  const canUpdate = hasPermission(admin, "orders.update_status");
  const canRefund = hasPermission(admin, "refunds.process");
  const canVerify = hasPermission(admin, "payments.view");

  const allowedStatuses = (TRANSITIONS[order.status] ?? []).filter(
    (next): next is OrderStatus => next !== "refunded" && next !== "pending_payment",
  );

  const refunded = refunds
    .filter((r) => r.status !== "failed")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = Math.max(0, Number(order.total) - refunded);
  const canRefundOrder = canRefund && Boolean(order.paidAt) && remaining > 0 && order.status !== "refunded";

  const orderPayment = payments.find((p) => p.type === "order");

  const provider = getFulfillmentProvider();
  const processingStart = history
    .filter((h) => h.toStatus === "processing")
    .reduce<Date | null>((first, h) => (!first || new Date(h.createdAt) < first ? new Date(h.createdAt) : first), null);
  const processingEnd = order.completedAt ? new Date(order.completedAt) : order.status === "processing" ? new Date() : null;
  const latestAttempt = attempts.reduce<(typeof attempts)[number] | null>(
    (latest, a) => (!latest || new Date(a.createdAt) > new Date(latest.createdAt) ? a : latest),
    null,
  );
  const latestReference = attempts.find((a) => a.reference)?.reference ?? "";
  const lastError = latestAttempt && latestAttempt.outcome === "failed" ? latestAttempt.message : "";
  const playerFields = Object.entries((order.playerFields ?? {}) as Record<string, unknown>);
  const importedFields =
    (order.importedData as { fields?: Record<string, string> } | null)?.fields ?? null;

  const actorName = (type: string, id: string | null) =>
    type === "admin" ? labels.get(id ?? "") ?? "Admin" : type === "system" ? "System" : "Customer";
  const statusName = (status: string) => ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
  const outcomeText: Record<string, string> = {
    in_progress: "Automatic fulfillment started",
    completed: "Automatic fulfillment completed",
    failed: "Automatic fulfillment failed",
    manual_required: "Automatic fulfillment needs a manual step",
  };
  const timeline = [
    {
      at: new Date(order.createdAt),
      title: "Order placed",
      actor: "Customer",
      detail: `${formatBDT(order.total)} via ${orderPayment?.paymentMethod || order.paymentMethod || "—"}`,
      tone: "bg-gray-400",
    },
    ...history
      .filter((h) => !(h.toStatus === "pending_payment" && !h.fromStatus))
      .map((h) => ({
        at: new Date(h.createdAt),
        title: h.fromStatus
          ? `${statusName(h.fromStatus)} → ${statusName(h.toStatus)}`
          : `Set to ${statusName(h.toStatus)}`,
        actor: actorName(h.changedByType, h.changedById),
        detail: h.note || undefined,
        tone: h.toStatus === "failed" ? "bg-red-500" : h.toStatus === "completed" ? "bg-emerald-500" : "bg-accent-orange",
      })),
    ...attempts.map((a) => ({
      at: new Date(a.createdAt),
      title: outcomeText[a.outcome] ?? `Automatic fulfillment ${a.outcome}`,
      actor: a.provider ? `Provider (${a.provider})` : "System",
      detail: [a.message, a.reference ? `ref ${a.reference}` : ""].filter(Boolean).join(" · ") || undefined,
      tone: a.outcome === "failed" ? "bg-red-500" : "bg-blue-500",
    })),
    ...refunds.map((r) => ({
      at: new Date(r.createdAt),
      title: `Refund ${formatBDT(r.amount)} (${r.method}) · ${r.status}`,
      actor: r.processedByAdminId ? "Admin" : "System",
      detail: r.reason || undefined,
      tone: r.status === "failed" ? "bg-red-500" : "bg-amber-500",
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Order workspace"
        back={{ href: "/admin/orders", label: "Orders" }}
        title={
          <span className="inline-flex items-center gap-2">
            Order #{order.orderNumber}
            <CopyButton value={String(order.orderNumber)} compact label="Copy order number" />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono">{order.publicId}</span>
            <CopyButton value={order.publicId} compact label="Copy public order ID" />
            <span className="text-gray-300">·</span>
            Placed {dateTime(order.createdAt)}
          </span>
        }
        actions={<StatusBadge status={order.status} className="px-3 py-1.5" />}
      />

      <Card title="Order overview" icon={ShoppingBag} padded={false}>
        <dl className="px-5 py-1">
          <Row label="Customer">
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/admin/customers/${customerId}`} className="font-semibold text-accent-orange hover:underline">
                {customerName || "Customer"}
              </Link>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />{customerEmail}</span>
              {customerPhone ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />{customerPhone}</span>
                </>
              ) : null}
            </span>
          </Row>
          <Row label="Total spent">
            <span className="font-bold">
              {formatBDT(summary.total)} · {summary.count} {summary.count === 1 ? "order" : "orders"}
            </span>{" "}
            <span className="text-gray-500">(this customer, all paid orders)</span>
          </Row>
          <Row label="Total">
            <span className="font-bold">{formatBDT(order.total)}</span>{" "}
            <span className="text-gray-500">
              via {orderPayment?.paymentMethod || order.paymentMethod || "—"}
              {Number(order.walletAmount) > 0 && Number(order.gatewayAmount) > 0
                ? ` · wallet ${formatBDT(order.walletAmount)} + gateway ${formatBDT(order.gatewayAmount)}`
                : ""}
            </span>
          </Row>
          <Row label="Transaction">
            {orderPayment?.transactionId ? (
              <span className="inline-flex items-center gap-2 font-mono text-xs">
                {orderPayment.transactionId}
                <CopyButton value={orderPayment.transactionId} />
              </span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Created">{dateTime(order.createdAt)}</Row>
          <Row label="Paid">{dateTime(order.paidAt)}</Row>
          <Row label="Completed">{dateTime(order.completedAt)}</Row>
        </dl>
        {order.customerNote ? (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer note</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{order.customerNote}</p>
          </div>
        ) : null}
      </Card>

      <Card title="Products" padded={false}>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                {item.image ? (
                  <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg border border-dashed border-gray-300 bg-gray-50" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {item.productName} × {item.quantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    SKU: {item.sku || "—"} · {formatBDT(item.unitPrice)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatBDT(item.lineTotal)}</p>
            </div>
          ))}
        </div>
        {playerFields.length > 0 ? (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom fields</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {playerFields.map(([key, value]) => (
                <li key={key} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{key.replace(/_/g, " ")}</p>
                    <p className="truncate font-mono text-sm text-gray-900">{String(value ?? "") || "—"}</p>
                  </div>
                  {value ? <CopyButton value={String(value)} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {canUpdate ? (
        <Card title="Update order" description="Change the status, add an optional note, and set the delivery message.">
          <div className="space-y-6">
            {allowedStatuses.length > 0 ? (
              <OrderStatusPanel orderId={order.id} currentStatus={order.status} allowed={allowedStatuses} />
            ) : (
              <p className="text-sm text-gray-500">No status changes are available for this order.</p>
            )}

            <div className="border-t border-gray-100 pt-5">
              <ActionForm action={saveDeliveryMessageAction} submitLabel="Save message" buttonClassName="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Delivery message / codes (customer sees this when completed)</span>
                  <textarea
                    name="deliveryMessage"
                    rows={3}
                    maxLength={2000}
                    defaultValue={order.deliveryMessage}
                    placeholder="e.g. 520 Diamonds sent to 12345678"
                    className={textareaCls}
                  />
                </label>
              </ActionForm>
            </div>
          </div>
        </Card>
      ) : null}

      {canRefundOrder ? (
        <div id="refund">
          <Card title="Refund" description={`Refundable: ${formatBDT(remaining)} of ${formatBDT(order.total)}.`}>
            <ActionForm action={refundAction} submitLabel="Issue refund" confirm="Issue this refund? This cannot be undone." buttonClassName="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Amount (BDT)</span>
                  <input name="amount" type="number" step="0.01" min="0.01" max={remaining} defaultValue={remaining.toFixed(2)} required className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Method</span>
                  <select name="method" defaultValue="wallet" className={selectCls}>
                    <option value="wallet">Customer wallet</option>
                    <option value="gateway">Gateway refund</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">External reference</span>
                  <input name="externalReference" maxLength={200} placeholder="Optional" className={inputCls} />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">Reason</span>
                <textarea name="reason" rows={2} maxLength={500} required className={textareaCls} />
              </label>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="recordOnly" value="1" className="h-4 w-4 accent-[#f96000]" />
                Record only (the money was already returned outside the system)
              </label>
            </ActionForm>
          </Card>
        </div>
      ) : null}

      {refunds.length > 0 ? (
        <Card title="Refunds" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-gray-50"><tr>
                <th className={thCls}>Date</th><th className={thCls}>Amount</th><th className={thCls}>Method</th><th className={thCls}>Status</th><th className={thCls}>Reason</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td className={tdCls}>{dateTime(r.createdAt)}</td>
                    <td className={`${tdCls} font-bold`}>{formatBDT(r.amount)}</td>
                    <td className={tdCls}>{r.method}</td>
                    <td className={tdCls}>
                      {r.status}
                      {canRefund && r.status === "pending" && r.method === "gateway" ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-gray-500">Stuck pending. Confirm the outcome from the gateway.</p>
                          <ActionForm action={resolvePendingRefundAction} submitLabel="Mark completed" className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="refundId" value={r.id} />
                            <input type="hidden" name="outcome" value="completed" />
                            <input name="gatewayReference" required maxLength={200} placeholder="Gateway reference" className={inputCls} />
                          </ActionForm>
                          <ActionForm action={resolvePendingRefundAction} submitLabel="Mark failed" confirm="Mark this refund as failed? The amount becomes refundable again." className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="refundId" value={r.id} />
                            <input type="hidden" name="outcome" value="failed" />
                          </ActionForm>
                        </div>
                      ) : null}
                    </td>
                    <td className={tdCls}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card title="Payments" padded={false}>
        {payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-gray-50"><tr>
                <th className={thCls}>ID</th><th className={thCls}>Amount</th><th className={thCls}>Status</th><th className={thCls}>Method</th><th className={thCls}>TrxID</th><th className={thCls}>Sender</th><th className={thCls}>Date</th><th className={thCls}>Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className={`${tdCls} font-mono text-xs`}>{p.id}</td>
                    <td className={`${tdCls} font-bold`}>{formatBDT(p.amount)}</td>
                    <td className={tdCls}><StatusBadge status={p.status} /></td>
                    <td className={tdCls}>{p.paymentMethod || p.gateway}</td>
                    <td className={`${tdCls} font-mono text-xs`}>{p.transactionId || "—"}</td>
                    <td className={`${tdCls} font-mono text-xs`}>{p.senderNumber || "—"}</td>
                    <td className={tdCls}>{dateTime(p.createdAt)}</td>
                    <td className={tdCls}>
                      {canVerify && p.invoiceId && p.status !== "completed" ? (
                        <ActionForm action={verifyPaymentAction} submitLabel="Verify" buttonClassName="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-accent-orange hover:text-accent-orange">
                          <input type="hidden" name="invoiceId" value={p.invoiceId} />
                        </ActionForm>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Fulfillment" description="Method, timing and the latest provider result.">
        <dl className="grid gap-x-8 px-5 py-1 md:grid-cols-2">
          <div>
            <Row label="Method">{provider.automatic ? provider.label : "Manual fulfillment"}</Row>
            <Row label="Status"><StatusBadge status={order.fulfillmentStatus} /></Row>
            <Row label="Processing time">
              {processingStart && processingEnd
                ? `${durationText(processingEnd.getTime() - processingStart.getTime())}${order.completedAt ? "" : " so far"}`
                : "—"}
            </Row>
          </div>
          <div>
            <Row label="Supplier reference">
              {latestReference ? <span className="inline-flex items-center gap-2 font-mono text-xs">{latestReference}<CopyButton value={latestReference} /></span> : "—"}
            </Row>
            <Row label="Last error">
              {lastError ? <span className="text-red-700">{lastError}</span> : "—"}
            </Row>
          </div>
        </dl>
      </Card>

      <Card title="Order timeline" description="How the order was placed, paid, fulfilled and changed." padded={false}>
        <ol className="divide-y divide-gray-100">
          {timeline.map((event, index) => (
            <li key={index} className="flex gap-3 px-5 py-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {dateTime(event.at)} · {event.actor}
                </p>
                {event.detail ? <p className="mt-1 break-words text-sm text-gray-700">{event.detail}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Order notes" description="Private notes are for staff only. Customer notes are shown to the customer.">
        <ActionForm
          action={addOrderNoteAction}
          submitLabel="Add note"
          className="space-y-2"
          buttonClassName="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <textarea name="content" rows={3} maxLength={2000} required placeholder="Add a note" className={textareaCls} />
          <select name="customerVisible" defaultValue="" className={`${selectCls} sm:w-56`}>
            <option value="">Private note</option>
            <option value="1">Note to customer</option>
          </select>
        </ActionForm>

        <ul className="mt-5 space-y-3">
          {notes.length === 0 ? <li className="text-sm text-gray-500">No notes yet.</li> : null}
          {[...notes]
            .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
            .map((note) => (
              <li
                key={note.id}
                className={`rounded-xl border px-4 py-3 ${note.customerVisible ? "border-sky-200 bg-sky-50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-800">{note.adminId ? labels.get(note.adminId) ?? "Admin" : "System"}</span>
                  <span>·</span>
                  <span>{dateTime(note.createdAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${note.customerVisible ? "bg-sky-100 text-sky-800" : "bg-gray-200 text-gray-700"}`}>
                    {note.customerVisible ? "Note to customer" : "Private note"}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
                <div className="mt-2">
                  <ActionForm
                    action={deleteOrderNoteAction}
                    submitLabel="Delete"
                    confirm="Delete this note?"
                    buttonClassName="text-xs font-semibold text-red-600 underline-offset-2 hover:underline"
                  >
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="noteId" value={note.id} />
                  </ActionForm>
                </div>
              </li>
            ))}
        </ul>
      </Card>

      {importedFields || items.some((i) => Object.keys(i.importedData ?? {}).length > 0) ? (
        <Card title="Imported WooCommerce data" description="Original fields from the WooCommerce export, kept for reference." padded={false}>
          <div className="grid gap-x-8 px-5 py-2 md:grid-cols-2">
            {Object.entries(importedFields ?? {}).map(([key, value]) => (
              <div key={`order-${key}`} className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
                <span className="text-gray-500">{key}</span>
                <span className="break-all text-right text-gray-800">{value || "—"}</span>
              </div>
            ))}
            {items.flatMap((item) =>
              Object.entries(item.importedData ?? {}).map(([key, value]) => (
                <div key={`item-${item.id}-${key}`} className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
                  <span className="text-gray-500">{item.productName}: {key}</span>
                  <span className="break-all text-right text-gray-800">{value || "—"}</span>
                </div>
              )),
            )}
          </div>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-500">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Every status change, note and refund is written to the audit log.
      </div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-accent-orange">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
    </div>
  );
}
