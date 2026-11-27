"use client";

import { GitBranch, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { FieldsEditor } from "@/components/admin/fields-editor";
import type { ProductField } from "@/db/schema";

/** Package-level player fields. Off means the package uses the product's fields. */
export function VariationFieldsOverride({ initial }: { initial: ProductField[] | null }) {
  const [override, setOverride] = useState(initial !== null);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            {override ? <SlidersHorizontal className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
          </span>
          <span>
            <span className="block text-sm font-extrabold text-gray-800">Custom customer fields</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
              {override ? "This package has its own checkout fields." : "Inheriting the product's checkout fields."}
            </span>
          </span>
        </span>
        <span className="relative inline-flex h-6 w-11 shrink-0">
          <input type="checkbox" name="overrideFields" checked={override} onChange={(event) => setOverride(event.target.checked)} className="peer sr-only" />
          <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange peer-focus-visible:ring-4 peer-focus-visible:ring-orange-100" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>
      {override && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <FieldsEditor initial={initial ?? []} />
        </div>
      )}
    </div>
  );
}
