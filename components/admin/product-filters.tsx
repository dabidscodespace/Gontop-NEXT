"use client";

import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { btnPrimary, btnSecondary, selectCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type ProductFilterValues = {
  q?: string;
  game?: string;
  variant?: string;
  category?: string;
  status?: string;
  availability?: string;
  type?: string;
  sort?: string;
  dir?: string;
};

type Option = { value: string; label: string };

export function ProductFilters({
  values,
  games,
  variants,
  categories,
}: {
  values: ProductFilterValues;
  games: Option[];
  variants: Option[];
  categories: Option[];
}) {
  const advancedCount = [values.game, values.variant, values.category, values.availability, values.type].filter(Boolean).length;
  const [expanded, setExpanded] = useState(advancedCount > 0);
  const hasAnyFilter = Boolean(values.q || values.status || advancedCount);
  const labelFor = (options: Option[], value?: string) => options.find((option) => option.value === value)?.label;
  const activeFilters: Array<{ key: keyof ProductFilterValues; label: string }> = [
    ...(values.q ? [{ key: "q" as const, label: `Search: ${values.q}` }] : []),
    ...(values.game ? [{ key: "game" as const, label: labelFor(games, values.game) ?? "Game" }] : []),
    ...(values.variant ? [{ key: "variant" as const, label: labelFor(variants, values.variant) ?? "Variant" }] : []),
    ...(values.category ? [{ key: "category" as const, label: labelFor(categories, values.category) ?? "Category" }] : []),
    ...(values.status ? [{ key: "status" as const, label: `Status: ${values.status}` }] : []),
    ...(values.availability ? [{ key: "availability" as const, label: `Sales: ${values.availability}` }] : []),
    ...(values.type ? [{ key: "type" as const, label: `Type: ${values.type}` }] : []),
  ];
  const clearHref = (key: keyof ProductFilterValues) => {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(values)) {
      if (name !== key && name !== "page" && value) search.set(name, value);
    }
    const query = search.toString();
    return `/admin/products${query ? `?${query}` : ""}`;
  };

  return (
    <form className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
      {values.status && <input type="hidden" name="status" value={values.status} />}
      <div className="flex flex-col gap-2 p-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">Search products</span>
          <input
            name="q"
            defaultValue={values.q ?? ""}
            placeholder="Search product, SKU, package or game…"
            className="h-11 w-full rounded-xl border border-transparent bg-gray-50 pl-10 pr-3 text-sm font-medium text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:bg-gray-100/80 focus:border-accent-orange/30 focus:bg-white focus:ring-4 focus:ring-accent-orange/10"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className={cn(btnSecondary, "h-11 flex-1 sm:flex-none")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {advancedCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-orange px-1 text-[10px] font-black text-white">
                {advancedCount}
              </span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
          </button>
          <button type="submit" className={cn(btnPrimary, "h-11 flex-1 sm:flex-none")}>
            Apply
          </button>
          {hasAnyFilter && (
            <Link href="/admin/products" className={cn(btnSecondary, "h-11 px-3")} aria-label="Clear product filters">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Link>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 px-3 py-2.5">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Active</span>
          {activeFilters.map((filter) => (
            <Link key={filter.key} href={clearHref(filter.key)} className="inline-flex max-w-56 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600 transition hover:bg-red-50 hover:text-red-600" title={`Remove ${filter.label} filter`}>
              <span className="truncate">{filter.label}</span><X className="h-3 w-3 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FilterField label="Game family">
              <select name="game" defaultValue={values.game ?? ""} className={selectCls}>
                <option value="">All games</option>
                {games.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Regional variant">
              <select name="variant" defaultValue={values.variant ?? ""} className={selectCls}>
                <option value="">All regional variants</option>
                {variants.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Category">
              <select name="category" defaultValue={values.category ?? ""} className={selectCls}>
                <option value="">All categories</option>
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Sales availability">
              <select name="availability" defaultValue={values.availability ?? ""} className={selectCls}>
                <option value="">Any availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="disabled">Disabled</option>
              </select>
            </FilterField>
            <FilterField label="Product type">
              <select name="type" defaultValue={values.type ?? ""} className={selectCls}>
                <option value="">Any type</option>
                <option value="simple">Simple</option>
                <option value="variable">Variable</option>
              </select>
            </FilterField>
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
              <FilterField label="Sort by">
                <select name="sort" defaultValue={values.sort ?? "sort"} className={selectCls}>
                  <option value="sort">Display order</option>
                  <option value="updated">Last updated</option>
                  <option value="name">Product name</option>
                  <option value="game">Game</option>
                  <option value="packages">Packages</option>
                  <option value="price">Price</option>
                </select>
              </FilterField>
              <FilterField label="Direction">
                <select name="dir" defaultValue={values.dir ?? "asc"} className={selectCls}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </FilterField>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-500">
            <p>Filters combine together. Search also checks package names and SKUs.</p>
            {advancedCount > 0 && (
              <Link href={values.status ? `/admin/products?status=${values.status}` : "/admin/products"} className="shrink-0 font-bold text-accent-orange hover:underline">
                Clear advanced filters
              </Link>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}
