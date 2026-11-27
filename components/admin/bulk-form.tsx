"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import { btnSecondary, selectCls } from "@/components/admin/ui";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wraps a table of checkboxes named `ids` with a bulk action bar.
 * Actions with `danger: true` ask for confirmation before submitting.
 */
export function BulkForm({
  action,
  actions,
  hidden,
  categories,
  children,
}: {
  action: Action;
  actions: Array<{ value: string; label: string; danger?: boolean }>;
  hidden?: Record<string, string>;
  /** Products-category choices; shown only when a category action is selected. */
  categories?: Array<{ id: number; name: string }>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [choice, setChoice] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const syncSelection = () => {
    const rows = [...(formRef.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [])];
    const allIds = new Set(rows.map((box) => box.value));
    const selectedIds = new Set(rows.filter((box) => box.checked).map((box) => box.value));
    formRef.current?.querySelectorAll<HTMLInputElement>('input[aria-label="Select all rows"]').forEach((master) => {
      master.checked = allIds.size > 0 && selectedIds.size === allIds.size;
      master.indeterminate = selectedIds.size > 0 && selectedIds.size < allIds.size;
    });
    setSelectedCount(selectedIds.size);
  };

  const clearSelection = () => {
    formRef.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
      box.checked = false;
    });
    formRef.current?.querySelectorAll<HTMLInputElement>('input[aria-label="Select all rows"]').forEach((master) => {
      master.checked = false;
      master.indeterminate = false;
    });
    setSelectedCount(0);
  };

  return (
    <form ref={formRef} action={formAction} onInput={syncSelection} className="space-y-3">
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {selectedCount > 0 && (
        <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50/95 p-2.5 shadow-lg shadow-orange-950/5 backdrop-blur">
          <span className="inline-flex h-8 items-center gap-2 rounded-xl bg-accent-orange px-3 text-xs font-black text-white">
            {selectedCount} selected
          </span>
          <select
            name="action"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            required
            className={`${selectCls} h-10 min-w-48 flex-1 sm:flex-none`}
          >
            <option value="" disabled>
              Choose action…
            </option>
            {actions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {choice.startsWith("category_") && (
            <select name="categoryId" defaultValue="" required className={`${selectCls} h-10 min-w-48 flex-1 sm:flex-none`}>
              <option value="" disabled>
                Choose category…
              </option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={pending || !choice}
            onClick={(event) => {
              const form = event.currentTarget.form;
              const data = form ? new FormData(form) : null;
              const selected = data ? new Set(data.getAll("ids").map(String)).size : 0;
              const chosen = actions.find((item) => item.value === data?.get("action"));
              if (chosen?.danger && !window.confirm(`${chosen.label} for ${selected} selected item(s)?`)) {
                event.preventDefault();
              }
            }}
            className={`${btnSecondary} h-10 border-orange-200 bg-white`}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-gray-500 transition hover:bg-white hover:text-gray-950"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {children}

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Header checkbox that toggles every `ids` checkbox in its form. */
export function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all rows"
      className="h-4 w-4 rounded border-gray-300 text-accent-orange focus:ring-accent-orange"
      onChange={(event) => {
        const form = event.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
          box.checked = event.currentTarget.checked;
        });
        form?.dispatchEvent(new Event("input", { bubbles: true }));
      }}
    />
  );
}
