import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  tdCls,
  thCls,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listCategoriesAdmin, listGamesAdmin, listProductOptions } from "@/lib/services/admin-catalog";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "categories.manage")) return <NoAccess />;

  const [{ edit }, categories, games, products] = await Promise.all([
    searchParams,
    listCategoriesAdmin(),
    listGamesAdmin(),
    listProductOptions(),
  ]);
  const editing = edit ? categories.find((category) => category.id === Number(edit)) : null;
  const gameName = new Map(games.map((game) => [game.id, game.name]));
  const productName = new Map(products.map((product) => [product.id, product.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Storefront merchandising"
        title="Categories"
        description="Homepage sections. Popular Games cards open a game’s variants; product sections link straight to each product page."
        actions={
          editing ? (
            <Link href="/admin/categories" className={btnSecondary}>
              <Plus className="h-4 w-4" /> New category
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card padded={false} title="All categories" icon={LayoutGrid}>
          {categories.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={LayoutGrid}
                title="No categories yet"
                description="Create a category such as Popular Games and add the games you want in it."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-b border-gray-100 bg-gray-50/70">
                  <tr>
                    <th className={thCls}>Category</th>
                    <th className={thCls}>Shows</th>
                    <th className={thCls}>Order</th>
                    <th className={thCls}>Status</th>
                    <th className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className={editing?.id === category.id ? "bg-orange-50/60" : "hover:bg-gray-50/70"}
                    >
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                            {category.image ? (
                              <img src={category.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <LayoutGrid className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-primary">{category.name}</p>
                            <p className="text-xs text-gray-500">/{category.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {category.layout === "products" ? (
                          category.productIds.length === 0 ? (
                            <span className="text-sm text-gray-400">No products</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {category.productIds.map((id) => (
                                <span
                                  key={id}
                                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700"
                                >
                                  {productName.get(id) ?? "Removed product"}
                                </span>
                              ))}
                            </div>
                          )
                        ) : category.gameIds.length === 0 ? (
                          <span className="text-sm text-gray-400">No games</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {category.gameIds.map((id) => (
                              <span
                                key={id}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700"
                              >
                                {gameName.get(id) ?? "Removed game"}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={tdCls}>{category.sortOrder}</td>
                      <td className={tdCls}>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                            category.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-gray-100 text-gray-500 ring-gray-200"
                          }`}
                        >
                          {category.isActive ? "Live" : "Hidden"}
                        </span>
                        {category.isActive && !category.showOnHome && (
                          <p className="mt-1 text-xs text-gray-500">Not on homepage</p>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/categories?edit=${category.id}`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary"
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <ActionForm
                            action={deleteCategoryAction}
                            submitLabel="Delete"
                            confirm={`Delete the ${category.name} category? Games are not deleted.`}
                            hideButton
                          >
                            <input type="hidden" name="id" value={category.id} />
                            <button
                              type="submit"
                              className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </ActionForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={editing ? "Edit category" : "Add category"} icon={Plus}>
          <ActionForm
            action={saveCategoryAction}
            submitLabel={editing ? "Save category" : "Create category"}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="Name">
              <input
                name="name"
                defaultValue={editing?.name ?? "Popular Games"}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Slug" hint="Leave blank to generate from the name.">
              <input name="slug" defaultValue={editing?.slug} placeholder="popular-games" className={inputCls} />
            </Field>
            <ImageField label="Tile image" name="image" defaultValue={editing?.image ?? ""} />
            <Field
              label="Card type"
              hint="Games open the game's variant list. Products link straight to the product page."
            >
              <select name="layout" defaultValue={editing?.layout ?? "parent_games"} className={inputCls}>
                <option value="parent_games">Games (variant list)</option>
                <option value="products">Products (direct link)</option>
              </select>
            </Field>
            <Field label="Games (for Games card type)">
              {games.length === 0 ? (
                <p className="text-sm text-gray-500">Create games first on the Games page.</p>
              ) : (
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {games.map((game) => (
                    <label
                      key={game.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-primary hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        name="gameIds"
                        value={game.id}
                        defaultChecked={editing?.gameIds.includes(game.id) ?? false}
                        className="h-4 w-4 accent-orange-500"
                      />
                      {game.name}
                      {!game.isActive && <span className="text-xs font-normal text-gray-400">(disabled)</span>}
                    </label>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Products (for Products card type)">
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">Create products first.</p>
              ) : (
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-primary hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        name="productIds"
                        value={product.id}
                        defaultChecked={editing?.productIds.includes(product.id) ?? false}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <span>
                        {product.name}
                        <span className="ml-2 text-xs font-normal text-gray-400">{product.gameName}</span>
                      </span>
                      {product.availability === "disabled" && <span className="text-xs font-normal text-gray-400">(disabled)</span>}
                    </label>
                  ))}
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Display order">
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={String(editing?.sortOrder ?? 0)}
                  className={inputCls}
                />
              </Field>
              <Field label="Game limit" hint="0 shows every assigned game.">
                <input
                  name="gameLimit"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={String(editing?.gameLimit ?? 0)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing ? editing.isActive : true}
                  className="h-4 w-4 accent-orange-500"
                />
                Live on site
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  name="showOnHome"
                  defaultChecked={editing ? editing.showOnHome : true}
                  className="h-4 w-4 accent-orange-500"
                />
                Show on homepage
              </label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
