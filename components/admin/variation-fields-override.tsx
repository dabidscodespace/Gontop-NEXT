"use client";

import { useState } from "react";

import { FieldsEditor } from "@/components/admin/fields-editor";
import type { ProductField } from "@/db/schema";

/** Package-level player fields. Off means the package uses the product's fields. */
export function VariationFieldsOverride({ initial }: { initial: ProductField[] | null }) {
  const [override, setOverride] = useState(initial !== null);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          name="overrideFields"
          checked={override}
          onChange={(event) => setOverride(event.target.checked)}
          className="h-4 w-4 accent-orange-500"
        />
        Use custom player fields for this package
      </label>
      {override ? (
        <FieldsEditor initial={initial ?? []} />
      ) : (
        <p className="text-xs text-gray-500">This package uses the product&apos;s player fields.</p>
      )}
    </div>
  );
}
