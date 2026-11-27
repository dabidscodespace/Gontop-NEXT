"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Loader2,
  ReceiptText,
  Users,
} from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { importCustomersAction, importOrdersAction } from "@/app/(admin)/admin/actions";
import { btnPrimary, Card, textareaCls } from "@/components/admin/ui";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import { formatBDT } from "@/lib/money";

type MigrationKind = "customers" | "orders";

export function CustomerMigrationPanel() {
  return (
    <MigrationCard
      kind="customers"
      title="Import customers"
      description="Upload a WooCommerce customer export or WordPress users CSV. Accounts match by email; existing customers are skipped and passwords are never imported."
      action={importCustomersAction}
    />
  );
}

export function OrderMigrationPanel() {
  return (
    <MigrationCard
      kind="orders"
      title="Import order history"
      description="Upload one row per order or per line item. Missing customers are created by billing email; wallet balances and wallet ledger entries are never changed."
      action={importOrdersAction}
    />
  );
}

function MigrationCard({ kind, title, description, action }: { kind: MigrationKind; title: string; description: string; action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const Icon = kind === "customers" ? Users : ReceiptText;

  function buildFormData(mode: "preview" | "import") {
    const data = new FormData();
    data.set("mode", mode);
    if (file) data.set("file", file);
    if (text.trim()) data.set("csv", text);
    return data;
  }

  return (
    <Card title={title} icon={Icon} description={description}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value="preview" />
        <button type="button" onClick={() => fileRef.current?.click()} className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-6 py-9 text-center transition hover:border-accent-orange hover:bg-orange-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-orange/10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-accent-orange"><FileUp className="h-5 w-5" /></span>
          <span className="mt-3 text-sm font-extrabold text-gray-800">{file ? file.name : `Choose a ${kind} CSV`}</span>
          <span className="mt-1 text-xs text-gray-400">{file ? `${Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB selected · click to replace` : "WooCommerce or WordPress CSV · maximum 8 MB"}</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" name="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />

        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-extrabold text-gray-600"><FileSpreadsheet className="h-3.5 w-3.5 text-gray-400" /> Paste CSV instead <span className="ml-auto text-gray-300 transition group-open:rotate-180">⌄</span></summary>
          <div className="border-t border-gray-100 p-4">
            <textarea name="csv" value={text} onChange={(event) => setText(event.target.value)} rows={7} placeholder={kind === "customers" ? "email,first_name,last_name,phone,registered" : "order_id,order_date,status,billing_email,order_total,line_items"} className={`${textareaCls} font-mono text-[11px]`} />
          </div>
        </details>

        <button type="submit" disabled={pending || (!file && !text.trim())} className={btnPrimary}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Preview {kind} import</button>
      </form>

      <Feedback error={state.error} message={!state.migration ? state.message : undefined} />

      {state.migration && (
        <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="CSV rows" value={state.migration.totalRows} />
            <Stat label={kind === "customers" ? "Customers" : "Orders"} value={state.migration.groups} />
            <Stat label="Ready to import" value={state.migration.newGroups} tone="emerald" />
            <Stat label="Already exists" value={state.migration.existingGroups} tone="amber" />
          </div>

          {state.migration.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] text-amber-800"><p className="font-extrabold">{state.migration.warnings.length} warning{state.migration.warnings.length === 1 ? "" : "s"}</p><ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">{state.migration.warnings.slice(0, 10).map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>
          )}
          {state.migration.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5"><p className="text-xs font-extrabold text-red-700">{state.migration.errors.length} row error{state.migration.errors.length === 1 ? "" : "s"} · fix these before importing</p><ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-red-600">{state.migration.errors.slice(0, 20).map((error, index) => <li key={index}>Row {error.row}: {error.message}</li>)}</ul></div>
          )}

          <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-[9px] font-black uppercase tracking-wide text-gray-500">
                <tr><th className="px-3 py-2.5">{kind === "customers" ? "Customer" : "Order"}</th><th className="px-3 py-2.5">Email</th>{kind === "orders" && <th className="px-3 py-2.5">Total</th>}{kind === "orders" && <th className="px-3 py-2.5">Status</th>}<th className="px-3 py-2.5">Decision</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.migration.items.map((item) => (
                  <tr key={item.key}><td className="px-3 py-2.5 font-extrabold text-gray-800">{item.label}</td><td className="px-3 py-2.5 text-gray-600">{item.email}</td>{kind === "orders" && <td className="px-3 py-2.5 text-gray-600">{item.total === null ? "—" : formatBDT(item.total)}</td>}{kind === "orders" && <td className="px-3 py-2.5 capitalize text-gray-600">{item.status ?? "—"}</td>}<td className="px-3 py-2.5">{item.exists ? <Decision tone="amber">Skip · exists</Decision> : <Decision tone="emerald">Import · new</Decision>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.migration.errors.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-xs font-bold text-emerald-800">Preview valid · {state.migration.newGroups} new {kind} record{state.migration.newGroups === 1 ? "" : "s"} will be written.</p>
              <button type="button" disabled={pending || state.migration.newGroups === 0} onClick={() => formAction(buildFormData("import"))} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirm import</button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Feedback({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  const failed = Boolean(error);
  return <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${failed ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{failed ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}<span>{error || message}</span></div>;
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" | "amber" }) {
  const style = tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 bg-gray-50 text-gray-900";
  return <div className={`rounded-xl border p-3 text-center ${style}`}><p className="text-[9px] font-black uppercase tracking-wide opacity-60">{label}</p><p className="mt-1 text-lg font-black">{value.toLocaleString()}</p></div>;
}

function Decision({ children, tone }: { children: React.ReactNode; tone: "emerald" | "amber" }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{children}</span>;
}
