import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  ExternalLink,
  FileText,
  Layers3,
  ListChecks,
  PackagePlus,
  Plus,
  Settings2,
  Sparkles,
  Tag,
  UserRound,
  Zap,
} from "lucide-react";

import {
  bulkCreateVariationsAction,
  bulkUpdateVariationsAction,
  deleteVariationAction,
  duplicateVariationAction,
  productLifecycleAction,
  saveProductAction,
  saveVariationAction,
  variationLifecycleAction,
} from "@/app/(admin)/admin/actions";
import { ActionForm } from "@/components/action-form";
import { EditorTabs, type EditorTab } from "@/components/admin/editor-tabs";
import { FieldsEditor } from "@/components/admin/fields-editor";
import { LifecycleActions } from "@/components/admin/lifecycle-actions";
import { RowAction } from "@/components/admin/row-action";
import {
  btnOnDark,
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageIdentity,
  selectCls,
  textareaCls,
} from "@/components/admin/ui";
import { VariationBulkForm } from "@/components/admin/variation-bulk-form";
import { VariationFieldsOverride } from "@/components/admin/variation-fields-override";
import { ImageField } from "@/components/image-field";
import { availableLifecycleOps } from "@/lib/catalog-rules";
import type { ProductField } from "@/db/schema";
import { formatBDT } from "@/lib/money";
import type {
  getProductAdmin,
  listCategoriesAdmin,
  listGamesAdmin,
  listTopupMethodsAdmin,
} from "@/lib/services/admin-catalog";
import { cn } from "@/lib/utils";

type Games = Awaited<ReturnType<typeof listGamesAdmin>>;
type TopupMethods = Awaited<ReturnType<typeof listTopupMethodsAdmin>>;
type Categories = Awaited<ReturnType<typeof listCategoriesAdmin>>;
type ProductData = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;
type Variation = ProductData["variations"][number];

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

const PRODUCT_SECTION_TABS: EditorTab[] = [
  { id: "content", label: "Content" },
  { id: "organization", label: "Organization" },
  { id: "customer", label: "Customer input" },
  { id: "operations", label: "Operations" },
];

const PACKAGE_SECTION_TABS: EditorTab[] = [
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "inventory", label: "Inventory" },
  { id: "customer", label: "Customer input" },
  { id: "content", label: "Content" },
];

export function ProductEditor({
  games,
  topupMethods,
  categories,
  product,
  editingVariationId,
  initialTab,
}: {
  games: Games;
  topupMethods: TopupMethods;
  categories: Categories;
  product: ProductData | null;
  editingVariationId?: number;
  initialTab?: string;
}) {
  const record = product?.product;
  const explicitVariation = product?.variations.find((variation) => variation.id === editingVariationId);
  const editingVariation = explicitVariation ?? (record?.productType === "simple" ? product?.variations[0] : undefined);
  const placements = new Map(product?.categories.map((placement) => [placement.id, placement.sortOrder]) ?? []);
  const assignableCategories = categories.filter((category) => category.layout === "products");
  const gameNames = new Map(games.map((game) => [game.id, game.name]));
  const currentMethod = topupMethods.find((method) => method.id === record?.topupMethodId);
  const requestedWorkspaceTab = initialTab === "product" || initialTab === "packages" ? initialTab : undefined;
  const workspaceTab = product && (requestedWorkspaceTab === "packages" || (!requestedWorkspaceTab && editingVariationId)) ? "packages" : "product";
  const workspaceTabs: EditorTab[] = [
    { id: "product", label: "Product" },
    { id: "packages", label: "Packages", count: product?.variations.length ?? 0, disabled: !product },
  ];

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow={record ? "Product studio" : "New catalogue entry"}
        back={{ href: "/admin/products", label: "Back to products" }}
        title={record?.name ?? "Create product"}
        description={record ? "Edit the storefront story, package architecture and fulfilment rules in one product-focused studio." : "Define the customer-facing offer first; packages and pricing unlock after the product is saved."}
        icon={PackagePlus}
        tone="indigo"
        signal={record ? `${record.status} · ${record.availability}` : "Unsaved draft"}
        actions={record?.status === "published" ? (
          <a href={`/product/${record.slug}`} target="_blank" rel="noreferrer" className={btnOnDark}>
            <ExternalLink className="h-4 w-4" /> View on store
          </a>
        ) : undefined}
      />

      {record && (
        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge value={record.status} />
              <StateBadge value={record.availability} availability />
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600">{record.productType}</span>
            </div>
            <LifecycleActions
              key={`${record.status}-${record.availability}`}
              action={productLifecycleAction}
              id={record.id}
              ops={availableLifecycleOps({ status: record.status, availability: record.availability })}
              compact
            />
          </div>
        </Card>
      )}

      <EditorTabs
        key={workspaceTab}
        idPrefix="workspace"
        tabs={workspaceTabs}
        initialTab={workspaceTab}
        ariaLabel="Product workspace"
        syncQuery
      >
        <ProductForm
          games={games}
          topupMethods={topupMethods}
          assignableCategories={assignableCategories}
          gameNames={gameNames}
          placements={placements}
          product={product}
        />
        {product ? (
          <PackageWorkspace
            product={product}
            topupMethods={topupMethods}
            currentMethodName={currentMethod?.name}
            editingVariation={editingVariation}
          />
        ) : (
          <Card>
            <EmptyState icon={Layers3} title="Save the product first" description="Packages can be added after the product is created." />
          </Card>
        )}
      </EditorTabs>
    </div>
  );
}

