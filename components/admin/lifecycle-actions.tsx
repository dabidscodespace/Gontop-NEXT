"use client";

import { useActionState } from "react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import type { LifecycleOp } from "@/lib/catalog-rules";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const LABELS: Record<LifecycleOp, string> = {
  publish: "Publish",
  unpublish: "Unpublish",
  archive: "Archive",
  restore: "Restore",
  enable: "Enable",
  disable: "Disable",
  mark_available: "Mark available",
  mark_unavailable: "Mark unavailable",
};

/** One button per lifecycle operation that is valid for the record's current state. */
export function LifecycleActions({
  action,
  id,
  ops,
}: {
  action: Action;
  id: number;
  ops: LifecycleOp[];
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {ops.map((op) => (
          <form key={op} action={formAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              name="op"
              value={op}
              disabled={pending}
              className="rounded border border-gray-200 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-gray-50 disabled:opacity-50"
            >
              {LABELS[op]}
            </button>
          </form>
        ))}
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </div>
  );
}
