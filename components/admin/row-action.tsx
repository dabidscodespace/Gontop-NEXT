"use client";

import { startTransition, useActionState } from "react";
import { Archive, Copy, Loader2, type LucideIcon } from "lucide-react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";

type RowActionFn = (state: FormState, formData: FormData) => Promise<FormState>;

// Icons are passed by name: lucide components cannot cross the server/client boundary.
const ICONS: Record<RowActionIcon, LucideIcon> = { copy: Copy, archive: Archive };
type RowActionIcon = "copy" | "archive";

/**
 * A per-row server action button. It lives outside any <form> so it can sit
 * inside the bulk-selection table without nesting forms.
 */
export function RowAction({
  action,
  fields,
  label,
  icon,
  className,
  confirm,
}: {
  action: RowActionFn;
  fields: Record<string, string>;
  label: string;
  icon: RowActionIcon;
  className?: string;
  confirm?: string;
}) {
  const Icon = ICONS[icon];
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  const run = () => {
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    startTransition(() => formAction(data));
  };

  return (
    <span className="inline-flex max-w-56 flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={pending} className={className}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {label}
      </button>
      {state.message && (
        <span role="status" className={`text-right text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </span>
  );
}
