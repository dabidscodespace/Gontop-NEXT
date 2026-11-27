import Link from "next/link";
import { redirect } from "next/navigation";
import { Gamepad2, LayoutGrid, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { GameLibrary } from "@/components/admin/game-library";
import { NoAccess } from "@/components/admin/no-access";
import {
  btnOnDark,
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageIdentity,
} from "@/components/admin/ui";
import { ImageField } from "@/components/image-field";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listCategoriesAdmin, listGamesAdmin, listProductOptions } from "@/lib/services/admin-catalog";
import { cn } from "@/lib/utils";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

type Categories = Awaited<ReturnType<typeof listCategoriesAdmin>>;
type Category = Categories[number];
type Games = Awaited<ReturnType<typeof listGamesAdmin>>;
type Products = Awaited<ReturnType<typeof listProductOptions>>;

type Query = {
  tab?: string;
  view?: string;
  edit?: string;
  editGame?: string;
};

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "categories.manage")) return <NoAccess />;

  const [query, categories, games, products] = await Promise.all([
    searchParams,
    listCategoriesAdmin(),
    listGamesAdmin(),
    listProductOptions(),
  ]);

  const requestedCategory = query.edit ? categories.find((category) => category.id === Number(query.edit)) : null;
  const activeTab = query.tab === "popular" || query.view === "library" || query.editGame || requestedCategory?.layout === "parent_games"
    ? "popular"
    : "categories";
  const popularView = query.view === "library" || query.editGame ? "library" : "section";
  const productCategories = categories.filter((category) => category.layout === "products");
  const popularSections = categories.filter((category) => category.layout === "parent_games");
  const editingProductCategory = activeTab === "categories" && requestedCategory?.layout === "products" ? requestedCategory : null;
  const editingPopularSection = activeTab === "popular"
    ? requestedCategory?.layout === "parent_games"
      ? requestedCategory
      : popularSections.find((category) => category.slug === "popular-games") ?? popularSections[0] ?? null
    : null;

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Storefront taxonomy"
        title="Categories"
        description="Shape how shoppers discover the catalogue. Product sections and the Popular Games experience each keep their own focused editor."
        icon={LayoutGrid}
        tone="amber"
        signal={`${productCategories.length} catalogue sections`}
        actions={<Link href={activeTab === "popular" ? "/admin/categories?tab=popular&view=library" : "/admin/categories"} className={btnOnDark}>{activeTab === "popular" ? <Gamepad2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {activeTab === "popular" ? "Open game library" : "New category"}</Link>}
      />

      <PrimaryTabs active={activeTab} categoryCount={productCategories.length} popularCount={popularSections.length} />

      {activeTab === "categories" ? (
        <ProductCategories
          categories={productCategories}
          products={products}
          editing={editingProductCategory}
        />
      ) : (
        <div className="space-y-5">
          <PopularTabs active={popularView} />
          {popularView === "library" ? (
            <GameLibrary games={games} editingId={query.editGame ? Number(query.editGame) : undefined} />
          ) : (
            <PopularGamesSections
              categories={popularSections}
              games={games}
              editing={editingPopularSection}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PrimaryTabs({ active, categoryCount, popularCount }: { active: string; categoryCount: number; popularCount: number }) {
  return (
    <nav aria-label="Storefront category type" className="sticky top-[72px] z-20 flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
      <TabLink href="/admin/categories" active={active === "categories"} icon={LayoutGrid} label="Product categories" count={categoryCount} />
      <TabLink href="/admin/categories?tab=popular" active={active === "popular"} icon={Sparkles} label="Popular Games" count={popularCount} />
    </nav>
  );
}

function TabLink({ href, active, icon: Icon, label, count }: { href: string; active: boolean; icon: typeof LayoutGrid; label: string; count: number }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition", active ? "bg-gray-950 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950")}>
      <Icon className={cn("h-4 w-4", active && "text-accent-orange")} /> {label}
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black", active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500")}>{count}</span>
    </Link>
  );
}

function PopularTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Popular Games settings" className="flex gap-1 overflow-x-auto border-b border-gray-200">
      <Link href="/admin/categories?tab=popular" className={cn("shrink-0 border-b-2 px-4 py-3 text-xs font-extrabold transition", active === "section" ? "border-accent-orange text-accent-orange" : "border-transparent text-gray-500 hover:text-gray-900")}>Homepage section</Link>
      <Link href="/admin/categories?tab=popular&view=library" className={cn("shrink-0 border-b-2 px-4 py-3 text-xs font-extrabold transition", active === "library" ? "border-accent-orange text-accent-orange" : "border-transparent text-gray-500 hover:text-gray-900")}>Game library & regions</Link>
    </nav>
  );
}

