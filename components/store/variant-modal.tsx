"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { ProductGrid } from "@/components/store/product-card";
import type { HomeCard } from "@/lib/services/catalog";

/**
 * Regional variant picker for a Popular Games parent. Variant cards are the original product
 * cards linking to their product pages. Closes on Escape, backdrop click, or the X button.
 */
export function VariantModal({
  title,
  variants,
  onClose,
}: {
  title: string;
  variants: HomeCard[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} regions`}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-4xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black">{title}</h2>
            <p className="text-xs text-gray-500">Choose a region</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ProductGrid products={variants} />
      </div>
    </div>
  );
}
