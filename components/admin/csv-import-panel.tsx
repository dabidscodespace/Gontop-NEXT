"use client";

import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { importCsvAction } from "@/app/(admin)/admin/actions";
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">Import WooCommerce products</h2>
          <a
            href="/api/admin/export/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:border-accent-orange hover:text-accent-orange"
          >
            <Download className="h-3 w-3" /> Export current products
          </a>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Upload the WooCommerce product export directly, or this app&apos;s export format. Woo
          categories become games and variation attributes become package names. Prices use{" "}
          <code>sale_price</code>, then <code>regular_price</code>, then <code>price</code>. Draft
          products are imported inactive.
        </p>

        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="mode" value="preview" />
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-accent-orange text-center">
            <FileUp className="mx-auto h-6 w-6 text-gray-400" />
            <label className="mt-2 block cursor-pointer text-xs font-semibold text-accent-orange">
              Choose CSV file
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                name="file"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>
            <p className="mt-1 text-[10px] text-gray-400">
              {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "Max 8 MB"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600">
              …or paste CSV
            </label>
            <textarea
              name="csv"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              placeholder="product_name,product_slug,game_slug,variation_name,regular_price,..."
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-accent-orange/20 font-mono text-[11px] focus:border-accent-orange focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              name="createMissingGames"
              checked={createMissingGames}
              onChange={(event) => setCreateMissingGames(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Create games that do not exist yet
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Preview import
          </button>
        </form>

        {state.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}
        {state.message && !state.preview && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </div>
        )}

        {state.preview && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Rows" value={state.preview.totalRows} />
              <Stat label="Products" value={state.preview.products} />
              <Stat label="New" value={state.preview.validProducts} />
              <Stat label="Existing" value={state.preview.skippedProducts} />
            </div>

            {state.preview.gamesToCreate.length > 0 && (
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                Games that will be created: {state.preview.gamesToCreate.join(", ")}
              </p>
            )}

            {state.preview.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold text-red-700">
                  {state.preview.errors.length} row error(s) — nothing can be imported yet
                </p>
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[11px] text-red-600">
                  {state.preview.errors.map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-gray-50 text-[9px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1.5">Product</th>
                    <th className="px-2 py-1.5">Game</th>
                    <th className="px-2 py-1.5">Variations</th>
                    <th className="px-2 py-1.5">From</th>
                    <th className="px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {state.preview.items.map((item) => (
                    <tr key={item.productSlug}>
                      <td className="px-2 py-1.5">
                        <p className="font-semibold text-gray-800">{item.productName}</p>
                        <p className="font-mono text-[9px] text-gray-400">{item.productSlug}</p>
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">{item.gameSlug}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.variationCount}</td>
                      <td className="px-2 py-1.5 text-gray-600">৳{item.minPrice}</td>
                      <td className="px-2 py-1.5">
                        {item.exists ? (
                          <span className="text-amber-600">Skip (exists)</span>
                        ) : (
                          <span className="text-emerald-600">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {state.preview.errors.length === 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => formAction(buildFormData("import"))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import {state.preview.validProducts} product(s)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
