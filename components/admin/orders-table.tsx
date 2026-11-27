"use client";

import { Eye, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type MouseEvent } from "react";

import { bulkUpdateOrderStatusAction } from "@/app/(admin)/admin/actions";
import { CopyButton } from "@/components/admin/copy-button";
import { StatusBadge } from "@/components/status-badge";
import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@/db/schema";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import {
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
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

const DANGEROUS = new Set<OrderStatus>(["failed", "cancelled"]);
const thCls = "whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-gray-500";
const tdCls = "px-4 py-3.5 align-middle text-sm text-gray-700";

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
  const selectedRows = rows.filter((row) => selected.includes(row.id));
  const bulkOptions = useMemo(() => {
    const counts = new Map<OrderStatus, number>();
    selectedRows.forEach((row) => {
      ORDER_TRANSITIONS[row.status].forEach((target) => counts.set(target, (counts.get(target) ?? 0) + 1));
    });
    return [...counts.entries()]
      .filter(([status]) => status !== "refunded")
      .sort(([a], [b]) => ORDER_STATUS_LABELS[a].localeCompare(ORDER_STATUS_LABELS[b]));
  }, [selectedRows]);

  const toggle = (id: number) => {
    setBulkStatus("");
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };
  const toggleAll = () => {
    setBulkStatus("");
    setSelected(allSelected ? [] : rows.map((row) => row.id));
  };
  const clearSelection = () => {
    setSelected([]);
    setBulkStatus("");
  };

  const viewHref = (id: number) => `/admin/orders?${[baseQuery, `view=${id}`].filter(Boolean).join("&")}`;

  const openRow = (event: MouseEvent, id: number) => {
    if ((event.target as HTMLElement).closest("a,button,input,label,select,textarea")) return;
    router.push(viewHref(id));
  };

  const applyBulk = () => {
    if (!bulkStatus || selected.length === 0) return;
    const eligible = selectedRows.filter((row) => ORDER_TRANSITIONS[row.status].includes(bulkStatus)).length;
    if (eligible === 0) return;
    if (
      DANGEROUS.has(bulkStatus) &&
      !window.confirm(`Move ${eligible} eligible order${eligible === 1 ? "" : "s"} to ${ORDER_STATUS_LABELS[bulkStatus]}?`)
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("status", bulkStatus);
    selected.forEach((id) => formData.append("orderIds", String(id)));
    startTransition(async () => {
      const result = await bulkUpdateOrderStatusAction(EMPTY_FORM_STATE, formData);
      setNotice(result);
      if (result.ok) {
        clearSelection();
        router.refresh();
      }
    });
  };

  const checkbox = (row: OrderRow) => (
    <input
      type="checkbox"
      aria-label={`Select order ${row.orderNumber}`}
      checked={selected.includes(row.id)}
      onChange={() => toggle(row.id)}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#f96000] focus-visible:ring-2 focus-visible:ring-orange-200"
    />
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-400 shadow-sm">
          <ReceiptText className="h-5 w-5" />
        </span>
        <p className="mt-2 text-sm font-extrabold text-gray-700">No orders match</p>
        <p className="text-xs text-gray-400">Try another status or a broader search term.</p>
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "m-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold",
            notice.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          <span>{notice.ok ? notice.message : notice.error}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 opacity-60 transition hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {canUpdate && selected.length > 0 && (
        <div className="sticky top-[72px] z-20 m-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/95 p-2.5 text-gray-900 shadow-lg shadow-orange-950/5 backdrop-blur sm:m-4">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-accent-orange px-1.5 text-[10px] font-black text-white">
              {selected.length}
            </span>
            <p className="text-xs font-extrabold text-gray-900">selected</p>
          </div>
          <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-2">
            <select
              aria-label="Bulk status"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as OrderStatus | "")}
              className="h-9 min-w-[190px] flex-1 rounded-lg border border-orange-200 bg-white px-2.5 text-xs font-bold text-gray-800 outline-none focus:border-accent-orange focus:ring-2 focus:ring-orange-100 sm:flex-none"
            >
              <option value="">Change eligible orders to…</option>
              {bulkOptions.map(([status, count]) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]} ({count} eligible)
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkStatus || pending}
              onClick={applyBulk}
              className="h-9 rounded-lg bg-gray-950 px-4 text-xs font-extrabold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Applying…" : "Apply change"}
            </button>
          </div>
          <button type="button" onClick={clearSelection} className="px-2 text-xs font-bold text-gray-500 transition hover:text-gray-950">
            Clear
          </button>
        </div>
      )}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-gray-100 bg-white">
            <tr>
              {canUpdate && (
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    aria-label="Select all orders on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#f96000]"
                  />
                </th>
              )}
              <th className={thCls}>Order</th>
              <th className={thCls}>Customer</th>
              <th className={thCls}>Item</th>
              <th className={thCls}>Payment</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Progress</th>
              <th className={cn(thCls, "text-right")}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={(event) => openRow(event, row.id)}
                className={cn(
                  "cursor-pointer hover:bg-orange-50/35",
                  (activeId === row.id || selected.includes(row.id)) && "bg-orange-50/60",
                )}
              >
                {canUpdate && <td className="px-4 py-3.5">{checkbox(row)}</td>}
                <td className={tdCls}>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/orders/${row.id}`} className="font-mono text-xs font-black text-gray-950 hover:text-accent-orange">
                      #{row.orderNumber}
                    </Link>
                    <CopyButton value={String(row.orderNumber)} compact label="Copy order number" className="h-6 w-6 border-0 bg-transparent shadow-none" />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-gray-400">{row.ago}</p>
                </td>
                <td className={tdCls}>
                  <p className="max-w-[180px] truncate text-sm font-bold text-gray-800">{row.customerName || "Unnamed customer"}</p>
                  <p className="max-w-[190px] truncate text-[11px] text-gray-400">{row.customerEmail}</p>
                </td>
                <td className={tdCls}>
                  <div className="flex items-center gap-3">
                    <ProductThumb src={row.productImage} />
                    <div className="min-w-0">
                      <p className="max-w-[190px] truncate text-sm font-bold text-gray-800">{row.productName ?? "Removed product"}</p>
                      <p className="text-[11px] text-gray-400">{row.itemCount} item{row.itemCount === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                </td>
                <td className={tdCls}>
                  <p className="text-xs font-bold capitalize text-gray-700">{row.paymentMethod.replace(/_/g, " ")}</p>
                  <p className="max-w-[150px] truncate font-mono text-[10px] text-gray-400" title={row.transactionId ?? undefined}>
                    {row.transactionId || row.senderNumber || "No transaction ID"}
                  </p>
                </td>
                <td className={cn(tdCls, "whitespace-nowrap font-black text-gray-950")}>{row.total}</td>
                <td className={tdCls}>
                  <StatusBadge status={row.status} />
                  <p className="mt-1.5 text-[10px] font-semibold text-gray-400">
                    {PAYMENT_STATUS_LABELS[row.paymentStatus]} · {FULFILLMENT_STATUS_LABELS[row.fulfillmentStatus]}
                  </p>
                </td>
                <td className={cn(tdCls, "text-right")}><QuickViewLink href={viewHref(row.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-gray-100 md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "p-4 transition",
              (activeId === row.id || selected.includes(row.id)) && "bg-orange-50/55",
            )}
          >
            <div className="flex items-start gap-3">
              {canUpdate && <div className="pt-1">{checkbox(row)}</div>}
              <ProductThumb src={row.productImage} size="large" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/orders/${row.id}`} className="font-mono text-xs font-black text-gray-950">
                      #{row.orderNumber}
                    </Link>
                    <CopyButton value={String(row.orderNumber)} compact label="Copy order number" className="h-6 w-6 border-0 bg-transparent shadow-none" />
                  </div>
                  <StatusBadge status={row.status} className="px-2 py-0.5 text-[10px]" />
                </div>
                <p className="mt-1 truncate text-sm font-bold text-gray-800">{row.productName ?? "Removed product"}</p>
                <p className="truncate text-xs text-gray-500">{row.customerName || row.customerEmail}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Amount</p>
                <p className="mt-0.5 font-black text-gray-950">{row.total}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment</p>
                <p className="mt-0.5 truncate font-bold capitalize text-gray-700">{row.paymentMethod.replace(/_/g, " ")}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Placed</p>
                <p className="mt-0.5 truncate font-bold text-gray-700">{row.ago}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="truncate text-[10px] font-semibold text-gray-400">
                {PAYMENT_STATUS_LABELS[row.paymentStatus]} · {FULFILLMENT_STATUS_LABELS[row.fulfillmentStatus]}
              </p>
              <QuickViewLink href={viewHref(row.id)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductThumb({ src, size = "default" }: { src: string | null; size?: "default" | "large" }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50", size === "large" ? "h-12 w-12" : "h-10 w-10")}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <ReceiptText className="h-4 w-4 text-gray-400" />}
    </div>
  );
}

function QuickViewLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white"
    >
      <Eye className="h-3.5 w-3.5" /> Quick view
    </Link>
  );
}
