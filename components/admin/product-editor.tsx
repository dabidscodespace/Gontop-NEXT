import Link from "next/link";
import { FileText, Layers, Pencil, Plus, Settings2, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { FieldsEditor } from "@/components/admin/fields-editor";
import { VariationFieldsOverride } from "@/components/admin/variation-fields-override";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  selectCls,
  textareaCls,
} from "@/components/admin/ui";
import { LifecycleActions } from "@/components/admin/lifecycle-actions";
import { ImageField } from "@/components/image-field";
import { availableLifecycleOps } from "@/lib/catalog-rules";
import type { ProductField } from "@/db/schema";
import { formatBDT } from "@/lib/money";
import type { listGamesAdmin, listTopupMethodsAdmin } from "@/lib/services/admin-catalog";
import type { getProductById } from "@/lib/services/catalog";
import {
  deleteVariationAction,
  saveProductAction,
  saveVariationAction,
  variationLifecycleAction,
} from "@/app/(admin)/admin/actions";

type Games = Awaited<ReturnType<typeof listGamesAdmin>>;
type TopupMethods = Awaited<ReturnType<typeof listTopupMethodsAdmin>>;
type ProductData = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

export function ProductEditor({
  games,
  topupMethods,
  product,
  editingVariationId,
}: {
  games: Games;
  topupMethods: TopupMethods;
  product: ProductData | null;
  editingVariationId?: number;
}) {
  const editingVariation = product?.variations.find(
    (variation) => variation.id === editingVariationId,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product workspace"
        back={{ href: "/admin/products", label: "Products" }}
        title={product ? product.product.name : "New product"}
        description={
          product
            ? "Update details, player fields and packages."
            : "Create the product, then add packages to it."
        }
        actions={
          product && (
            <Link href={`/product/${product.product.slug}`} target="_blank" className={btnSecondary}>
              View on store
            </Link>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <ActionForm
            action={saveProductAction}
            submitLabel={product ? "Save changes" : "Create product"}
            className="space-y-6"
          >
            {product && <input type="hidden" name="id" value={product.product.id} />}

            <Card title="Basics" icon={Settings2} description="Where this product appears in the store.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Game">
                  <select
                    name="gameId"
                    defaultValue={product?.product.gameId ?? ""}
                    required
                    className={selectCls}
                  >
                    <option value="">Choose a game</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Name">
                  <input
                    name="name"
                    defaultValue={product?.product.name ?? ""}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="URL slug" hint="Leave blank to generate from the name.">
                  <input name="slug" defaultValue={product?.product.slug ?? ""} className={`${inputCls} font-mono text-xs`} />
                </Field>
                <Field label="SKU">
                  <input name="sku" defaultValue={product?.product.sku ?? ""} className={inputCls} />
                </Field>
                <Field label="Display price (৳)">
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={String(product?.product.price ?? "0")}
                    className={inputCls}
                  />
                </Field>
                <Field label="Display order" hint="Lower numbers appear first.">
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={String(product?.product.sortOrder ?? 0)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Content" icon={FileText} description="Image and copy shown on the product page.">
              <div className="space-y-5">
                <ImageField label="Product image" name="image" defaultValue={product?.product.image ?? ""} />
                <Field label="Short description">
                  <textarea
                    name="shortDescription"
                    defaultValue={product?.product.shortDescription ?? ""}
                    rows={2}
                    className={textareaCls}
                  />
                </Field>
                <Field label="Description" hint="HTML is allowed.">
                  <textarea
                    name="description"
                    defaultValue={product?.product.description ?? ""}
                    rows={6}
                    className={textareaCls}
                  />
                </Field>
              </div>
            </Card>

            <Card
              title="Top-up details"
              description="How customers identify their account for this product. Packages can override the method and fields."
            >
              <div className="space-y-4">
                <Field label="Top-up method" hint="Shown to customers when they pick this product.">
                  <select
                    name="topupMethodId"
                    defaultValue={product?.product.topupMethodId ?? ""}
                    className={selectCls}
                  >
                    <option value="">None</option>
                    {topupMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Instructions" hint="Optional. Shown above the player fields, e.g. where to find the UID.">
                  <textarea
                    name="instructions"
                    rows={3}
                    maxLength={5000}
                    defaultValue={product?.product.instructions ?? ""}
                    className={textareaCls}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <FieldsEditor initial={product?.product.fields ?? []} />
            </Card>

            <Card title="Visibility">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Active on storefront</span>
                  <span className="block text-xs text-gray-500">Hidden products stay in the admin only.</span>
                </span>
                <span className="relative inline-flex h-6 w-11 shrink-0">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={product ? product.product.availability !== "disabled" : true}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>
            </Card>

          </ActionForm>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          {!product ? (
            <Card>
              <EmptyState
                icon={Layers}
                title="Packages come next"
                description="Save the product first, then add its packages here."
              />
            </Card>
          ) : (
            <>
              <Card
                title={`Packages`}
                icon={Layers}
                description={`${product.variations.length} package(s) for this product`}
                padded={false}
                actions={
                  editingVariation && (
                    <Link
                      href={`/admin/products/${product.product.id}`}
                      className="shrink-0 rounded-lg bg-accent-orange/10 px-2.5 py-1 text-xs font-semibold text-accent-orange"
                    >
                      + New
                    </Link>
                  )
                }
              >
                <ul className="divide-y divide-gray-100">
                  {product.variations.map((variation) => (
                    <li
                      key={variation.id}
                      className={`flex items-center gap-3 px-5 py-3 ${
                        editingVariation?.id === variation.id ? "bg-orange-50/60" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{variation.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {formatBDT(variation.price)}
                          {variation.stockQuantity !== null ? ` · ${variation.stockQuantity} left` : ""}
                          {variation.availability === "disabled" ? " · hidden" : ""}
                        </p>
                        <div className="mt-1">
                          <LifecycleActions
                            action={variationLifecycleAction}
                            id={variation.id}
                            ops={availableLifecycleOps({ status: variation.status, availability: variation.availability })}
                          />
                        </div>
                      </div>
                      <Link
                        href={`/admin/products/${product.product.id}?variation=${variation.id}`}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-accent-orange"
                        aria-label="Edit package"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <ActionForm action={deleteVariationAction} submitLabel="Delete" confirm={`Delete package ${variation.name}?`} hideButton>
                        <input type="hidden" name="id" value={variation.id} />
                        <input type="hidden" name="productId" value={product.product.id} />
                        <button
                          type="submit"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete package"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </ActionForm>
                    </li>
                  ))}
                </ul>
                {product.variations.length === 0 && (
                  <EmptyState icon={Layers} title="No packages yet" description="Add the first package below." />
                )}
              </Card>

              <Card
                title={editingVariation ? `Edit ${editingVariation.name}` : "Add package"}
                icon={Plus}
              >
                <ActionForm
                  action={saveVariationAction}
                  submitLabel={editingVariation ? "Save package" : "Add package"}
                  className="space-y-4"
                >
                  <input type="hidden" name="productId" value={product.product.id} />
                  {editingVariation && <input type="hidden" name="id" value={editingVariation.id} />}

                  <Field label="Package name">
                    <input
                      name="name"
                      defaultValue={editingVariation?.name ?? ""}
                      placeholder="86 Diamonds"
                      required
                      className={inputCls}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price (৳)">
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        defaultValue={String(editingVariation?.price ?? "")}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Compare-at (৳)">
                      <input
                        name="compareAtPrice"
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={editingVariation?.compareAtPrice ?? ""}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="SKU">
                      <input name="sku" defaultValue={editingVariation?.sku ?? ""} className={inputCls} />
                    </Field>
                    <Field label="Stock" hint="Blank = unlimited">
                      <input
                        name="stockQuantity"
                        type="number"
                        min={0}
                        defaultValue={
                          editingVariation?.stockQuantity !== null && editingVariation?.stockQuantity !== undefined
                            ? String(editingVariation.stockQuantity)
                            : ""
                        }
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Availability">
                      <select
                        name="stockStatus"
                        defaultValue={editingVariation?.stockStatus ?? "instock"}
                        className={selectCls}
                      >
                        <option value="instock">In stock</option>
                        <option value="outofstock">Out of stock</option>
                      </select>
                    </Field>
                    <Field label="Display order">
                      <input
                        name="sortOrder"
                        type="number"
                        defaultValue={String(editingVariation?.sortOrder ?? 0)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <ImageField
                    label="Package image"
                    name="image"
                    defaultValue={editingVariation?.image ?? ""}
                    hint="Falls back to the product image."
                  />

                  <Field label="Top-up method" hint="Leave on the product's method unless this package differs.">
                    <select
                      name="topupMethodId"
                      defaultValue={editingVariation?.topupMethodId ?? ""}
                      className={selectCls}
                    >
                      <option value="">Use product&apos;s method</option>
                      {topupMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <VariationFieldsOverride
                    key={editingVariation?.id ?? "new"}
                    initial={(editingVariation?.fields as ProductField[] | null | undefined) ?? null}
                  />

                  <Field label="Description">
                    <textarea
                      name="description"
                      defaultValue={editingVariation?.description ?? ""}
                      rows={3}
                      placeholder="Shown in the package info dialog."
                      className={textareaCls}
                    />
                  </Field>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingVariation ? editingVariation.availability !== "disabled" : true}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Active
                  </label>
                </ActionForm>
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
