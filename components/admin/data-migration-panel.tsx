"use client";

import { AlertCircle, CheckCircle2, FileUp, Loader2, Users, ReceiptText } from "lucide-react";
import { useActionState, useState } from "react";

import { importCustomersAction, importOrdersAction } from "@/app/(admin)/admin/actions";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/action-types";
import { formatBDT } from "@/lib/money";

type MigrationKind = "customers" | "orders";

export function CustomerMigrationPanel() {
  return (
    <MigrationCard
      kind="customers"
      title="Import customers"
      description="Upload a WooCommerce customer export or a WordPress users CSV. Accounts are matched by email; existing customers are skipped. Passwords cannot be imported."
      action={importCustomersAction}
    />
  );
}

export function OrderMigrationPanel() {
  return (
    <MigrationCard
      kind="orders"
      title="Import orders"
      description="Upload a WooCommerce order export (one row per order, or one row per line item). Missing customers are created automatically. Wallet balances and ledger entries are never changed."
      action={importOrdersAction}
    />
  );
}

function MigrationCard({
  kind,
  title,
  description,
  action,
}: {
  kind: MigrationKind;
  title: string;
  description: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const Icon = kind === "customers" ? Users : ReceiptText;

  function buildFormData(mode: "preview" | "import") {
    const data = new FormData();
    data.set("mode", mode);
    if (file) data.set("file", file);
    if (text.trim()) data.set("csv", text);
    return data;
  }

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 rounded-xl bg-orange-50 p-1.5 text-accent-orange">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{description}</p>
        </div>
      </div>

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="mode" value="preview" />
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-accent-orange text-center">
          <FileUp className="mx-auto h-6 w-6 text-gray-400" />
          <label className="mt-2 block cursor-pointer text-xs font-semibold text-accent-orange">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              name="file"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-1 text-[10px] text-gray-400">
            {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "Max 8 MB"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600">…or paste CSV</label>
          <textarea
            name="csv"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            placeholder={
              kind === "customers"
                ? "email,first_name,last_name,phone,registered"
                : "order_id,order_date,status,billing_email,order_total,line_items"
            }
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:ring-2 focus:ring-accent-orange/20 font-mono text-[11px] focus:border-accent-orange focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-orange px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Preview {kind}
        </button>
      </form>

      {state.error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.message && !state.migration && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.migration && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Rows" value={state.migration.totalRows} />
            <Stat
              label={kind === "customers" ? "Customers" : "Orders"}
              value={state.migration.groups}
            />
            <Stat label="New" value={state.migration.newGroups} />
            <Stat label="Existing" value={state.migration.existingGroups} />
          </div>

          {state.migration.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              <p className="font-bold">{state.migration.warnings.length} warning(s)</p>
              <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto">
                {state.migration.warnings.slice(0, 10).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {state.migration.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-bold text-red-700">
                {state.migration.errors.length} row error(s) — nothing can be imported yet
              </p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-[11px] text-red-600">
                {state.migration.errors.slice(0, 20).map((error, index) => (
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
                  <th className="px-2 py-1.5">{kind === "customers" ? "Customer" : "Order"}</th>
                  <th className="px-2 py-1.5">Email</th>
                  {kind === "orders" && <th className="px-2 py-1.5">Total</th>}
                  {kind === "orders" && <th className="px-2 py-1.5">Status</th>}
                  <th className="px-2 py-1.5">Import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {state.migration.items.map((item) => (
                  <tr key={item.key}>
                    <td className="px-2 py-1.5 font-semibold text-gray-800">{item.label}</td>
                    <td className="px-2 py-1.5 text-gray-600">{item.email}</td>
                    {kind === "orders" && (
                      <td className="px-2 py-1.5 text-gray-600">
                        {item.total === null ? "—" : formatBDT(item.total)}
                      </td>
                    )}
                    {kind === "orders" && (
                      <td className="px-2 py-1.5 text-gray-600">{item.status ?? "—"}</td>
                    )}
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

          {state.migration.errors.length === 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => formAction(buildFormData("import"))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Import {state.migration.newGroups} {kind}
            </button>
          )}
        </div>
      )}
    </section>
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