function ProductForm({
  games,
  topupMethods,
  assignableCategories,
  gameNames,
  placements,
  product,
}: {
  games: Games;
  topupMethods: TopupMethods;
  assignableCategories: Categories;
  gameNames: Map<number, string>;
  placements: Map<number, number>;
  product: ProductData | null;
}) {
  const record = product?.product;

  return (
    <ActionForm
      action={saveProductAction}
      submitLabel={record ? "Save product" : "Create product"}
      className="space-y-5"
      submitAside={<Link href="/admin/products" className="text-sm font-bold text-gray-500 transition hover:text-gray-950">Cancel</Link>}
      submitAreaClassName="sticky bottom-3 z-20 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-[0_16px_40px_rgba(16,24,40,0.14)] backdrop-blur"
      buttonClassName="min-w-36"
    >
      {record && <input type="hidden" name="id" value={record.id} />}

      <EditorTabs idPrefix="product-sections" tabs={PRODUCT_SECTION_TABS} initialTab="content" ariaLabel="Product sections" compact>
        <Card title="Storefront content" icon={FileText}>
          <div className="space-y-5">
            <Field label="Product name">
              <input name="name" defaultValue={record?.name ?? ""} required placeholder="e.g. Mobile Legends Diamonds" className={inputCls} />
            </Field>
            <Field label="Short description">
              <textarea name="shortDescription" defaultValue={record?.shortDescription ?? ""} rows={2} maxLength={500} className={textareaCls} />
            </Field>
            <ImageField label="Product image" name="image" defaultValue={record?.image ?? ""} />
            <Field label="Description" hint="HTML is supported.">
              <textarea name="description" defaultValue={record?.description ?? ""} rows={7} className={textareaCls} />
            </Field>
          </div>
        </Card>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card title="Organization" icon={Settings2}>
            <div className="space-y-4">
              <Field label="Game or regional variant">
                <select name="gameId" defaultValue={record?.gameId ?? ""} required className={selectCls}>
                  <option value="">Choose a game</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.parentId ? `${gameNames.get(game.parentId) ?? "Game"} — ${game.region || game.name}` : game.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product type" hint="Simple allows one package; variable allows several.">
                <select name="productType" defaultValue={record?.productType ?? "variable"} className={selectCls}>
                  <option value="variable">Variable</option>
                  <option value="simple">Simple</option>
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU">
                  <input name="sku" defaultValue={record?.sku ?? ""} className={inputCls} />
                </Field>
                <Field label="Display order">
                  <input name="sortOrder" type="number" min={-9999} max={9999} defaultValue={String(record?.sortOrder ?? 0)} className={inputCls} />
                </Field>
              </div>
              <Field label="URL slug" hint="Leave blank on a new product to generate it automatically.">
                <input name="slug" defaultValue={record?.slug ?? ""} placeholder="mobile-legends-diamonds" className={`${inputCls} font-mono text-xs`} />
              </Field>
            </div>
          </Card>

          <Card title="Categories" icon={Tag}>
            {assignableCategories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">No product categories available.</p>
            ) : (
              <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                {assignableCategories.map((category) => (
                  <label key={category.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 transition hover:border-orange-200 hover:bg-orange-50/30">
                    <input type="checkbox" name="categoryIds" value={category.id} defaultChecked={placements.has(category.id)} className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#f96000]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">{category.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order</span>
                    <input type="number" name={`categorySort_${category.id}`} defaultValue={String(placements.get(category.id) ?? 0)} min={-9999} max={9999} aria-label={`${category.name} display order`} className="h-9 w-16 rounded-lg border border-gray-200 bg-white px-2 text-center text-xs font-bold outline-none focus:border-accent-orange" />
                  </label>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Customer setup" icon={UserRound}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default top-up method">
                <select name="topupMethodId" defaultValue={record?.topupMethodId ?? ""} className={selectCls}>
                  <option value="">No default method</option>
                  {topupMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                </select>
              </Field>
              <Field label="Customer instructions">
                <textarea name="instructions" rows={4} maxLength={5000} defaultValue={record?.instructions ?? ""} className={textareaCls} />
              </Field>
            </div>
          </Card>
          <Card>
            <FieldsEditor initial={(record?.fields as ProductField[] | undefined) ?? []} />
          </Card>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card title="Fulfillment" icon={Zap}>
            <Field label="Internal fulfillment notes" hint="Only staff can see these notes.">
              <textarea name="fulfillmentNotes" rows={7} maxLength={2000} defaultValue={record?.fulfillmentNotes ?? ""} className={textareaCls} />
            </Field>
          </Card>

          <Card title="Visibility" icon={Sparkles}>
            <div className="divide-y divide-gray-100">
              <ToggleRow name="isActive" title="Sales enabled" description="Disable this product without archiving it." defaultChecked={record ? record.availability !== "disabled" : true} />
              <ToggleRow name="isFeatured" title="Featured product" description="Prioritize it in featured placements." defaultChecked={Boolean(record?.isFeatured)} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <span className="text-xs font-bold text-gray-500">Publishing status</span>
              <StateBadge value={record?.status ?? "draft"} />
            </div>
          </Card>
        </div>
      </EditorTabs>
    </ActionForm>
  );
}

function ToggleRow({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span>
        <span className="block text-sm font-bold text-gray-800">{title}</span>
        <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange peer-focus-visible:ring-4 peer-focus-visible:ring-orange-100" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function StateBadge({ value, availability = false }: { value: string; availability?: boolean }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset", availability ? AVAILABILITY_STYLES[value] : STATUS_STYLES[value])}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function PackageWorkspace({
  product,
  topupMethods,
  currentMethodName,
  editingVariation,
}: {
  product: ProductData;
  topupMethods: TopupMethods;
  currentMethodName?: string;
  editingVariation?: Variation;
}) {
  const { product: record, variations } = product;
  const publishedCount = variations.filter((variation) => variation.status === "published").length;
  const unavailableCount = variations.filter((variation) => variation.availability !== "available" || variation.stockStatus === "outofstock").length;
  const canAdd = record.productType === "variable" || variations.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-gray-950"><Boxes className="h-5 w-5 text-accent-orange" /> Packages</h2>
          <p className="mt-1 text-xs font-semibold text-gray-500">{publishedCount} published · {unavailableCount} need attention</p>
        </div>
        {canAdd && editingVariation && (
          <Link href={`/admin/products/${record.id}?tab=packages`} className={btnSecondary}><Plus className="h-4 w-4" /> New package</Link>
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <Card padded={false} className="min-w-0 overflow-hidden" title="Package library" icon={ListChecks}>
          <VariationBulkForm key={variations.map((variation) => variation.id).join("-")} action={bulkUpdateVariationsAction} productId={record.id} total={variations.length}>
            {variations.length === 0 ? (
              <EmptyState icon={PackagePlus} title="No packages" description="Add the first package using the form." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {variations.map((variation) => {
                  const selected = editingVariation?.id === variation.id;
                  const packageName = cleanPackageName(variation.name);
                  return (
                    <li key={variation.id} className={cn("group flex items-start gap-3 p-4 transition", selected ? "bg-orange-50/70" : "hover:bg-gray-50/80")}>
                      <input type="checkbox" name="ids" value={variation.id} aria-label={`Select ${packageName}`} className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#f96000]" />
                      <Link href={`/admin/products/${record.id}?tab=packages&variation=${variation.id}`} className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-gray-900 transition group-hover:text-accent-orange">{packageName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-400">{variation.sku || `Package #${variation.id}`}</p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-gray-950">{formatBDT(variation.price)}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StateBadge value={variation.status} />
                          {variation.availability !== "available" && <StateBadge value={variation.availability} availability />}
                          <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", variation.stockStatus === "instock" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                            {variation.stockStatus === "instock" ? variation.stockQuantity === null ? "In stock" : `${variation.stockQuantity} in stock` : "Out of stock"}
                          </span>
                        </div>
                      </Link>
                      <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 transition", selected ? "text-accent-orange" : "text-gray-300 group-hover:text-gray-500")} />
                    </li>
                  );
                })}
              </ul>
            )}
          </VariationBulkForm>
        </Card>

        <div className="min-w-0">
          {!canAdd && !editingVariation ? (
            <Card>
              <EmptyState icon={AlertTriangle} title="One package allowed" description="Select the existing package or change the product type to variable." />
            </Card>
          ) : (
            <PackageEditor
              key={editingVariation?.id ?? `new-${variations.length}`}
              product={product}
              topupMethods={topupMethods}
              currentMethodName={currentMethodName}
              variation={editingVariation}
            />
          )}
        </div>
      </div>

      {record.productType === "variable" && (
        <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <span className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><PackagePlus className="h-4 w-4 text-accent-orange" /> Add many packages</span>
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-500 group-open:bg-orange-50 group-open:text-accent-orange">Bulk create</span>
          </summary>
          <div className="border-t border-gray-100 bg-gray-50/50 p-5">
            <ActionForm action={bulkCreateVariationsAction} submitLabel="Create draft packages" className="space-y-3">
              <input type="hidden" name="productId" value={record.id} />
              <Field label="Package lines" hint="Name | price | compare-at price (optional), one package per line.">
                <textarea name="lines" rows={7} required placeholder={"86 Diamonds | 79 | 89\n172 Diamonds | 149 | 169\n257 Diamonds | 219"} className={`${textareaCls} font-mono text-xs`} />
              </Field>
            </ActionForm>
          </div>
        </details>
      )}
    </section>
  );
}

function PackageEditor({
  product,
  topupMethods,
  currentMethodName,
  variation,
}: {
  product: ProductData;
  topupMethods: TopupMethods;
  currentMethodName?: string;
  variation?: Variation;
}) {
  const record = product.product;
  const packageName = variation ? cleanPackageName(variation.name) : "New package";
  const title = <span className="block max-w-[min(52vw,520px)] truncate" title={packageName}>{packageName}</span>;

  return (
    <Card
      padded={false}
      className="overflow-hidden"
      title={title}
      icon={variation ? Settings2 : Plus}
      actions={variation ? (
        <div className="flex items-center gap-1">
          {record.productType === "variable" && (
            <RowAction action={duplicateVariationAction} fields={{ id: String(variation.id), productId: String(record.id) }} label="Duplicate package" icon="copy" iconOnly className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50" />
          )}
          <RowAction action={deleteVariationAction} fields={{ id: String(variation.id), productId: String(record.id) }} label="Delete package" icon="trash" iconOnly confirm={`Delete "${packageName}"? This cannot be undone.`} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50" />
        </div>
      ) : undefined}
    >
      {variation && (
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5"><StateBadge value={variation.status} /><StateBadge value={variation.availability} availability /></div>
          <LifecycleActions key={`${variation.status}-${variation.availability}`} action={variationLifecycleAction} id={variation.id} ops={availableLifecycleOps({ status: variation.status, availability: variation.availability })} compact />
        </div>
      )}

      <ActionForm
        action={saveVariationAction}
        submitLabel={variation ? "Save package" : "Add package"}
        buttonClassName="min-w-36"
        submitAreaClassName="!mt-0 border-t border-gray-100 bg-gray-50/60 px-5 py-4"
      >
        <input type="hidden" name="productId" value={record.id} />
        {variation && <input type="hidden" name="id" value={variation.id} />}

        <EditorTabs
          idPrefix={`package-${variation?.id ?? "new"}`}
          tabs={PACKAGE_SECTION_TABS}
          initialTab="details"
          ariaLabel="Package sections"
          compact
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Package name">
                <input name="name" defaultValue={variation ? cleanPackageName(variation.name) : ""} placeholder="e.g. 86 Diamonds" required className={inputCls} />
              </Field>
            </div>
            <Field label="SKU">
              <input name="sku" defaultValue={variation?.sku ?? ""} className={inputCls} />
            </Field>
            <Field label="Display order">
              <input name="sortOrder" type="number" min={-9999} max={9999} defaultValue={String(variation?.sortOrder ?? product.variations.length)} className={inputCls} />
            </Field>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Selling price (৳)">
              <input name="price" type="number" step="0.01" min={0} required defaultValue={variation?.price ?? ""} className={inputCls} />
            </Field>
            <Field label="Compare-at price (৳)">
              <input name="compareAtPrice" type="number" step="0.01" min={0} defaultValue={variation?.compareAtPrice ?? ""} className={inputCls} />
            </Field>
            <Field label="Sale starts">
              <input name="saleStartsAt" type="datetime-local" defaultValue={toDateTimeLocal(variation?.saleStartsAt)} className={inputCls} />
            </Field>
            <Field label="Sale ends">
              <input name="saleEndsAt" type="datetime-local" defaultValue={toDateTimeLocal(variation?.saleEndsAt)} className={inputCls} />
            </Field>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stock status">
                <select name="stockStatus" defaultValue={variation?.stockStatus ?? "instock"} className={selectCls}>
                  <option value="instock">In stock</option>
                  <option value="outofstock">Out of stock</option>
                </select>
              </Field>
              <Field label="Stock quantity" hint="Blank means unlimited.">
                <input name="stockQuantity" type="number" min={0} defaultValue={variation?.stockQuantity ?? ""} className={inputCls} />
              </Field>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <ToggleRow name="isActive" title="Sales enabled" description="Disable this package without changing its status." defaultChecked={variation ? variation.availability !== "disabled" : true} />
            </div>
          </div>

          <div className="space-y-4 p-5">
            <Field label="Top-up method">
              <select name="topupMethodId" defaultValue={variation?.topupMethodId ?? ""} className={selectCls}>
                <option value="">Use product default{currentMethodName ? ` — ${currentMethodName}` : ""}</option>
                {topupMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </Field>
            <VariationFieldsOverride key={variation?.id ?? "new"} initial={(variation?.fields as ProductField[] | null | undefined) ?? null} />
          </div>

          <div className="space-y-4 p-5">
            <ImageField label="Package image" name="image" defaultValue={variation?.image ?? ""} hint="Blank uses the product image." />
            <Field label="Description">
              <textarea name="description" defaultValue={variation?.description ?? ""} rows={4} className={textareaCls} />
            </Field>
          </div>
        </EditorTabs>
      </ActionForm>
    </Card>
  );
}

/** Removes accidental generated hash suffixes from imported package names. */
function cleanPackageName(value: string) {
  const trimmed = value.trim();
  const cleaned = trimmed.replace(/[-_][a-f0-9]{48,}$/i, "").replace(/[-_]+$/, "").trim();
  return cleaned || trimmed;
}

function toDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
