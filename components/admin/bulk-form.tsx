"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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

  return (
    <form action={formAction} className="space-y-3">
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/90 bg-white/95 p-2 shadow-sm backdrop-blur">
        <select
          name="action"
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          required
          className={`${selectCls} h-10 w-auto min-w-48`}
        >
          <option value="" disabled>
            Bulk action…
          </option>
          {actions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {choice.startsWith("category_") && (
          <select name="categoryId" defaultValue="" required className={`${selectCls} h-10 w-auto min-w-48`}>
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
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            const data = form ? new FormData(form) : null;
            const selected = data ? data.getAll("ids").length : 0;
            if (selected === 0) {
              event.preventDefault();
              window.alert("Select at least one row first.");
              return;
            }
            const chosen = actions.find((item) => item.value === data?.get("action"));
            if (chosen?.danger && !window.confirm(`${chosen.label} for ${selected} selected item(s)?`)) {
              event.preventDefault();
            }
          }}
          className={`${btnSecondary} h-10`}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Apply to selected
        </button>
      </div>

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
      }}
    />
  );
}
