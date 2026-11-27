"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  Landmark,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { refundAction, resolvePendingRefundAction } from "@/app/(admin)/admin/actions";
import { AdminOverlayPortal } from "@/components/admin/overlay-portal";
import { inputCls, textareaCls } from "@/components/admin/ui";
import { EMPTY_FORM_STATE } from "@/lib/action-types";
import { formatBDT } from "@/lib/money";
import { cn } from "@/lib/utils";

export function RefundModal({
  orderId,
  orderNumber,
  customerName,
  total,
  remaining,
  triggerLabel = "Refund order",
  triggerClassName,
  triggerVariant = "danger",
}: {
  orderId: number;
  orderNumber: number;
  customerName: string;
  total: number;
  remaining: number;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: "danger" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setFormKey((value) => value + 1);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 active:translate-y-0",
          triggerVariant === "light"
            ? "bg-white text-red-700 shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:bg-red-50 focus-visible:ring-white/30"
            : "bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.22)] hover:bg-red-700 focus-visible:ring-red-200",
          triggerClassName,
        )}
      >
        <RotateCcw className="h-4 w-4" /> {triggerLabel}
      </button>

      {open && (
        <AdminOverlayPortal>
          <button type="button" aria-label="Close refund dialog" onClick={close} className="fixed inset-0 z-[120] bg-gray-950/60 backdrop-blur-[4px]" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-dialog-title"
            className="fixed left-1/2 top-1/2 z-[130] flex max-h-[min(92dvh,760px)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.4)]"
          >
            <header className="relative overflow-hidden bg-gradient-to-br from-[#3f0b0b] via-[#991b1b] to-[#ef4444] px-5 py-5 text-white sm:px-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-red-200/20 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-red-100 ring-1 ring-inset ring-white/15"><RotateCcw className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">Money return workflow</p>
                  <h2 id="refund-dialog-title" className="mt-1 text-xl font-black tracking-tight">Refund order #{orderNumber}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">Return all or part of {customerName}&apos;s payment with a fully audited record.</p>
                </div>
                <button ref={closeButtonRef} type="button" onClick={close} aria-label="Close refund dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 grid grid-cols-3 gap-2">
                <MoneyFact label="Order total" value={total} />
                <MoneyFact label="Already returned" value={Math.max(0, total - remaining)} muted />
                <MoneyFact label="Available now" value={remaining} highlight />
              </div>
              <RefundForm
                key={formKey}
                orderId={orderId}
                remaining={remaining}
                onCancel={close}
                onComplete={close}
              />
            </div>
          </section>
        </AdminOverlayPortal>
      )}
    </>
  );
}

function RefundForm({
  orderId,
  remaining,
  onCancel,
  onComplete,
}: {
  orderId: number;
  remaining: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [state, formAction, pending] = useActionState(refundAction, EMPTY_FORM_STATE);
  const [method, setMethod] = useState<"wallet" | "gateway">("wallet");
  const [recordOnly, setRecordOnly] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const router = useRouter();
  const amountValue = Math.min(remaining, Math.max(0, Number(amount) || 0));

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    const timer = window.setTimeout(onComplete, 850);
    return () => window.clearTimeout(timer);
  }, [onComplete, router, state.ok]);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-5">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-gray-700">Refund amount (BDT)</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">৳</span>
            <input name="amount" type="number" step="0.01" min="0.01" max={remaining} value={amount} onChange={(event) => setAmount(event.target.value)} required className={`${inputCls} pl-8 text-base font-black`} />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">Maximum {formatBDT(remaining)}</p>
        </label>

        <fieldset>
          <legend className="mb-1.5 text-xs font-black text-gray-700">Return destination</legend>
          <div className="grid grid-cols-2 gap-2">
            <MethodOption selected={method === "wallet"} icon={Wallet} label="Wallet" description="Instant credit" onClick={() => { setMethod("wallet"); setRecordOnly(false); }} />
            <MethodOption selected={method === "gateway"} icon={Landmark} label="Gateway" description="Original method" onClick={() => setMethod("gateway")} />
          </div>
          <input type="hidden" name="method" value={method} />
        </fieldset>
      </div>

      {method === "gateway" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-blue-900">Gateway handling</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-blue-700">Normally GONTOP sends the refund to the original payment gateway. Use record-only only when the money was already returned elsewhere.</p>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" name="recordOnly" value="1" checked={recordOnly} onChange={(event) => setRecordOnly(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                <span className="text-xs font-bold text-blue-900">Record an externally completed refund</span>
              </label>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-black text-blue-900">External reference {recordOnly ? "(required)" : "(optional)"}</span>
            <input name="externalReference" maxLength={200} required={recordOnly} placeholder={recordOnly ? "Reference from the external refund" : "Optional gateway reference"} className={inputCls} />
          </label>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-black text-gray-700">Reason</span>
        <textarea name="reason" rows={3} maxLength={500} required placeholder="Explain why this refund is being issued…" className={textareaCls} />
        <p className="mt-1.5 text-[10px] text-gray-400">Required for the order timeline and audit history.</p>
      </label>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>This action cannot be undone.</strong> Server-side checks lock the order and prevent the total refunded amount from exceeding what the customer paid.</p>
      </div>

      {state.error && <Feedback failed text={state.error} />}
      {state.message && <Feedback text={state.message} />}

      <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={pending} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={pending || amountValue <= 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {pending ? "Processing refund…" : `Refund ${formatBDT(amountValue)}`}
        </button>
      </footer>
    </form>
  );
}

