"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Package,
} from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { importCsvAction } from "@/app/(admin)/admin/actions";
import { btnPrimary, btnSecondary, Card, textareaCls } from "@/components/admin/ui";
import { EMPTY_FORM_STATE } from "@/lib/action-types";

export function CsvImportPanel() {
  const [state, formAction, pending] = useActionState(importCsvAction, EMPTY_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [createMissingGames, setCreateMissingGames] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function buildFormData(mode: "preview" | "import") {
    const data = new FormData();
    data.set("mode", mode);
    if (file) data.set("file", file);
    if (text.trim()) data.set("csv", text);
    if (createMissingGames) data.set("createMissingGames", "on");
    return data;
  }

  return (
    <Card
      title="Import WooCommerce products"
      icon={Package}
      description="Categories become games, variations become packages, and sale price takes priority over regular price. Draft source products remain inactive."
      actions={<a href="/api/admin/export/products" className={btnSecondary}><Download className="h-3.5 w-3.5" /> Export products</a>}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value="preview" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-6 py-9 text-center transition hover:border-accent-orange hover:bg-orange-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-orange/10"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-accent-orange"><FileUp className="h-5 w-5" /></span>
          <span className="mt-3 text-sm font-extrabold text-gray-800">{file ? file.name : "Choose a product CSV"}</span>
          <span className="mt-1 text-xs text-gray-400">{file ? `${Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB selected · click to replace` : "WooCommerce or GONTOP export · maximum 8 MB"}</span>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" name="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />

        <details className="group rounded-xl border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-extrabold text-gray-600"><FileSpreadsheet className="h-3.5 w-3.5 text-gray-400" /> Paste CSV instead <span className="ml-auto text-gray-300 transition group-open:rotate-180">⌄</span></summary>
          <div className="border-t border-gray-100 p-4">
            <textarea name="csv" value={text} onChange={(event) => setText(event.target.value)} rows={7} placeholder="product_name,product_slug,game_slug,variation_name,regular_price,..." className={`${textareaCls} font-mono text-[11px]`} />
          </div>
        </details>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 transition hover:bg-gray-50">
          <input type="checkbox" name="createMissingGames" checked={createMissingGames} onChange={(event) => setCreateMissingGames(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" />
          <span><span className="block text-xs font-extrabold text-gray-700">Create missing games</span><span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500">When a product refers to an unknown game slug, create that game during the confirmed import.</span></span>
        </label>

        <button type="submit" disabled={pending || (!file && !text.trim())} className={btnPrimary}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Preview product import</button>
      </form>

      <Feedback error={state.error} message={!state.preview ? state.message : undefined} />

      {state.preview && (
        <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="CSV rows" value={state.preview.totalRows} />
            <Stat label="Products" value={state.preview.products} />
            <Stat label="Ready to import" value={state.preview.validProducts} tone="emerald" />
            <Stat label="Already exists" value={state.preview.skippedProducts} tone="amber" />
          </div>

          {state.preview.gamesToCreate.length > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-xs leading-relaxed text-blue-700"><strong>New games:</strong> {state.preview.gamesToCreate.join(", ")}</div>}
          {state.preview.errors.length > 0 && <ErrorList errors={state.preview.errors} />}

          <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-[9px] font-black uppercase tracking-wide text-gray-500">
                <tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Game</th><th className="px-3 py-2.5">Packages</th><th className="px-3 py-2.5">From</th><th className="px-3 py-2.5">Decision</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.preview.items.map((item) => (
                  <tr key={item.productSlug}><td className="px-3 py-2.5"><p className="font-extrabold text-gray-800">{item.productName}</p><p className="font-mono text-[9px] text-gray-400">{item.productSlug}</p></td><td className="px-3 py-2.5 text-gray-600">{item.gameSlug}</td><td className="px-3 py-2.5 font-bold text-gray-700">{item.variationCount}</td><td className="px-3 py-2.5 text-gray-600">৳{item.minPrice}</td><td className="px-3 py-2.5">{item.exists ? <Decision tone="amber">Skip · exists</Decision> : <Decision tone="emerald">Import · new</Decision>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {state.preview.errors.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-xs font-bold text-emerald-800">Preview valid · {state.preview.validProducts} new product{state.preview.validProducts === 1 ? "" : "s"} will be written.</p>
              <button type="button" disabled={pending || state.preview.validProducts === 0} onClick={() => formAction(buildFormData("import"))} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50">{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirm import</button>
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

function ErrorList({ errors }: { errors: Array<{ row: number; message: string }> }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3.5"><p className="text-xs font-extrabold text-red-700">{errors.length} row error{errors.length === 1 ? "" : "s"} · fix these before importing</p><ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-red-600">{errors.map((error, index) => <li key={`${error.row}-${index}`}>Row {error.row}: {error.message}</li>)}</ul></div>;
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" | "amber" }) {
  const style = tone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 bg-gray-50 text-gray-900";
  return <div className={`rounded-xl border p-3 text-center ${style}`}><p className="text-[9px] font-black uppercase tracking-wide opacity-60">{label}</p><p className="mt-1 text-lg font-black">{value.toLocaleString()}</p></div>;
}

function Decision({ children, tone }: { children: React.ReactNode; tone: "emerald" | "amber" }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{children}</span>;
}