function ProductCategories({ categories, products, editing }: { categories: Categories; products: Products; editing: Category | null | undefined }) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
      <CategoryList
        title="Product categories"
        icon={LayoutGrid}
        categories={categories}
        editingId={editing?.id}
        editHref={(id) => `/admin/categories?edit=${id}`}
        emptyTitle="No product categories"
        itemLabel={(category) => `${category.productIds.length} product${category.productIds.length === 1 ? "" : "s"}`}
        newHref={editing ? "/admin/categories" : undefined}
      />

      <Card title={editing ? "Edit category" : "New category"} icon={editing ? Pencil : Plus}>
        <ActionForm action={saveCategoryAction} submitLabel={editing ? "Save category" : "Create category"} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="layout" value="products" />
          <input type="hidden" name="gameLimit" value="0" />
          <Field label="Name">
            <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} />
          </Field>
          <Field label="Slug" hint="Leave blank to generate it.">
            <input name="slug" defaultValue={editing?.slug ?? ""} className={inputCls} />
          </Field>
          <ImageField label="Category image" name="image" defaultValue={editing?.image ?? ""} />
          <Field label="Products">
            {products.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">No products available.</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                {products.map((product) => (
                  <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition hover:bg-gray-50">
                    <input type="checkbox" name="productIds" value={product.id} defaultChecked={editing?.productIds.includes(product.id) ?? false} className="h-4 w-4 shrink-0 accent-orange-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-gray-800">{product.name}</span>
                      <span className="block truncate text-[11px] text-gray-400">{product.gameName}</span>
                    </span>
                    {product.availability === "disabled" && <span className="text-[10px] font-bold text-gray-400">Disabled</span>}
                  </label>
                ))}
              </div>
            )}
          </Field>
          <CategoryFooterFields editing={editing} showLimit={false} />
        </ActionForm>
      </Card>
    </div>
  );
}

