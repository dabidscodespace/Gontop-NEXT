"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Layers3,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ProductOption = {
  id: number;
  name: string;
  gameName: string;
  image: string | null;
  status: string;
  availability: string;
};

type LibraryFilter = "all" | "live" | "draft" | "attention";

export function CategoryProductPicker({
  products,
  initialSelectedIds,
}: {
  products: ProductOption[];
  initialSelectedIds: number[];
}) {
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const [selectedIds, setSelectedIds] = useState(() => initialSelectedIds.filter((id) => productById.has(id)));
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("all");
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProducts = selectedIds.flatMap((id) => {
    const product = productById.get(id);
    return product ? [product] : [];
  });
  const games = useMemo(
    () => [...new Set(products.map((product) => product.gameName))].sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (game !== "all" && product.gameName !== game) return false;
    if (normalizedSearch && !`${product.name} ${product.gameName}`.toLowerCase().includes(normalizedSearch)) return false;
    const live = product.status === "published" && product.availability === "available";
    if (filter === "live" && !live) return false;
    if (filter === "draft" && product.status !== "draft") return false;
    if (filter === "attention" && live) return false;
    return true;
  });
  const addableResults = filteredProducts.filter((product) => !selectedSet.has(product.id));

  function add(productId: number) {
    setSelectedIds((current) => current.includes(productId) ? current : [...current, productId]);
  }

  function addMany(productIds: number[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      productIds.forEach((id) => next.add(id));
      return [...next];
    });
  }

  function remove(productId: number) {
    setSelectedIds((current) => current.filter((id) => id !== productId));
  }

  function move(productId: number, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(productId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function resetFilters() {
    setSearch("");
    setGame("all");
    setFilter("all");
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-5 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm"><Package className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-black text-gray-900">No products available</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">Create a product first, then return here to place it in this storefront category.</p>
        <Link href="/admin/products/new" className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-gray-950 px-4 text-xs font-black text-white transition hover:bg-gray-800"><Plus className="h-3.5 w-3.5" /> Create product</Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {selectedIds.map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}

      <header className="flex flex-col gap-3 border-b border-gray-200 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Layers3 className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-black text-gray-950">Category products</p>
              <p className="text-[11px] text-gray-500">Choose products and control their storefront order.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-black text-white">{selectedIds.length} selected</span>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => setSelectedIds([])} className="h-7 rounded-lg px-2.5 text-[10px] font-black text-gray-500 transition hover:bg-red-50 hover:text-red-600">Clear all</button>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-w-0 border-b border-gray-200 lg:border-b-0 lg:border-r" aria-labelledby="selected-products-title">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
            <div>
              <h3 id="selected-products-title" className="text-xs font-black text-gray-800">Storefront order</h3>
              <p className="text-[10px] text-gray-400">Use the arrows to reorder products.</p>
            </div>
          </div>

          <div className="admin-scrollbar max-h-[430px] min-h-52 overflow-y-auto">
            {selectedProducts.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"><Package className="h-4 w-4" /></span>
                <p className="mt-3 text-xs font-black text-gray-700">No products selected</p>
                <p className="mt-1 max-w-48 text-[10px] leading-relaxed text-gray-400">Add products from the library. Their order here becomes their storefront order.</p>
              </div>
            ) : (
              <ol className="divide-y divide-gray-100">
                {selectedProducts.map((product, index) => (
                  <li key={product.id} className="group flex items-center gap-2.5 px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-black tabular-nums text-gray-500">{index + 1}</span>
                    <ProductThumb product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold text-gray-900">{product.name}</span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[10px] text-gray-400">{product.gameName}</span>
                        <ProductState product={product} compact />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => move(product.id, -1)} disabled={index === 0} aria-label={`Move ${product.name} up`} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => move(product.id, 1)} disabled={index === selectedProducts.length - 1} aria-label={`Move ${product.name} down`} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name} from category`} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="min-w-0" aria-labelledby="product-library-title">
          <div className="space-y-2.5 border-b border-gray-100 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="product-library-title" className="text-xs font-black text-gray-800">Product library</h3>
                <p className="text-[10px] text-gray-400">{filteredProducts.length} matching product{filteredProducts.length === 1 ? "" : "s"}</p>
              </div>
              {addableResults.length > 0 && (
                <button type="button" onClick={() => addMany(addableResults.map((product) => product.id))} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-[10px] font-black text-white transition hover:bg-gray-800"><Plus className="h-3 w-3" /> Add results</button>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or game…" aria-label="Search product library" className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-semibold text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={game} onChange={(event) => setGame(event.target.value)} aria-label="Filter products by game" className="h-9 min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-600 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100">
                <option value="all">All games</option>
                {games.map((gameName) => <option key={gameName} value={gameName}>{gameName}</option>)}
              </select>
              <select value={filter} onChange={(event) => setFilter(event.target.value as LibraryFilter)} aria-label="Filter products by state" className="h-9 min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-600 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100">
                <option value="all">All states</option>
                <option value="live">Live products</option>
                <option value="draft">Draft products</option>
                <option value="attention">Needs attention</option>
              </select>
            </div>
          </div>

          <div className="admin-scrollbar max-h-[430px] min-h-52 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
                <Search className="h-5 w-5 text-gray-300" />
                <p className="mt-3 text-xs font-black text-gray-700">No matching products</p>
                <button type="button" onClick={resetFilters} className="mt-2 text-[10px] font-black text-amber-700 hover:underline">Clear filters</button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const selected = selectedSet.has(product.id);
                  return (
                    <li key={product.id} className={cn("flex items-center gap-2.5 px-3 py-2.5 transition", selected ? "bg-emerald-50/40" : "hover:bg-gray-50")}>
                      <ProductThumb product={product} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-gray-900">{product.name}</span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[10px] text-gray-400">{product.gameName}</span>
                          <ProductState product={product} compact />
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => selected ? remove(product.id) : add(product.id)}
                        aria-pressed={selected}
                        aria-label={selected ? `Remove ${product.name} from category` : `Add ${product.name} to category`}
                        title={selected ? "Click to remove" : "Add to category"}
                        className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-black transition", selected ? "bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600" : "bg-gray-950 text-white hover:bg-amber-600")}
                      >
                        {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {selected ? "Added" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <footer className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/70 px-4 py-3 text-[10px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Only published and available products appear to customers, even when a draft is assigned here.</p>
        <Link href="/admin/products" className="shrink-0 font-black text-amber-700 hover:underline">Open product catalogue →</Link>
      </footer>
    </div>
  );
}

function ProductThumb({ product }: { product: ProductOption }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200/70">
      {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-3.5 w-3.5" />}
    </span>
  );
}

function ProductState({ product, compact = false }: { product: ProductOption; compact?: boolean }) {
  const live = product.status === "published" && product.availability === "available";
  const label = live ? "Live" : product.availability === "disabled" ? "Disabled" : product.availability === "unavailable" ? "Unavailable" : product.status;
  const tone = live
    ? "bg-emerald-50 text-emerald-700"
    : product.status === "draft"
      ? "bg-amber-50 text-amber-700"
      : "bg-gray-100 text-gray-500";
  return <span className={cn("shrink-0 rounded-full font-black capitalize", compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[9px]", tone)}>{label}</span>;
}
