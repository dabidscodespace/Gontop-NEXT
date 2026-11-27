"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

import { inputCls, selectCls } from "@/components/admin/ui";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const ACTIONS = [
  ["publish", "Publish"],
  ["draft", "Move to draft"],
  ["archive", "Archive"],
  ["restore", "Restore to draft"],
  ["enable", "Enable sales"],
  ["disable", "Disable sales"],
  ["mark_available", "Mark available"],
  ["mark_unavailable", "Mark unavailable"],
  ["price_set", "Set price"],
  ["price_change", "Change price by %"],
  ["delete", "Delete permanently"],
] as const;

/** Package list selection and batch operations. Children must not contain nested forms. */
export function VariationBulkForm({
  action,
  productId,
  total,
  children,
}: {
  action: Action;
  productId: number;
  total: number;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [selectedCount, setSelectedCount] = useState(0);
  const [choice, setChoice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const boxes = () => formRef.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [];
  const sync = () => setSelectedCount([...boxes()].filter((box) => box.checked).length);
  const setAll = (checked: boolean) => {
    boxes().forEach((box) => { box.checked = checked; });
    setSelectedCount(checked ? total : 0);
  };

  const priceAction = choice === "price_set" || choice === "price_change";

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={sync}
      className="min-w-0"
      onSubmit={(event) => {
        if (selectedCount === 0) {
          event.preventDefault();
          return;
        }
        if (choice === "delete" && !window.confirm(`Delete ${selectedCount} selected package(s)? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
        <p className="text-[11px] font-bold text-gray-500">
          {selectedCount > 0 ? `${selectedCount} of ${total} selected` : `${total} package${total === 1 ? "" : "s"}`}
        </p>
        <button type="button" onClick={() => setAll(selectedCount !== total)} className="text-[11px] font-extrabold text-accent-orange hover:underline">
          {selectedCount === total && total > 0 ? "Clear selection" : "Select all"}
        </button>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-[72px] z-10 space-y-2 border-b border-orange-200 bg-orange-50/95 p-3 shadow-md shadow-orange-950/5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-lg bg-accent-orange px-2.5 text-[11px] font-black text-white">{selectedCount} selected</span>
            <select name="action" required value={choice} onChange={(event) => setChoice(event.target.value)} className={`${selectCls} h-9 min-w-40 flex-1 py-0 text-xs`}>
              <option value="" disabled>Choose action…</option>
              {ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {choice === "price_change" && (
              <select name="direction" defaultValue="increase" className={`${selectCls} h-9 w-28 py-0 text-xs`}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            )}
            {priceAction && (
              <div className="relative w-28">
                <input name="amount" type="number" min="0" step="0.01" required placeholder={choice === "price_change" ? "Percent" : "Price"} className={`${inputCls} h-9 py-0 pr-7 text-xs`} />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{choice === "price_change" ? "%" : "৳"}</span>
              </div>
            )}
            <button type="submit" disabled={pending || !choice} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-xs font-bold text-white transition hover:bg-accent-orange disabled:opacity-50">
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{pending ? "Applying…" : "Apply"}
            </button>
            <button type="button" onClick={() => setAll(false)} aria-label="Clear package selection" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-950"><X className="h-4 w-4" /></button>
          </div>
          {state.error && <p className="flex gap-1 text-[11px] font-semibold text-red-600"><AlertCircle className="h-3 w-3 shrink-0" />{state.error}</p>}
          {state.message && <p className="flex gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3 shrink-0" />{state.message}</p>}
        </div>
      )}

      {children}

      {selectedCount === 0 && state.error && <p className="m-3 flex gap-1 rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-600"><AlertCircle className="h-3 w-3 shrink-0" />{state.error}</p>}
      {selectedCount === 0 && state.message && <p className="m-3 flex gap-1 rounded-lg bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3 shrink-0" />{state.message}</p>}
    </form>
  );
}