function PopularGamesSections({ categories, games, editing }: { categories: Categories; games: Games; editing: Category | null | undefined }) {
  const topLevelGames = games.filter((game) => game.parentId === null);
  const gameById = new Map(games.map((game) => [game.id, game]));
  const selectedIds = new Set(
    (editing?.gameIds ?? []).map((id) => gameById.get(id)?.parentId ?? id),
  );

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <CategoryList
        title="Popular Games section"
        icon={Sparkles}
        categories={categories}
        editingId={editing?.id}
        editHref={(id) => `/admin/categories?tab=popular&edit=${id}`}
        emptyTitle="Popular Games is not configured"
        itemLabel={(category) => `${category.gameIds.length} game card${category.gameIds.length === 1 ? "" : "s"}`}
      />

      <Card title={editing ? "Edit Popular Games" : "Set up Popular Games"} icon={Sparkles}>
        <ActionForm action={saveCategoryAction} submitLabel={editing ? "Save section" : "Create section"} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="layout" value="parent_games" />
          <input type="hidden" name="image" value={editing?.image ?? ""} />
          <Field label="Section name">
            <input name="name" defaultValue={editing?.name ?? "Popular Games"} required className={inputCls} />
          </Field>
          <Field label="Slug" hint="Leave blank to generate it.">
            <input name="slug" defaultValue={editing?.slug ?? "popular-games"} className={inputCls} />
          </Field>
          <Field label="Game cards">
            {topLevelGames.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
                No game cards yet. <Link href="/admin/categories?tab=popular&view=library" className="font-bold text-accent-orange">Open game library</Link>
              </div>
            ) : (
              <div className="max-h-96 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                {topLevelGames.map((game) => {
                  const regions = games.filter((candidate) => candidate.parentId === game.id);
                  const familyProducts = game.productCount + regions.reduce((total, region) => total + region.productCount, 0);
                  return (
                    <label key={game.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 transition hover:bg-gray-50">
                      <input type="checkbox" name="gameIds" value={game.id} defaultChecked={selectedIds.has(game.id)} className="h-4 w-4 shrink-0 accent-orange-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-800">{game.name}</span>
                        <span className="block text-[11px] text-gray-400">{regions.length} regions · {familyProducts} products</span>
                      </span>
                      {familyProducts > 1 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700">Modal</span>}
                      {!game.isActive && <span className="text-[10px] font-bold text-gray-400">Disabled</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
          <CategoryFooterFields editing={editing} showLimit />
        </ActionForm>
      </Card>
    </div>
  );
}

function CategoryList({
  title,
  icon,
  categories,
  editingId,
  editHref,
  emptyTitle,
  itemLabel,
  newHref,
}: {
  title: string;
  icon: typeof LayoutGrid;
  categories: Categories;
  editingId?: number;
  editHref: (id: number) => string;
  emptyTitle: string;
  itemLabel: (category: Category) => string;
  newHref?: string;
}) {
  return (
    <Card
      padded={false}
      title={title}
      icon={icon}
      actions={newHref ? <Link href={newHref} className={btnSecondary}><Plus className="h-4 w-4" /> New</Link> : undefined}
    >
      {categories.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} description="Use the form to create it." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {categories.map((category) => (
            <li key={category.id} className={cn("flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center", editingId === category.id ? "bg-orange-50/60" : "hover:bg-gray-50/70")}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                  {category.image ? <img src={category.image} alt="" className="h-full w-full object-cover" /> : icon === Sparkles ? <Gamepad2 className="h-4 w-4 text-gray-400" /> : <LayoutGrid className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-gray-950">{category.name}</p>
                  <p className="truncate text-[11px] text-gray-400">/{category.slug} · {itemLabel(category)} · order {category.sortOrder}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <CategoryStatus category={category} />
                <div className="flex items-center gap-0.5">
                  <Link href={editHref(category.id)} aria-label={`Edit ${category.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-accent-orange"><Pencil className="h-4 w-4" /></Link>
                  <ActionForm action={deleteCategoryAction} submitLabel="Delete" confirm={`Delete ${category.name}? Assigned items are not deleted.`} hideButton>
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" aria-label={`Delete ${category.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CategoryStatus({ category }: { category: Category }) {
  if (!category.isActive) return <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">Hidden</span>;
  if (!category.showOnHome) return <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Off homepage</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Live</span>;
}

function CategoryFooterFields({ editing, showLimit }: { editing: Category | null | undefined; showLimit: boolean }) {
  return (
    <>
      <div className={cn("grid gap-4", showLimit && "grid-cols-2")}>
        <Field label="Display order">
          <input name="sortOrder" type="number" defaultValue={String(editing?.sortOrder ?? 0)} className={inputCls} />
        </Field>
        {showLimit && (
          <Field label="Card limit" hint="0 shows all.">
            <input name="gameLimit" type="number" min={0} max={100} defaultValue={String(editing?.gameLimit ?? 0)} className={inputCls} />
          </Field>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="h-4 w-4 accent-orange-500" /> Active
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <input type="checkbox" name="showOnHome" defaultChecked={editing ? editing.showOnHome : true} className="h-4 w-4 accent-orange-500" /> Show on homepage
        </label>
      </div>
    </>
  );
}
