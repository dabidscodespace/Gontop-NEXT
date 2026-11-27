"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import type { LifecycleOp } from "@/lib/catalog-rules";
import { cn } from "@/lib/utils";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const LABELS: Record<LifecycleOp, string> = {
  publish: "Publish",
  unpublish: "Move to draft",
  archive: "Archive",
  restore: "Restore to draft",
  enable: "Enable sales",
  disable: "Disable sales",
  mark_available: "Mark available",
  mark_unavailable: "Mark unavailable",
};

const CONFIRM: Partial<Record<LifecycleOp, string>> = {
  unpublish: "Move this item back to draft? It will no longer be listed for customers.",
  archive: "Archive this item? It will be removed from active catalogue work.",
  disable: "Disable sales for this item? Customers will not be able to buy it.",
  mark_unavailable: "Mark this item unavailable for sale?",
};

/** A compact lifecycle control that keeps secondary state transitions out of the main form. */
export function LifecycleActions({
  action,
  id,
  ops,
  compact = false,
  className,
}: {
  action: Action;
  id: number;
  ops: LifecycleOp[];
  compact?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [choice, setChoice] = useState<LifecycleOp | "">(ops[0] ?? "");

  if (ops.length === 0) {
    return <p className={cn("text-xs font-semibold text-gray-400", className)}>No state changes available</p>;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <form
        action={formAction}
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          if (choice && CONFIRM[choice] && !window.confirm(CONFIRM[choice])) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <select
          name="op"
          value={choice}
          onChange={(event) => setChoice(event.target.value as LifecycleOp)}
          aria-label="Choose state change"
          className={cn(
            "rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 outline-none transition hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10",
            compact ? "h-8 px-2 text-[11px]" : "h-10 min-w-40 px-3 text-xs",
          )}
        >
          {ops.map((op) => <option key={op} value={op}>{LABELS[op]}</option>)}
        </select>
        <button
          type="submit"
          disabled={pending || !choice}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-950 font-bold text-white transition hover:bg-accent-orange disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "h-8 px-2.5 text-[11px]" : "h-10 px-3.5 text-xs",
          )}
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Applying…" : "Apply"}
        </button>
      </form>
      {state.error && <p className="flex items-start gap-1 text-[11px] font-semibold text-red-600"><AlertCircle className="mt-px h-3 w-3 shrink-0" />{state.error}</p>}
      {state.message && <p className="flex items-start gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="mt-px h-3 w-3 shrink-0" />{state.message}</p>}
    </div>
  );
}
