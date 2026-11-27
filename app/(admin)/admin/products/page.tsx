import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  Package,
  Pencil,
  Plus,
  Star,
} from "lucide-react";

import { BulkForm, SelectAll } from "@/components/admin/bulk-form";
import { NoAccess } from "@/components/admin/no-access";
import { ProductFilters } from "@/components/admin/product-filters";
import { RowAction } from "@/components/admin/row-action";
import {
  btnOnDark,
  btnOnDarkPrimary,
  btnPrimary,
  btnSecondary,
  Card,
  EmptyState,
  PageIdentity,
  Pagination,
} from "@/components/admin/ui";
import { getSession } from "@/lib/auth";
import { availableLifecycleOps } from "@/lib/catalog-rules";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listCategoriesAdmin, listGamesAdmin, listProductsAdmin } from "@/lib/services/admin-catalog";
import { cn } from "@/lib/utils";
import {
  bulkUpdateProductsAction,
  duplicateProductAction,
  productLifecycleAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  archived: "bg-gray-100 text-gray-600 ring-gray-200",
};

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-sky-50 text-sky-700 ring-sky-200",
  unavailable: "bg-orange-50 text-orange-700 ring-orange-200",
  disabled: "bg-gray-100 text-gray-600 ring-gray-200",
};

const BULK_ACTIONS = [
  { value: "publish", label: "Publish" },
  { value: "draft", label: "Move to draft" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore to draft" },
  { value: "enable", label: "Enable sales" },
  { value: "disable", label: "Disable sales" },
  { value: "mark_available", label: "Mark available" },
  { value: "mark_unavailable", label: "Mark unavailable" },
  { value: "feature", label: "Feature" },
  { value: "unfeature", label: "Remove featured" },
  { value: "delete", label: "Delete permanently", danger: true },
];

const CATEGORY_ACTIONS = [
  { value: "category_add", label: "Add to category…" },
  { value: "category_remove", label: "Remove from category…" },
];

type Params = {
  q?: string;
  game?: string;
  variant?: string;
  category?: string;
  status?: string;
  availability?: string;
  type?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function timeAgo(value: Date | string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "products.manage")) return <NoAccess />;

  const params = await searchParams;
  const [games, categories, result] = await Promise.all([
    listGamesAdmin(),
    listCategoriesAdmin(),
    listProductsAdmin({
      search: params.q,
      gameId: params.game ? Number(params.game) : undefined,
      variantId: params.variant ? Number(params.variant) : undefined,
      categoryId: params.category ? Number(params.category) : undefined,
      status: params.status,
      availability: params.availability,
      type: params.type,
      sort: params.sort,
      dir: params.dir,
      page: params.page ? Number(params.page) : 1,
    }),
  ]);

  const query = (overrides: Partial<Params>) => {
    const merged = { ...params, ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const value = search.toString();
    return `/admin/products${value ? `?${value}` : ""}`;
  };

  const { summary } = result;
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const gameNames = new Map(games.map((game) => [game.id, game.name]));
  const topLevelGames = games.filter((game) => !game.parentId);
  const variantGames = games.filter((game) => game.parentId);
  const assignableCategories = categories.filter((category) => category.layout === "products");
  const bulkActions = [...BULK_ACTIONS, ...(assignableCategories.length ? CATEGORY_ACTIONS : [])];
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  const summaries = [
    { key: "all", label: "All", value: summary.total, icon: Package, href: query({ status: undefined, availability: undefined, page: undefined }), active: !params.status && !params.availability },
    { key: "published", label: "Published", value: summary.published, icon: CheckCircle2, href: query({ status: "published", availability: undefined, page: undefined }), active: params.status === "published" },
    { key: "draft", label: "Draft", value: summary.draft, icon: FileText, href: query({ status: "draft", availability: undefined, page: undefined }), active: params.status === "draft" },
    { key: "archived", label: "Archived", value: summary.archived, icon: Archive, href: query({ status: "archived", availability: undefined, page: undefined }), active: params.status === "archived" },
    { key: "disabled", label: "Disabled", value: summary.disabled, icon: ImageOff, href: query({ availability: "disabled", status: undefined, page: undefined }), active: params.availability === "disabled" },
    { key: "unavailable", label: "Unavailable", value: summary.unavailable, icon: AlertTriangle, href: query({ availability: "unavailable", status: undefined, page: undefined }), active: params.availability === "unavailable" },
  ];

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Catalogue command centre"
        title="Products"
        description="Build, publish and merchandise the products customers buy. Lifecycle health and package management live in one catalogue-specific surface."
        icon={Package}
        tone="indigo"
        signal={`${summary.published.toLocaleString()} published`}
        actions={
          <>
            <a href="/api/admin/export/products" className={btnOnDark}>
              <Download className="h-4 w-4" /> Export
            </a>
            <Link href="/admin/products/new" className={btnOnDarkPrimary}>
              <Plus className="h-4 w-4" /> New product
            </Link>
          </>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <nav aria-label="Product state summary" className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          {summaries.map(({ key, label, value, icon: Icon, href, active }) => (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-w-0 items-center gap-3 px-4 py-3.5 transition",
                active ? "bg-gray-950 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", active ? "bg-white/10 text-accent-orange" : "bg-gray-100 text-gray-500 group-hover:text-accent-orange")}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-[10px] font-black uppercase tracking-[0.1em]", active ? "text-white/55" : "text-gray-400")}>{label}</span>
                <span className="block text-lg font-black tabular-nums">{value.toLocaleString()}</span>
              </span>
            </Link>
          ))}
        </nav>
      </Card>

      <ProductFilters
        values={params}
        games={topLevelGames.map((game) => ({ value: String(game.id), label: game.name }))}
        variants={variantGames.map((game) => ({
          value: String(game.id),
          label: `${gameNames.get(game.parentId ?? 0) ?? "Game"} · ${game.region || game.name}`,
        }))}
        categories={assignableCategories.map((category) => ({ value: String(category.id), label: category.name }))}
      />

      <BulkForm action={bulkUpdateProductsAction} actions={bulkActions} categories={assignableCategories}>
        <Card padded={false} className="overflow-hidden">
          {result.rows.length === 0 ? (
            <EmptyState
              icon={Package}
              title={summary.total === 0 ? "No products yet" : "No products match"}
              description={summary.total === 0 ? "Create your first product, then add one or more packages." : "Try a broader search or clear some filters."}
              action={summary.total === 0 ? <Link href="/admin/products/new" className={btnPrimary}><Plus className="h-4 w-4" /> New product</Link> : <Link href="/admin/products" className={btnSecondary}>Clear filters</Link>}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b border-gray-100 bg-gray-50/70">
                    <tr>
                      <th className="w-12 px-4 py-3.5"><SelectAll /></th>
                      <SortableHeader label="Product" href={query({ sort: "name", dir: params.sort === "name" && params.dir !== "desc" ? "desc" : "asc", page: undefined })} active={params.sort === "name"} />
                      <th className={tableHead}>Catalogue</th>
                      <SortableHeader label="Packages" href={query({ sort: "packages", dir: params.sort === "packages" && params.dir !== "desc" ? "desc" : "asc", page: undefined })} active={params.sort === "packages"} />
                      <SortableHeader label="Price" href={query({ sort: "price", dir: params.sort === "price" && params.dir !== "desc" ? "desc" : "asc", page: undefined })} active={params.sort === "price"} />
                      <th className={tableHead}>State</th>
                      <th className={tableHead}>Updated</th>
                      <th className={`${tableHead} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.rows.map((product) => {
                      const ops = availableLifecycleOps({ status: product.status, availability: product.availability });
                      return (
                        <tr key={product.id} className="group transition hover:bg-orange-50/25">
                          <td className="px-4 py-4 align-middle">
                            <ProductCheckbox id={product.id} name={product.name} />
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex min-w-[240px] items-center gap-3">
                              <ProductImage src={product.image} name={product.name} />
                              <div className="min-w-0">
                                <Link href={`/admin/products/${product.id}`} className="inline-flex max-w-[260px] items-center gap-1.5 truncate text-sm font-extrabold text-gray-950 hover:text-accent-orange">
                                  <span className="truncate">{product.name}</span>
                                  {product.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                                </Link>
                                <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-gray-400">
                                  /{product.slug}{product.sku ? ` · ${product.sku}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-sm">
                            <p className="font-bold text-gray-800">{product.parentGameName ?? product.gameName}</p>
                            <p className="mt-0.5 text-[11px] capitalize text-gray-400">
                              {product.gameParentId ? product.gameRegion || product.gameName : "Global"} · {product.productType}
                              {product.categoryCount ? ` · ${product.categoryCount} categories` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <p className="text-sm font-black text-gray-900">{product.publishedVariationCount}<span className="font-medium text-gray-400">/{product.variationCount}</span></p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">live packages</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle text-sm font-black text-gray-950">
                            {priceRange(product.minPrice, product.maxPrice)}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <ProductState product={product} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle text-xs font-semibold text-gray-500">{timeAgo(product.updatedAt)}</td>
                          <td className="px-4 py-4 text-right align-middle">
                            <ProductActions product={product} ops={ops} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-3 text-xs font-bold text-gray-600 lg:hidden">
                <SelectAll /> Select all products on this page
              </div>
              <ul className="divide-y divide-gray-100 lg:hidden">
                {result.rows.map((product) => {
                  const ops = availableLifecycleOps({ status: product.status, availability: product.availability });
                  return (
                    <li key={product.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="pt-1"><ProductCheckbox id={product.id} name={product.name} /></div>
                        <ProductImage src={product.image} name={product.name} large />
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/products/${product.id}`} className="flex items-center gap-1.5 text-sm font-extrabold text-gray-950">
                            <span className="truncate">{product.name}</span>
                            {product.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{product.parentGameName ?? product.gameName}{product.gameParentId ? ` · ${product.gameRegion || product.gameName}` : ""}</p>
                          <div className="mt-2"><ProductState product={product} compact /></div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        <MobileFact label="Price" value={priceRange(product.minPrice, product.maxPrice)} />
                        <MobileFact label="Packages" value={`${product.publishedVariationCount}/${product.variationCount} live`} />
                        <MobileFact label="Updated" value={timeAgo(product.updatedAt)} />
                      </div>
                      <div className="mt-3 flex items-center justify-end"><ProductActions product={product} ops={ops} /></div>
                    </li>
                  );
                })}
              </ul>

              <footer className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
                <p className="text-xs font-semibold text-gray-500">Showing {rangeStart}–{rangeEnd} of {result.total.toLocaleString()}</p>
                <Pagination page={result.page} pageCount={pageCount} buildHref={(page) => query({ page: String(page) })} />
              </footer>
            </>
          )}
        </Card>
      </BulkForm>
    </div>
  );
}

const tableHead = "whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-gray-500";

function SortableHeader({ label, href, active }: { label: string; href: string; active: boolean }) {
  return <th className={tableHead}><Link href={href} className={cn("transition hover:text-gray-950", active && "text-accent-orange")}>{label}{active ? " ↕" : ""}</Link></th>;
}

function ProductCheckbox({ id, name }: { id: number; name: string }) {
  return <input type="checkbox" name="ids" value={id} aria-label={`Select ${name}`} className="h-4 w-4 rounded border-gray-300 accent-[#f96000] focus:ring-orange-200" />;
}

function ProductImage({ src, name, large = false }: { src: string | null; name: string; large?: boolean }) {
  const size = large ? "h-14 w-14" : "h-11 w-11";
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50", size)}>
      {src ? <Image src={src} alt="" fill sizes={large ? "56px" : "44px"} className="object-cover" /> : <ImageOff className="h-4 w-4 text-gray-400" />}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function ProductState({ product, compact = false }: { product: Awaited<ReturnType<typeof listProductsAdmin>>["rows"][number]; compact?: boolean }) {
  const missing = product.readiness?.missing ?? [];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1 ring-inset", STATUS_STYLES[product.status])}>{product.status}</span>
        {product.availability !== "available" && <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1 ring-inset", AVAILABILITY_STYLES[product.availability])}>{product.availability}</span>}
      </div>
      {product.readiness !== null && (!compact || !product.readiness.ready) && (
        product.readiness.ready ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Ready</p>
        ) : (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700" title={missing.join(" ")}><AlertTriangle className="h-3 w-3" /> {missing.length} issue{missing.length === 1 ? "" : "s"}</p>
        )
      )}
    </div>
  );
}

function ProductActions({ product, ops }: { product: Awaited<ReturnType<typeof listProductsAdmin>>["rows"][number]; ops: ReturnType<typeof availableLifecycleOps> }) {
  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1">
      <Link href={`/admin/products/${product.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-700 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Link>
      {product.status === "published" && (
        <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${product.name} on store`} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <RowAction action={duplicateProductAction} fields={{ id: String(product.id) }} label="Duplicate" icon="copy" iconOnly className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50" />
      {ops.includes("archive") && (
        <RowAction action={productLifecycleAction} fields={{ id: String(product.id), op: "archive" }} label="Archive" icon="archive" iconOnly confirm={`Archive "${product.name}"?`} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50" />
      )}
    </div>
  );
}

function MobileFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-gray-400">{label}</p><p className="mt-0.5 truncate text-xs font-extrabold text-gray-800">{value}</p></div>;
}

function priceRange(min: string | null, max: string | null) {
  if (min == null) return "—";
  return min === max ? formatBDT(min) : `${formatBDT(min)}–${formatBDT(max ?? min)}`;
}
