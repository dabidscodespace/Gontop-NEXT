"use client";

import { useActionState, useRef, useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/app/(admin)/admin/actions";
import { EMPTY_FORM_STATE } from "@/lib/action-types";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@/db/schema";
import { btnPrimary, inputCls, selectCls } from "@/components/admin/ui";

// Every status an admin can set directly. Refunded is set only by the refund workflow.
const STATUSES: OrderStatus[] = ["pending_payment", "processing", "completed", "on_hold", "cancelled", "failed"];

const TONE: Record<string, string> = {
  processing: "bg-blue-600 hover:bg-blue-700",
  completed: "bg-emerald-600 hover:bg-emerald-700",
  failed: "bg-red-600 hover:bg-red-700",
  cancelled: "bg-gray-700 hover:bg-gray-800",
};

const NEEDS_CONFIRM = new Set<OrderStatus>(["failed", "cancelled"]);

export function OrderStatusPanel({
  orderId,
  currentStatus,
  allowed,
}: {
  orderId: number;
  currentStatus: OrderStatus;
  allowed: OrderStatus[];
}) {
  const [state, dispatch, pending] = useActionState(updateOrderStatusAction, EMPTY_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState<OrderStatus | "">("");
  // After a successful change, remount the form so the select and note clear.
  const [seenState, setSeenState] = useState(state);
  const [formKey, setFormKey] = useState(0);
  if (state !== seenState) {
    setSeenState(state);
    if (state.ok) {
      setChosen("");
      setFormKey((key) => key + 1);
    }
  }

  const canSet = (next: OrderStatus) => allowed.includes(next);
  const reason = (next: OrderStatus) =>
    next === currentStatus ? "Already this status" : `Not allowed from ${ORDER_STATUS_LABELS[currentStatus]}`;

  function quickSubmit(next: OrderStatus) {
    if (!formRef.current) return;
    if (NEEDS_CONFIRM.has(next) && !window.confirm(`Mark this order as ${ORDER_STATUS_LABELS[next]}?`)) {
      return;
    }
    const data = new FormData(formRef.current);
    data.set("status", next);
    startTransition(() => dispatch(data));
  }

  return (
    <form key={formKey} ref={formRef} action={dispatch} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-500">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((next) => {
            const enabled = canSet(next) && !pending;
            return (
              <button
                key={next}
                type="button"
                disabled={!enabled}
                title={canSet(next) ? undefined : reason(next)}
                onClick={() => quickSubmit(next)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  canSet(next) ? `text-white ${TONE[next] ?? "bg-gray-900 hover:bg-black"}` : "border border-gray-200 bg-gray-100 text-gray-500"
                }`}
              >
                {ORDER_STATUS_LABELS[next]}
                {next === currentStatus ? " (current)" : ""}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Greyed-out statuses are not allowed from {ORDER_STATUS_LABELS[currentStatus]}. Refunds are set in the Refund section.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Change status</span>
          <select
            name="status"
            value={chosen}
            onChange={(event) => setChosen(event.target.value as OrderStatus | "")}
            className={selectCls}
          >
            <option value="">— select —</option>
            {STATUSES.map((next) => (
              <option key={next} value={next} disabled={!canSet(next)}>
                {ORDER_STATUS_LABELS[next]}
                {next === currentStatus ? " (current)" : canSet(next) ? "" : " (not allowed)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">Note with this change (optional)</span>
          <input name="note" maxLength={500} placeholder="e.g. Please send the OTP on WhatsApp" className={inputCls} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="customerVisible" value="1" defaultChecked className="h-4 w-4 accent-[#f96000]" />
          Note visible to customer
        </label>
        <button type="submit" disabled={pending || !chosen || !canSet(chosen)} className={btnPrimary}>
          {pending ? "Saving…" : "Update status"}
        </button>
      </div>

      {state.message || state.error ? (
        <p className={`text-sm font-medium ${state.error ? "text-red-600" : "text-emerald-700"}`}>
          {state.error ?? state.message}
        </p>
      ) : null}
    </form>
  );
}
