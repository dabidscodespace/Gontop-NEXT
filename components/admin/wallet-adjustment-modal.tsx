"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { adjustWalletAction } from "@/app/(admin)/admin/actions";
import { AdminOverlayPortal } from "@/components/admin/overlay-portal";
import { inputCls, textareaCls } from "@/components/admin/ui";
import { EMPTY_FORM_STATE } from "@/lib/action-types";
import { formatBDT } from "@/lib/money";
import { cn } from "@/lib/utils";

export function WalletAdjustmentModal({
  userId,
  customerName,
  currentBalance,
}: {
  userId: string;
  customerName: string;
  currentBalance: number;
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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-px hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 active:translate-y-0"
      >
        <CircleDollarSign className="h-4 w-4" /> Adjust balance
      </button>

      {open && (
        <AdminOverlayPortal>
          <button type="button" aria-label="Close wallet adjustment dialog" onClick={close} className="fixed inset-0 z-[120] bg-gray-950/60 backdrop-blur-[4px]" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-adjustment-title"
            className="fixed left-1/2 top-1/2 z-[130] flex max-h-[min(92dvh,720px)] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.4)]"
          >
            <header className="relative overflow-hidden bg-gradient-to-br from-[#052b23] via-[#08745c] to-[#10b981] px-5 py-5 text-white sm:px-6">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-100/20 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-100 ring-1 ring-inset ring-white/15"><WalletCards className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">Protected wallet operation</p>
                  <h2 id="wallet-adjustment-title" className="mt-1 text-xl font-black tracking-tight">Adjust {customerName}&apos;s balance</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">Create an immutable credit or debit with a mandatory audit reason.</p>
                </div>
                <button ref={closeRef} type="button" onClick={close} aria-label="Close wallet adjustment dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              <WalletAdjustmentForm
                key={formKey}
                userId={userId}
                currentBalance={currentBalance}
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

function WalletAdjustmentForm({
  userId,
  currentBalance,
  onCancel,
  onComplete,
}: {
  userId: string;
  currentBalance: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [state, formAction, pending] = useActionState(adjustWalletAction, EMPTY_FORM_STATE);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const numericAmount = Math.max(0, Number(amount) || 0);
  const projected = currentBalance + (direction === "credit" ? numericAmount : -numericAmount);
  const insufficient = direction === "debit" && projected < 0;

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    const timer = window.setTimeout(onComplete, 850);
    return () => window.clearTimeout(timer);
  }, [onComplete, router, state.ok]);

  return (
    <form action={formAction} aria-busy={pending} className="space-y-5">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="direction" value={direction} />

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Adjustment direction">
        <DirectionOption selected={direction === "credit"} icon={Plus} label="Credit wallet" hint="Add funds" onClick={() => setDirection("credit")} />
        <DirectionOption selected={direction === "debit"} icon={Minus} label="Debit wallet" hint="Remove funds" onClick={() => setDirection("debit")} danger />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-black text-gray-700">Adjustment amount (BDT)</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">৳</span>
          <input name="amount" type="number" step="0.01" min="0.01" max={direction === "debit" ? currentBalance : undefined} value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="0.00" className={`${inputCls} pl-8 text-base font-black`} />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <BalanceFact label="Current balance" value={currentBalance} />
        <BalanceFact label="Balance after" value={Math.max(0, projected)} highlight={!insufficient && numericAmount > 0} danger={insufficient} />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-black text-gray-700">Reason</span>
        <textarea name="reason" rows={3} maxLength={500} required placeholder="Why is this balance adjustment necessary?" className={textareaCls} />
        <p className="mt-1.5 text-[10px] text-gray-400">This explanation stays permanently attached to the ledger entry.</p>
      </label>

      <div className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-[11px] leading-relaxed", insufficient ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
        {insufficient ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}
        <p>{insufficient ? "This debit exceeds the available wallet balance." : "The wallet row is locked while the adjustment is applied, and the ledger entry cannot be edited later."}</p>
      </div>

      {state.error && <Feedback failed text={state.error} />}
      {state.message && <Feedback text={state.message} />}

      <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={pending} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={pending || numericAmount <= 0 || insufficient} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50", direction === "credit" ? "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700" : "bg-red-600 shadow-red-500/20 hover:bg-red-700")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : direction === "credit" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {pending ? "Applying…" : `${direction === "credit" ? "Credit" : "Debit"} ${formatBDT(numericAmount)}`}
        </button>
      </footer>
    </form>
  );
}

function DirectionOption({ selected, icon: Icon, label, hint, onClick, danger = false }: { selected: boolean; icon: typeof Plus; label: string; hint: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition", selected ? (danger ? "border-red-300 bg-red-50 ring-2 ring-red-100" : "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100") : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50")}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", selected ? (danger ? "bg-red-600 text-white" : "bg-emerald-600 text-white") : "bg-gray-100 text-gray-500")}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0"><span className="block truncate text-xs font-black text-gray-900">{label}</span><span className="block text-[10px] text-gray-500">{hint}</span></span>
    </button>
  );
}

function BalanceFact({ label, value, highlight = false, danger = false }: { label: string; value: number; highlight?: boolean; danger?: boolean }) {
  return <div className="min-w-0 px-2 py-1"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">{label}</p><p className={cn("mt-1 truncate text-sm font-black", danger ? "text-red-600" : highlight ? "text-emerald-600" : "text-gray-950")}>{formatBDT(value)}</p></div>;
}

function Feedback({ text, failed = false }: { text: string; failed?: boolean }) {
  return <div role={failed ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold", failed ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{failed ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}<span>{text}</span></div>;
}