export function ResolveRefundModal({
  refundId,
  amount,
}: {
  refundId: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setFormKey((value) => value + 1);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, open]);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-extrabold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"><CircleAlert className="h-3.5 w-3.5" /> Resolve</button>
      {open && (
        <AdminOverlayPortal>
          <button type="button" aria-label="Close resolution dialog" onClick={close} className="fixed inset-0 z-[120] bg-gray-950/60 backdrop-blur-[4px]" />
          <section role="dialog" aria-modal="true" aria-labelledby="resolve-refund-title" className="fixed left-1/2 top-1/2 z-[130] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.4)]">
            <header className="flex items-start gap-3 bg-gradient-to-br from-amber-700 to-orange-500 px-5 py-5 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><CircleAlert className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">Gateway reconciliation</p><h2 id="resolve-refund-title" className="mt-1 text-lg font-black">Resolve pending {formatBDT(amount)} refund</h2><p className="mt-1 text-xs text-white/70">Confirm what the payment gateway actually did.</p></div>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close resolution dialog" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/75 hover:bg-white/20"><X className="h-4 w-4" /></button>
            </header>
            <ResolveRefundForm key={formKey} refundId={refundId} onCancel={close} onComplete={close} />
          </section>
        </AdminOverlayPortal>
      )}
    </>
  );
}

function ResolveRefundForm({ refundId, onCancel, onComplete }: { refundId: string; onCancel: () => void; onComplete: () => void }) {
  const [state, formAction, pending] = useActionState(resolvePendingRefundAction, EMPTY_FORM_STATE);
  const [outcome, setOutcome] = useState<"completed" | "failed">("completed");
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    const timer = window.setTimeout(onComplete, 850);
    return () => window.clearTimeout(timer);
  }, [onComplete, router, state.ok]);

  return (
    <form action={formAction} className="space-y-4 p-5" aria-busy={pending}>
      <input type="hidden" name="refundId" value={refundId} />
      <input type="hidden" name="outcome" value={outcome} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOutcome("completed")} className={cn("rounded-xl border p-3 text-left transition", outcome === "completed" ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100" : "border-gray-200 hover:bg-gray-50")}><CheckCircle2 className={cn("h-4 w-4", outcome === "completed" ? "text-emerald-600" : "text-gray-400")} /><span className="mt-2 block text-xs font-extrabold text-gray-900">Gateway completed it</span><span className="mt-0.5 block text-[10px] text-gray-500">Count the refund as returned.</span></button>
        <button type="button" onClick={() => setOutcome("failed")} className={cn("rounded-xl border p-3 text-left transition", outcome === "failed" ? "border-red-300 bg-red-50 ring-2 ring-red-100" : "border-gray-200 hover:bg-gray-50")}><AlertCircle className={cn("h-4 w-4", outcome === "failed" ? "text-red-600" : "text-gray-400")} /><span className="mt-2 block text-xs font-extrabold text-gray-900">Gateway rejected it</span><span className="mt-0.5 block text-[10px] text-gray-500">Release the reserved amount.</span></button>
      </div>
      {outcome === "completed" && <label className="block"><span className="mb-1.5 block text-xs font-black text-gray-700">Gateway reference</span><input name="gatewayReference" required maxLength={200} placeholder="Required settlement reference" className={inputCls} /></label>}
      {outcome === "failed" && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] leading-relaxed text-red-700">Marking failed makes this amount refundable again. It does not send money.</div>}
      {state.error && <Feedback failed text={state.error} />}
      {state.message && <Feedback text={state.message} />}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onCancel} disabled={pending} className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-bold text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black text-white disabled:opacity-50", outcome === "completed" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{outcome === "completed" ? "Confirm completed" : "Mark failed"}</button></div>
    </form>
  );
}

function MethodOption({ selected, icon: Icon, label, description, onClick }: { selected: boolean; icon: typeof Wallet; label: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl border p-2.5 text-left transition", selected ? "border-red-300 bg-red-50 ring-2 ring-red-100" : "border-gray-200 hover:bg-gray-50")}><Icon className={cn("h-4 w-4", selected ? "text-red-600" : "text-gray-400")} /><span className="mt-1.5 block text-xs font-extrabold text-gray-900">{label}</span><span className="block text-[9px] text-gray-400">{description}</span></button>;
}

function MoneyFact({ label, value, muted = false, highlight = false }: { label: string; value: number; muted?: boolean; highlight?: boolean }) {
  return <div className={cn("rounded-xl border p-3", highlight ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50/70")}><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">{label}</p><p className={cn("mt-1 truncate text-sm font-black", highlight ? "text-red-700" : muted ? "text-gray-500" : "text-gray-950")}>{formatBDT(value)}</p></div>;
}

function Feedback({ text, failed = false }: { text: string; failed?: boolean }) {
  return <p role={failed ? "alert" : undefined} className={cn("flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold", failed ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{failed ? <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />}{text}</p>;
}
