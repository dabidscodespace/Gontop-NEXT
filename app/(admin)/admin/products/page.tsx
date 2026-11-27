import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowDownUp,
  CheckCircle2,
  Copy,
  Download,
  EyeOff,
  FileText,
  ImageOff,
  Package,
  Plus,
  Star,
  ExternalLink,
  Pencil,
} from "lucide-react";

import { BulkForm, SelectAll } from "@/components/admin/bulk-form";
import {
  btnPrimary,
  btnSecondary,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  selectCls,
  SearchBar,
  StatCard,
  tdCls,
  thCls,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { RowAction } from "@/components/admin/row-action";
import { availableLifecycleOps } from "@/lib/catalog-rules";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { listCategoriesAdmin, listGamesAdmin, listProductsAdmin } from "@/lib/services/admin-catalog";
import {
  bulkUpdateProductsAction,
  duplicateProductAction,
  productLifecycleAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-amber-50 text-amber-700 ring-amber-600/20",
  archived: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const AVAILABILITY_STYLES: Record<string, string> = {
  available: "bg-sky-50 text-sky-700 ring-sky-600/20",
  unavailable: "bg-orange-50 text-orange-700 ring-orange-600/20",
  disabled: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const BULK_ACTIONS = [
  { value: "publish", label: "Publish" },
  { value: "draft", label: "Move to draft" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore to draft" },
  { value: "enable", label: "Enable (sell)" },
  { value: "disable", label: "Disable (hide sales)" },
  { value: "mark_available", label: "Mark available" },
  { value: "mark_unavailable", label: "Mark unavailable" },
  { value: "feature", label: "Feature" },
  { value: "unfeature", label: "Unfeature" },
  { value: "delete", label: "Delete permanently", danger: true },
];

const CATEGORY_ACTIONS = [
  { value: "category_add", label: "Add to category…" },
  { value: "category_remove", label: "Remove from category…" },
];

const SORTABLE: Array<{ key: string; label: string; className?: string }> = [
  { key: "name", label: "Product" },
  { key: "sku", label: "SKU", className: "hidden xl:table-cell" },
  { key: "game", label: "Game", className: "hidden lg:table-cell" },
  { key: "type", label: "Type", className: "hidden lg:table-cell" },
  { key: "packages", label: "Packages" },
  { key: "price", label: "Price" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
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
  }>;
}) {
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
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  const query = (overrides: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    return `/admin/products?${search.toString()}`;
  };

  const { summary } = result;
  const gameNames = new Map(games.map((game) => [game.id, game.name]));
  const topLevelGames = games.filter((game) => !game.parentId);
  const variantGames = games.filter((game) => game.parentId);
  const assignableCategories = categories.filter((category) => category.layout === "products");
  const bulkActions = [
    ...BULK_ACTIONS,
    ...(assignableCategories.length ? CATEGORY_ACTIONS : []),
  ];

  const sortHeader = (key: string, label: string, className?: string) => {
    const active = (params.sort ?? "sort") === key;
    const nextDir = active && params.dir !== "desc" ? "desc" : "asc";
    return (
      <th key={key} className={`${thCls} ${className ?? ""}`}>
        <Link
          href={query({ sort: key, dir: nextDir, page: undefined })}
          className="inline-flex items-center gap-1 hover:text-gray-900"
        >
          {label}
          <ArrowDownUp className={`h-3 w-3 ${active ? "text-orange-600" : "text-gray-300"}`} />
          {active && <span className="sr-only">{params.dir === "desc" ? "descending" : "ascending"}</span>}
        </Link>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalogue operations"
        title="Products"
        description="Publication and sales availability are managed separately. Only published, available products on live games reach customers."
        actions={
          <>
            <a href="/api/admin/export/products" className={btnSecondary}>
              <Download className="h-4 w-4" /> Export CSV
            </a>
            <Link href="/admin/products/new" className={btnPrimary}>
              <Plus className="h-4 w-4" /> New product
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All products" value={summary.total} icon={Package} href="/admin/products" />
        <StatCard label="Published" value={summary.published} icon={CheckCircle2} tone="emerald" href={query({ status: "published", page: undefined })} />
        <StatCard label="Draft" value={summary.draft} icon={FileText} tone="amber" href={query({ status: "draft", page: undefined })} />
        <StatCard label="Archived" value={summary.archived} icon={Archive} tone="slate" href={query({ status: "archived", page: undefined })} />
        <StatCard label="Disabled" value={summary.disabled} icon={EyeOff} tone="slate" href={query({ availability: "disabled", page: undefined })} />
        <StatCard label="Unavailable" value={summary.unavailable} icon={AlertTriangle} tone="amber" href={query({ availability: "unavailable", page: undefined })} />
      </div>

      <SearchBar
        defaultValue={params.q}
        placeholder="Search name, slug, SKU, package SKU, game or variant"
        resetHref={Object.values(params).some(Boolean) ? "/admin/products" : undefined}
      >
        <select name="game" defaultValue={params.game ?? ""} className={`${selectCls} h-10 w-auto min-w-36`}>
          <option value="">All games</option>
          {topLevelGames.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
        <select name="variant" defaultValue={params.variant ?? ""} className={`${selectCls} h-10 w-auto min-w-40`}>
          <option value="">All variants</option>
          {variantGames.map((game) => (
            <option key={game.id} value={game.id}>
              {gameNames.get(game.parentId ?? 0) ?? "Game"} · {game.region || game.name}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={params.category ?? ""} className={`${selectCls} h-10 w-auto min-w-36`}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className={`${selectCls} h-10 w-auto min-w-36`}>
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          name="availability"
          defaultValue={params.availability ?? ""}
          className={`${selectCls} h-10 w-auto min-w-36`}
        >
          <option value="">Any availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="disabled">Disabled</option>
        </select>
        <select name="type" defaultValue={params.type ?? ""} className={`${selectCls} h-10 w-auto min-w-32`}>
          <option value="">Any type</option>
          <option value="simple">Simple</option>
          <option value="variable">Variable</option>
        </select>
      </SearchBar>

      <BulkForm action={bulkUpdateProductsAction} actions={bulkActions} categories={assignableCategories}>
        <Card className="overflow-hidden p-0">
          {result.rows.length === 0 ? (
            <EmptyState
              icon={Package}
              title={result.total === 0 && !Object.values(params).some(Boolean) ? "No products yet" : "No products match"}
              description={
                result.total === 0 && !Object.values(params).some(Boolean)
                  ? "Create a product to start selling."
                  : "Try a different search or clear the filters."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead className="border-b border-gray-100 bg-gray-50/70">
                    <tr>
                      <th className={`${thCls} w-10`}>
                        <SelectAll />
                      </th>
                      <th className={thCls}>Image</th>
                      {sortHeader("name", "Product")}
                      {sortHeader("sku", "SKU", "hidden xl:table-cell")}
                      {sortHeader("game", "Game", "hidden lg:table-cell")}
                      <th className={`${thCls} hidden lg:table-cell`}>Variant</th>
                      {sortHeader("type", "Type", "hidden lg:table-cell")}
                      {sortHeader("packages", "Packages")}
                      {sortHeader("price", "Price")}
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Readiness</th>
                      <th className={`${thCls} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.rows.map((product) => {
                      const ops = availableLifecycleOps({ status: product.status, availability: product.availability });
                      const missing = product.readiness?.missing ?? [];
                      return (
                        <tr key={product.id} className="hover:bg-orange-50/30">
                          <td className={tdCls}>
                            <input
                              type="checkbox"
                              name="ids"
                              value={product.id}
                              aria-label={`Select ${product.name}`}
                              className="h-4 w-4 rounded border-gray-300 text-orange-600"
                            />
                          </td>
                          <td className={tdCls}>
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                              {product.image ? (
                                <Image src={product.image} alt="" fill sizes="40px" className="object-cover" />
                              ) : (
                                <ImageOff className="m-auto h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className={tdCls}>
                            <Link href={`/admin/products/${product.id}`} className="font-semibold text-gray-900 hover:text-orange-700">
                              {product.name}
                            </Link>
                            {product.isFeatured && <Star className="ml-1 inline h-3.5 w-3.5 text-amber-500" />}
                            <div className="text-xs text-gray-500">/{product.slug}</div>
                          </td>
                          <td className={`${tdCls} hidden font-mono text-xs xl:table-cell`}>{product.sku ?? "—"}</td>
                          <td className={`${tdCls} hidden lg:table-cell`}>{product.parentGameName ?? product.gameName}</td>
                          <td className={`${tdCls} hidden lg:table-cell`}>
                            {product.gameParentId ? product.gameRegion || product.gameName : "—"}
                          </td>
                          <td className={`${tdCls} hidden lg:table-cell capitalize`}>{product.productType}</td>
                          <td className={tdCls}>
                            <span className="font-semibold text-gray-900">{product.publishedVariationCount}</span>
                            <span className="text-gray-500"> / {product.variationCount} live</span>
                          </td>
                          <td className={`${tdCls} whitespace-nowrap`}>
                            {product.minPrice == null
                              ? "—"
                              : product.minPrice === product.maxPrice
                                ? formatBDT(product.minPrice)
                                : `${formatBDT(product.minPrice)} – ${formatBDT(product.maxPrice ?? product.minPrice)}`}
                          </td>
                          <td className={tdCls}>
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[product.status] ?? ""}`}>
                                {product.status}
                              </span>
                              {product.availability !== "available" && (
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${AVAILABILITY_STYLES[product.availability] ?? ""}`}>
                                  {product.availability}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${tdCls} max-w-64`}>
                            {product.readiness === null ? (
                              <span className="text-xs text-gray-400">Archived</span>
                            ) : product.readiness.ready ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready to publish
                              </span>
                            ) : (
                              <ul className="space-y-0.5 text-xs text-amber-700" title={missing.join(" ")}>
                                {missing.slice(0, 2).map((item) => (
                                  <li key={item}>• {item}</li>
                                ))}
                                {missing.length > 2 && <li className="text-gray-500">+{missing.length - 2} more</li>}
                              </ul>
                            )}
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <div className="flex flex-wrap items-start justify-end gap-2">
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Link>
                              {product.status === "published" ? (
                                <a
                                  href={`/product/${product.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> View
                                </a>
                              ) : (
                                <span className="px-2 py-1 text-xs text-gray-400" title="Only published products have a storefront page">
                                  Not live
                                </span>
                              )}
                              <RowAction
                                action={duplicateProductAction}
                                fields={{ id: String(product.id) }}
                                label="Duplicate"
                                icon="copy"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              />
                              {ops.includes("archive") && (
                                <RowAction
                                  action={productLifecycleAction}
                                  fields={{ id: String(product.id), op: "archive" }}
                                  label="Archive"
                                  icon="archive"
                                  confirm={`Archive "${product.name}"? It will leave the storefront.`}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                <span>
                  {result.total} product{result.total === 1 ? "" : "s"} · page {result.page} of {pageCount}
                </span>
                <Pagination page={result.page} pageCount={pageCount} buildHref={(page) => query({ page: String(page) })} />
              </div>
            </>
          )}
        </Card>
      </BulkForm>
    </div>
  );
}
