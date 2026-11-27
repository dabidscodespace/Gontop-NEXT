"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import { cn } from "@/lib/utils";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  buttonClassName,
  confirm,
  hideButton,
  submitAside,
  submitAreaClassName,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  confirm?: string;
  hideButton?: boolean;
  submitAside?: React.ReactNode;
  submitAreaClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectTo) router.replace(state.redirectTo);
  }, [router, state.ok, state.redirectTo]);

  const submitButton = (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        !submitAside && !submitAreaClassName && "mt-4",
        buttonClassName,
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Saving..." : submitLabel}
    </button>
  );

  return (
    <form
      action={formAction}
      className={className}
      aria-busy={pending}
      data-pending={pending ? "true" : "false"}
      onSubmit={(event) => {
        if (pending || (confirm && !window.confirm(confirm))) event.preventDefault();
      }}
    >
      {children}

      {state.error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.message && (
        <p aria-live="polite" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
          {state.message}
        </p>
      )}

      {!hideButton && (submitAside || submitAreaClassName ? (
        <div className={cn("mt-4 flex flex-wrap items-center justify-end gap-3", submitAreaClassName)}>
          {submitAside}
          {submitButton}
        </div>
      ) : submitButton)}
    </form>
  );
}
