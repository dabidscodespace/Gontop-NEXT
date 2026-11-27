"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { Eye, ReceiptText, X } from "lucide-react";

import { bulkUpdateOrderStatusAction } from "@/app/(admin)/admin/actions";
import { StatusBadge } from "@/components/status-badge";
import type { OrderFulfillmentStatus, OrderPaymentStatus } from "@/db/schema";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: number;
  publicId: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  total: string;
  ago: string;
  itemCount: number;
  productName: string | null;
  productImage: string | null;
  customerName: string | null;
  customerEmail: string;
  transactionId: string | null;
  senderNumber: string | null;
  paymentMethod: string;
};

// Every order status is offered; the server enforces the transition rules per order.
const BULK_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
const DANGEROUS = new Set<OrderStatus>(["failed", "cancelled"]);

const thCls = "whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500";
const tdCls = "px-4 py-3 align-middle text-sm text-gray-700";

export function OrdersTable({
  rows,
  canUpdate,
  baseQuery,
  activeId,
}: {
  rows: OrderRow[];
  canUpdate: boolean;
  baseQuery: string;
  activeId: number | null;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [notice, setNotice] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((row) => row.id));

  const viewHref = (id: number) => `/admin/orders?${[baseQuery, `view=${id}`].filter(Boolean).join("&")}`;

  // Clicking anywhere on a row opens its quick view, except on controls inside the row.
  const openRow = (event: MouseEvent, id: number) => {
    if ((event.target as HTMLElement).closest("a,button,input,label,select,textarea")) return;
    router.push(viewHref(id));
  };

  const applyBulk = () => {
    if (!bulkStatus || selected.length === 0) return;
    if (DANGEROUS.has(bulkStatus) && !window.confirm(`Move ${selected.length} order(s) to ${ORDER_STATUS_LABELS[bulkStatus]}?`)) {
      return;
    }
    const fd = new FormData();
    fd.set("status", bulkStatus);
    selected.forEach((id) => fd.append("orderIds", String(id)));
    startTransition(async () => {
      const result = await bulkUpdateOrderStatusAction(EMPTY_FORM_STATE, fd);
      setNotice(result);
      if (result.ok) {
        setSelected([]);
        setBulkStatus("");
      }
    });
  };

  const checkbox = (row: OrderRow) => (
    <input
      type="checkbox"
      aria-label={`Select order ${row.publicId}`}
      checked={selected.includes(row.id)}
      onChange={() => toggle(row.id)}
      className="h-4 w-4 cursor-pointer accent-[#f96000]"
    />
  );

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          <span>{notice.ok ? notice.message : notice.error}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {canUpdate && selected.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-gray-900 shadow-sm">
          <p className="px-1 text-sm font-semibold text-gray-900">{selected.length} selected</p>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              aria-label="Bulk status"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as OrderStatus | "")}
              className="h-9 min-w-[160px] flex-1 rounded-lg border border-orange-200 bg-white px-2 text-sm text-gray-900 focus:outline-none sm:flex-none"
            >
              <option value="" className="text-gray-900">Change status to…</option>
              {BULK_STATUSES.map((status) => (
                <option key={status} value={status} className="text-gray-900">
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkStatus || pending}
              onClick={applyBulk}
              className="h-9 rounded-lg bg-accent-orange px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {pending ? "Applying…" : "Apply"}
            </button>
          </div>
          <button type="button" onClick={() => setSelected([])} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
            Clear
          </button>
        </div>
      )}

      {rows.length === 0 ? null : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px]">
              <thead className="border-b border-gray-100 bg-gray-50/70">
                <tr>
                  {canUpdate && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all orders on this page"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 cursor-pointer accent-[#f96000]"
                      />
                    </th>
                  )}
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Item</th>
                  <th className={thCls}>TrxID</th>
                  <th className={thCls}>Sender</th>
                  <th className={thCls}>Pay</th>
                  <th className={thCls}>Amount</th>
                  <th className={thCls}>Status</th>
                  <th className={cn(thCls, "text-right")}>Quick view</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={(event) => openRow(event, row.id)}
                    className={cn(
                      "cursor-pointer transition hover:bg-orange-50/40",
                      (activeId === row.id || selected.includes(row.id)) && "bg-orange-50/70",
                    )}
                  >
                    {canUpdate && <td className="px-4 py-3">{checkbox(row)}</td>}
                    <td className={tdCls}>
                      <Link href={`/admin/orders/${row.id}`} className="font-mono text-xs font-bold text-gray-900 hover:text-accent-orange">
                        #{row.orderNumber}
                      </Link>
                      <p className="max-w-[160px] truncate text-xs text-gray-600">{row.customerName || row.customerEmail}</p>
                      <p className="text-[11px] text-gray-400">{row.ago}</p>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <ProductThumb src={row.productImage} />
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate text-sm font-semibold text-gray-800">{row.productName ?? "—"}</p>
                          <p className="text-[11px] text-gray-400">
                            {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={cn(tdCls, "font-mono text-xs text-gray-700")}>{row.transactionId || "—"}</td>
                    <td className={cn(tdCls, "font-mono text-xs text-gray-500")}>{row.senderNumber || "—"}</td>
                    <td className={tdCls}>{row.paymentMethod}</td>
                    <td className={cn(tdCls, "whitespace-nowrap font-bold text-gray-900")}>{row.total}</td>
                    <td className={tdCls}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={cn(tdCls, "text-right")}>
                      <QuickViewLink href={viewHref(row.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm",
                  (activeId === row.id || selected.includes(row.id)) && "border-accent-orange/60 bg-orange-50/50",
                )}
              >
                <div className="flex items-start gap-3">
                  {canUpdate && <div className="pt-1">{checkbox(row)}</div>}
                  <ProductThumb src={row.productImage} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/orders/${row.id}`} className="font-mono text-xs font-bold text-gray-900">
                        #{row.orderNumber}
                      </Link>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="truncate text-sm font-semibold text-gray-800">{row.productName ?? "—"}</p>
                    <p className="truncate text-xs text-gray-500">
                      {row.customerName || row.customerEmail} · {row.ago}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
                  <div>
                    <p className="text-gray-400">Amount</p>
                    <p className="text-sm font-bold text-gray-900">{row.total}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-400">TrxID</p>
                    <p className="truncate font-mono text-gray-700">{row.transactionId || "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <QuickViewLink href={viewHref(row.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <ReceiptText className="h-8 w-8 text-gray-300" />
          <p className="font-semibold text-gray-700">No orders match</p>
          <p className="text-sm text-gray-400">Try another status or search term.</p>
        </div>
      )}
    </div>
  );
}

function ProductThumb({ src }: { src: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <ReceiptText className="h-4 w-4 text-gray-400" />
      )}
    </div>
  );
}

function QuickViewLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-accent-orange hover:text-accent-orange"
    >
      <Eye className="h-3.5 w-3.5" /> Quick view
    </Link>
  );
}
