"use server";

import { revalidatePath, updateTag } from "next/cache";
import { count, eq } from "drizzle-orm";

import { adminUsers, orderNotes, users } from "@/db/schema";
import { audit, requireAdmin } from "@/lib/auth";
import type { FormState } from "@/lib/action-types";
import { friendlyError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { getSettings, saveSettings } from "@/lib/settings";
import { previewImport, importProducts } from "@/lib/csv";
import {
  importCustomers,
  importOrders,
  previewCustomerImport,
  previewOrderImport,
} from "@/lib/migration";
import {
  adminEditSchema,
  adminSchema,
  bannerSchema,
  bulkProductActionSchema,
  bulkProductCategorySchema,
  bulkVariationActionSchema,
  lifecycleActionSchema,
  variationBulkCreateSchema,
  categorySchema,
  gameSchema,
  productSchema,
  pendingRefundSchema,
  refundSchema,
  statusSchema,
  topupMethodSchema,
  variationSchema,
} from "@/lib/validation";
import {
  deleteBanner,
  deleteCategory,
  deleteGame,
  deleteProduct,
  deleteVariation,
  saveAdminUser,
  saveBanner,
  saveCategory,
  saveGame,
  saveProduct,
  saveVariation,
  deleteAdminUser,
  deleteTopupMethod,
  saveTopupMethod,
  bulkCreateVariations,
  bulkUpdateProducts,
  bulkUpdateVariations,
  duplicateVariation,
  applyProductLifecycle,
  bulkAssignProductCategory,
  duplicateProductAsDraft,
  applyVariationLifecycle,
} from "@/lib/services/admin-catalog";
import { adminAdjustWallet } from "@/lib/services/wallet";
import { refundOrder, resolvePendingGatewayRefund } from "@/lib/services/refunds";
import {
  deleteOrderNote,
  saveDeliveryMessage,
  updateOrderStatus,
} from "@/lib/services/orders";
import { verifyInvoice } from "@/lib/services/payments";
import { slugify } from "@/lib/slug";
import { z } from "zod";

async function safe(fn: () => Promise<FormState>): Promise<FormState> {
  try {
    return await fn();
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

const idSchema = z.coerce.number().int().positive();
const optionalIdSchema = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .optional()
  .default("");

function optionalId(formData: FormData) {
  const raw = optionalIdSchema.parse(formData.get("id") ?? "");
  return raw === "" ? undefined : raw;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/** Empty select value means "inherit / none". */
function nullableId(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

/** Missing or empty form value means "keep the stored value". */
function optionalString(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? undefined : raw;
}

/** Category placements from `categoryIds` checkboxes and optional `categorySort_<id>` numbers. */
function parseCategoryPlacements(formData: FormData) {
  return formData.getAll("categoryIds").map((raw) => {
    const id = String(raw);
    return { id, sortOrder: formData.get(`categorySort_${id}`) ?? 0 };
  });
}

/* ------------------------------------------------------------------ */
/* Games                                                              */
/* ------------------------------------------------------------------ */

export async function saveGameAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("categories.manage");
    const name = String(formData.get("name") ?? "");
    const input = gameSchema.parse({
      name,
      slug: String(formData.get("slug") ?? "") || slugify(name),
      image: String(formData.get("image") ?? ""),
      icon: String(formData.get("icon") ?? ""),
      description: String(formData.get("description") ?? ""),
      instructions: String(formData.get("instructions") ?? ""),
      parentId: String(formData.get("parentId") ?? ""),
      region: String(formData.get("region") ?? ""),
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: bool(formData, "isActive"),
    });

    const id = optionalId(formData);
    const game = await saveGame(input, id);
    await audit(admin.id, id ? "game.update" : "game.create", "game", game.id, { name: game.name });
    revalidatePath("/admin/games");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: id ? "Game updated." : "Game created." };
  });
}

export async function deleteGameAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("categories.manage");
    const id = idSchema.parse(formData.get("id"));
    await deleteGame(id);
    await audit(admin.id, "game.delete", "game", id);
    revalidatePath("/admin/games");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Game deleted." };
  });
}

/* ------------------------------------------------------------------ */
/* Categories                                                         */
/* ------------------------------------------------------------------ */

export async function saveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("categories.manage");
    const name = String(formData.get("name") ?? "");
    const input = categorySchema.parse({
      name,
      slug: String(formData.get("slug") ?? "") || slugify(name),
      image: String(formData.get("image") ?? ""),
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: bool(formData, "isActive"),
      showOnHome: bool(formData, "showOnHome"),
      gameLimit: formData.get("gameLimit") ?? 0,
      layout: String(formData.get("layout") ?? "") === "products" ? "products" : "parent_games",
      gameIds: formData.getAll("gameIds").map((value) => Number(value)),
      productIds: formData.getAll("productIds").map((value) => Number(value)),
    });

    const id = optionalId(formData);
    const category = await saveCategory(input, id);
    await audit(admin.id, id ? "category.update" : "category.create", "category", category.id, {
      name: input.name,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: id ? "Category updated." : "Category created." };
  });
}

export async function deleteCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("categories.manage");
    const id = idSchema.parse(formData.get("id"));
    await deleteCategory(id);
    await audit(admin.id, "category.delete", "category", id);
    revalidatePath("/admin/categories");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Category deleted." };
  });
}

/* ------------------------------------------------------------------ */
/* Products                                                           */
/* ------------------------------------------------------------------ */

function parseFields(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return z
      .array(
        z.object({
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          type: z.enum([
            "text",
            "number",
            "email",
            "password",
            "tel",
            "select",
            "radio",
            "textarea",
          ]),
          required: z.boolean(),
          placeholder: z.string().optional(),
          options: z
            .array(z.object({ value: z.string(), label: z.string() }))
            .optional(),
        }),
      )
      .parse(parsed);
  } catch {
    throw new AppError("Player fields are not valid. Please check the form.", 422);
  }
}

export async function saveProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const name = String(formData.get("name") ?? "");
    const input = productSchema.parse({
      gameId: formData.get("gameId"),
      name,
      slug: String(formData.get("slug") ?? "") || slugify(name),
      sku: String(formData.get("sku") ?? ""),
      description: String(formData.get("description") ?? ""),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      image: String(formData.get("image") ?? ""),
      isActive: bool(formData, "isActive"),
      isFeatured: bool(formData, "isFeatured"),
      status: optionalString(formData, "status"),
      productType: optionalString(formData, "productType"),
      sortOrder: formData.get("sortOrder") ?? 0,
      fields: parseFields(formData.get("fields") as string | null),
      instructions: String(formData.get("instructions") ?? ""),
      topupMethodId: nullableId(formData, "topupMethodId"),
      fulfillmentNotes: String(formData.get("fulfillmentNotes") ?? ""),
      categories: parseCategoryPlacements(formData),
    });

    const id = optionalId(formData);
    const product = await saveProduct(input, id);
    await audit(admin.id, id ? "product.update" : "product.create", "product", product.id, {
      name: input.name,
      status: input.status ?? null,
    });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${product.id}`);
    revalidatePath("/");
    updateTag("storefront");
    revalidatePath(`/product/${input.slug}`);
    return { ok: true, message: id ? "Product updated." : "Product created. Add packages next." };
  });
}

/** Summarises a bulk result, naming up to three skipped records and their reasons. */
function bulkMessage(result: { updated: number; skipped: Array<{ id: number; reason: string }> }) {
  const skippedNote = result.skipped.length
    ? ` ${result.skipped.length} skipped: ${result.skipped
        .slice(0, 3)
        .map((item) => `#${item.id} ${item.reason}`)
        .join(" ")}`
    : "";
  return `${result.updated} updated.${skippedNote}`;
}

export async function duplicateProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const id = idSchema.parse(formData.get("id"));
    const copy = await duplicateProductAsDraft(id, admin.id);
    revalidatePath("/admin/products");
    return { ok: true, message: `Created draft "${copy.name}" (#${copy.id}). Review it before publishing.` };
  });
}

export async function bulkUpdateProductsAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const action = String(formData.get("action") ?? "");
    if (action.startsWith("category_")) {
      const categoryInput = bulkProductCategorySchema.parse({
        mode: action.slice("category_".length),
        categoryId: formData.get("categoryId"),
        ids: formData.getAll("ids"),
      });
      const categoryResult = await bulkAssignProductCategory(categoryInput, admin.id);
      await audit(admin.id, `product.bulk_category_${categoryInput.mode}`, "product", undefined, {
        count: categoryResult.updated,
        skipped: categoryResult.skipped.length,
      });
      revalidatePath("/admin/products");
      return { ok: true, message: bulkMessage(categoryResult) };
    }
    const input = bulkProductActionSchema.parse({
      action: formData.get("action"),
      ids: formData.getAll("ids"),
    });
    const result = await bulkUpdateProducts(input, admin.id);
    await audit(admin.id, `product.bulk_${input.action}`, "product", undefined, {
      count: result.updated,
      skipped: result.skipped.length,
    });
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: bulkMessage(result) };
  });
}

export async function bulkUpdateVariationsAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const input = bulkVariationActionSchema.parse({
      productId: formData.get("productId"),
      action: formData.get("action"),
      ids: formData.getAll("ids"),
      amount: optionalString(formData, "amount"),
      direction: optionalString(formData, "direction"),
    });
    const result = await bulkUpdateVariations(input, admin.id);
    await audit(admin.id, `variation.bulk_${input.action}`, "product", input.productId, {
      count: result.updated,
      skipped: result.skipped.length,
    });
    revalidatePath(`/admin/products/${input.productId}`);
    revalidatePath("/");
    updateTag("storefront");
    const skippedNote = result.skipped.length
      ? ` ${result.skipped.length} skipped: ${result.skipped
          .slice(0, 3)
          .map((item) => `#${item.id} ${item.reason}`)
          .join(" ")}`
      : "";
    return { ok: true, message: `${result.updated} updated.${skippedNote}` };
  });
}

export async function bulkCreateVariationsAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const input = variationBulkCreateSchema.parse({
      productId: formData.get("productId"),
      lines: String(formData.get("lines") ?? ""),
    });
    const result = await bulkCreateVariations(input);
    await audit(admin.id, "variation.bulk_create", "product", input.productId, { count: result.created });
    revalidatePath(`/admin/products/${input.productId}`);
    return { ok: true, message: `${result.created} packages added as drafts. Review and publish them.` };
  });
}

export async function duplicateVariationAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const id = idSchema.parse(formData.get("id"));
    const productId = idSchema.parse(formData.get("productId"));
    await duplicateVariation(id);
    await audit(admin.id, "variation.duplicate", "variation", id, { productId });
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, message: "Package duplicated as a draft." };
  });
}

export async function productLifecycleAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const input = lifecycleActionSchema.parse({ id: formData.get("id"), op: formData.get("op") });
    await applyProductLifecycle(input.id, input.op, admin.id);
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: `Product ${input.op.replace("_", " ")} applied.` };
  });
}

export async function variationLifecycleAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const input = lifecycleActionSchema.parse({ id: formData.get("id"), op: formData.get("op") });
    await applyVariationLifecycle(input.id, input.op, admin.id);
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: `Package ${input.op.replace("_", " ")} applied.` };
  });
}

export async function deleteProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const id = idSchema.parse(formData.get("id"));
    await deleteProduct(id);
    await audit(admin.id, "product.delete", "product", id);
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Product deleted." };
  });
}

export async function saveVariationAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const input = variationSchema.parse({
      productId: formData.get("productId"),
      topupMethodId: nullableId(formData, "topupMethodId"),
      // Only an explicit override replaces the product's customer fields.
      fields: bool(formData, "overrideFields") ? parseFields(formData.get("fields") as string | null) : null,
      name: String(formData.get("name") ?? ""),
      sku: String(formData.get("sku") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: formData.get("price") ?? 0,
      compareAtPrice: formData.get("compareAtPrice") || undefined,
      saleStartsAt: String(formData.get("saleStartsAt") ?? ""),
      saleEndsAt: String(formData.get("saleEndsAt") ?? ""),
      status: optionalString(formData, "status"),
      image: String(formData.get("image") ?? ""),
      stockStatus: formData.get("stockStatus") ?? "instock",
      stockQuantity:
        String(formData.get("stockQuantity") ?? "").trim() === ""
          ? undefined
          : formData.get("stockQuantity"),
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: bool(formData, "isActive"),
    });

    const id = optionalId(formData);
    const variation = await saveVariation(input, id);
    await audit(admin.id, id ? "variation.update" : "variation.create", "variation", variation.id, {
      productId: input.productId,
      price: input.price,
      status: input.status ?? null,
    });
    revalidatePath(`/admin/products/${input.productId}`);
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: id ? "Package updated." : "Package added." };
  });
}

export async function deleteVariationAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const id = idSchema.parse(formData.get("id"));
    const productId = idSchema.parse(formData.get("productId"));
    await deleteVariation(id);
    await audit(admin.id, "variation.delete", "variation", id);
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Package deleted." };
  });
}

/* ------------------------------------------------------------------ */
/* Banners                                                            */
/* ------------------------------------------------------------------ */

export async function saveBannerAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("banners.manage");
    const input = bannerSchema.parse({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      image: String(formData.get("image") ?? ""),
      link: String(formData.get("link") ?? ""),
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: bool(formData, "isActive"),
    });
    const id = optionalId(formData);
    const banner = await saveBanner(input, id);
    await audit(admin.id, id ? "banner.update" : "banner.create", "banner", banner.id);
    revalidatePath("/admin/banners");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: id ? "Banner updated." : "Banner created." };
  });
}

export async function deleteBannerAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("banners.manage");
    const id = idSchema.parse(formData.get("id"));
    await deleteBanner(id);
    await audit(admin.id, "banner.delete", "banner", id);
    revalidatePath("/admin/banners");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Banner deleted." };
  });
}

/* ------------------------------------------------------------------ */
/* Orders / payments / wallets                                        */
/* ------------------------------------------------------------------ */

export async function updateOrderStatusAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("orders.update_status");
    const input = statusSchema.parse({
      orderId: formData.get("orderId"),
      status: formData.get("status"),
      note: String(formData.get("note") ?? ""),
    });
    await updateOrderStatus({
      ...input,
      customerVisible: formData.get("customerVisible") === "1",
      adminId: admin.id,
    });
    await audit(admin.id, "order.status", "order", input.orderId, { status: input.status });
    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true, message: `Order moved to ${input.status.replace(/_/g, " ")}.` };
  });
}

export async function bulkUpdateOrderStatusAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("orders.update_status");
    const status = statusSchema.shape.status.parse(formData.get("status"));
    const ids = [...new Set(formData.getAll("orderIds").map((value) => idSchema.parse(value)))];
    if (ids.length === 0) return { ok: false, error: "Select at least one order." };
    if (ids.length > 200) return { ok: false, error: "Update up to 200 orders at a time." };

    let updated = 0;
    const skipped: string[] = [];
    for (const orderId of ids) {
      try {
        await updateOrderStatus({ orderId, status, adminId: admin.id });
        await audit(admin.id, "order.status", "order", orderId, { status, bulk: true });
        updated++;
      } catch (error) {
        skipped.push(`#${orderId}: ${friendlyError(error)}`);
      }
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    if (updated === 0) return { ok: false, error: skipped.slice(0, 3).join(" ") };
    const note = skipped.length
      ? ` ${skipped.length} skipped (${skipped.slice(0, 3).join("; ")}${skipped.length > 3 ? "…" : ""}).`
      : "";
    return { ok: true, message: `${updated} order(s) moved to ${status.replace(/_/g, " ")}.${note}` };
  });
}

export async function addOrderNoteAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("orders.view");
    const orderId = idSchema.parse(formData.get("orderId"));
    const content = String(formData.get("content") ?? "").trim();
    if (content.length < 2) throw new AppError("Write a note first.", 422);
    if (content.length > 2000) throw new AppError("Note is too long.", 422);

    const db = await getDb();
    const customerVisible = formData.get("customerVisible") === "1";
    await db.insert(orderNotes).values({ orderId, adminId: admin.id, content, customerVisible });
    await audit(admin.id, "order.note", "order", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true, message: customerVisible ? "Message sent to the customer." : "Internal note added." };
  });
}

export async function deleteOrderNoteAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("orders.view");
    const orderId = idSchema.parse(formData.get("orderId"));
    const noteId = idSchema.parse(formData.get("noteId"));
    await deleteOrderNote(orderId, noteId);
    await audit(admin.id, "order.note_delete", "order", orderId, { noteId });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Note deleted." };
  });
}

export async function saveDeliveryMessageAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("orders.update_status");
    const orderId = idSchema.parse(formData.get("orderId"));
    const message = String(formData.get("deliveryMessage") ?? "").trim();
    if (message.length > 2000) throw new AppError("Delivery message is too long.", 422);
    await saveDeliveryMessage(orderId, message);
    await audit(admin.id, "order.delivery_message", "order", orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Delivery message saved." };
  });
}

export async function verifyPaymentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("payments.view");
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    if (!invoiceId) throw new AppError("Invoice id is required.", 422);
    const result = await verifyInvoice(invoiceId, { isAdmin: true });
    await audit(admin.id, "payment.verify", "payment", invoiceId, { status: result.status });
    revalidatePath("/admin/payments");
    revalidatePath("/admin/orders");
    return { ok: true, message: `Gateway status: ${result.status.replace(/_/g, " ")}.` };
  });
}

export async function refundAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("refunds.process");
    const input = refundSchema.parse({
      orderId: formData.get("orderId"),
      amount: formData.get("amount"),
      method: formData.get("method"),
      reason: String(formData.get("reason") ?? ""),
      externalReference: String(formData.get("externalReference") ?? ""),
      recordOnly: bool(formData, "recordOnly"),
    });

    const result = await refundOrder({ ...input, adminId: admin.id });
    await audit(admin.id, "refund.create", "order", input.orderId, {
      amount: input.amount,
      method: input.method,
      fullyRefunded: result.fullyRefunded,
    });
    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/wallets");
    return {
      ok: true,
      message: `Refund recorded. ${result.fullyRefunded ? "Order marked refunded." : ""}`.trim(),
    };
  });
}

export async function resolvePendingRefundAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("refunds.process");
    const input = pendingRefundSchema.parse({
      refundId: formData.get("refundId"),
      outcome: formData.get("outcome"),
      gatewayReference: String(formData.get("gatewayReference") ?? ""),
    });
    const result = await resolvePendingGatewayRefund({ ...input, adminId: admin.id });
    await audit(admin.id, `refund.resolve_${input.outcome}`, "refund", input.refundId, {
      gatewayReference: input.gatewayReference || null,
      fullyRefunded: result.fullyRefunded,
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/wallets");
    return {
      ok: true,
      message:
        input.outcome === "completed"
          ? `Refund confirmed. ${result.fullyRefunded ? "Order marked refunded." : ""}`.trim()
          : "Pending refund marked failed; the amount is refundable again.",
    };
  });
}

export async function adjustWalletAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("wallet.manage");
    const userId = String(formData.get("userId") ?? "");
    if (!userId) throw new AppError("Customer is required.", 422);

    const amount = z.coerce.number().positive("Enter an amount.").parse(formData.get("amount"));
    const credit = String(formData.get("direction") ?? "credit") === "credit";
    const reason = String(formData.get("reason") ?? "");

    const result = await adminAdjustWallet({ userId, amount, credit, reason, adminId: admin.id });
    await audit(admin.id, credit ? "wallet.credit" : "wallet.debit", "user", userId, {
      amount,
      reason,
    });
    revalidatePath("/admin/wallets");
    revalidatePath(`/admin/customers/${userId}`);
    return {
      ok: true,
      message: `Wallet ${credit ? "credited" : "debited"}. New balance ৳${result?.balanceAfter.toFixed(2) ?? ""}.`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export async function saveSettingsAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("settings.manage");
    const current = await getSettings();

    const next = {
      ...current,
      storeName: String(formData.get("storeName") ?? current.storeName).slice(0, 80),
      supportUrl: String(formData.get("supportUrl") ?? current.supportUrl).slice(0, 300),
      minOrderAmount: Math.max(0, Number(formData.get("minOrderAmount") ?? current.minOrderAmount)),
      minDepositAmount: Math.max(1, Number(formData.get("minDepositAmount") ?? current.minDepositAmount)),
      maxDepositAmount: Math.max(1, Number(formData.get("maxDepositAmount") ?? current.maxDepositAmount)),
      walletPaymentsEnabled: bool(formData, "walletPaymentsEnabled"),
      walletDepositsEnabled: bool(formData, "walletDepositsEnabled"),
      maintenanceMode: bool(formData, "maintenanceMode"),
      orderPollingSeconds: Math.min(30, Math.max(3, Number(formData.get("orderPollingSeconds") ?? 4))),
    };

    if (next.maxDepositAmount < next.minDepositAmount) {
      throw new AppError("Maximum deposit must be greater than the minimum.", 422);
    }

    await saveSettings(next);
    await audit(admin.id, "settings.update", "settings", "store", next);
    revalidatePath("/admin/settings");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Settings saved." };
  });
}

/* ------------------------------------------------------------------ */
/* Staff                                                              */
/* ------------------------------------------------------------------ */

export async function saveAdminAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const actor = await requireAdmin("staff.manage");
    const id = String(formData.get("id") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!id) {
      const input = adminSchema.parse({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password,
        role: formData.get("role") ?? "moderator",
        permissions: formData.getAll("permissions").map(String),
        isActive: bool(formData, "isActive"),
      });
      const created = await saveAdminUser(input);
      await audit(actor.id, "admin.create", "admin", created.id, { role: created.role });
      revalidatePath("/admin/admins");
      return { ok: true, message: "Moderator created." };
    }

    const input = adminEditSchema.parse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password,
      role: formData.get("role") ?? "moderator",
      permissions: formData.getAll("permissions").map(String),
      isActive: bool(formData, "isActive"),
    });

    if (id === actor.id && input.role !== "owner") {
      const db = await getDb();
      const owners = await db
        .select({ value: count() })
        .from(adminUsers)
        .where(eq(adminUsers.role, "owner"));
      if (Number(owners[0]?.value ?? 0) <= 1) {
        throw new AppError("You cannot remove the last owner account.", 409);
      }
    }

    await saveAdminUser(input, id);
    await audit(actor.id, "admin.update", "admin", id, { role: input.role });
    revalidatePath("/admin/admins");
    return { ok: true, message: "Admin updated." };
  });
}

export async function deleteAdminAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const actor = await requireAdmin("staff.manage");
    const id = String(formData.get("id") ?? "");
    if (!id) throw new AppError("Admin is required.", 422);
    if (id === actor.id) throw new AppError("You cannot delete your own account.", 409);

    await deleteAdminUser(id);
    await audit(actor.id, "admin.delete", "admin", id);
    revalidatePath("/admin/admins");
    return { ok: true, message: "Admin deleted." };
  });
}

/* ------------------------------------------------------------------ */
/* CSV                                                                */
/* ------------------------------------------------------------------ */

export async function importCsvAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("csv.manage");
    const mode = String(formData.get("mode") ?? "preview");
    const file = formData.get("file");
    const pasted = String(formData.get("csv") ?? "");

    let text = pasted;
    if (file instanceof File && file.size > 0) {
      if (file.size > 8 * 1024 * 1024) throw new AppError("CSV must be smaller than 8 MB.", 422);
      text = await file.text();
    }
    if (!text.trim()) throw new AppError("Upload or paste a CSV file.", 422);

    if (mode === "preview") {
      const preview = await previewImport(text);
      return {
        ok: preview.errors.length === 0,
        preview,
        message:
          preview.errors.length === 0
            ? "Preview ready. Review the rows, then import."
            : "Some rows have errors. Fix them and preview again.",
        error:
          preview.errors.length > 0
            ? `${preview.errors.length} row(s) have errors. Nothing will be imported until they are fixed.`
            : undefined,
      };
    }

    const createMissingGames = bool(formData, "createMissingGames");
    const result = await importProducts(text, { createMissingGames });
    await audit(admin.id, "csv.import", "products", "", {
      imported: result.imported,
      variations: result.importedVariations,
    });
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return {
      ok: true,
      imported: result.imported,
      importedVariations: result.importedVariations,
      skipped: result.skipped,
      message: `Imported ${result.imported} product(s) and ${result.importedVariations} package(s). Skipped ${result.skipped} existing product(s).`,
    };
  });
}

async function readMigrationCsv(formData: FormData) {
  const file = formData.get("file");
  const pasted = String(formData.get("csv") ?? "");
  let text = pasted;
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) throw new AppError("CSV must be smaller than 8 MB.", 422);
    text = await file.text();
  }
  if (!text.trim()) throw new AppError("Upload or paste a CSV file.", 422);
  return text;
}

export async function importCustomersAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("csv.manage");
    const mode = String(formData.get("mode") ?? "preview");
    const text = await readMigrationCsv(formData);

    if (mode === "preview") {
      const preview = await previewCustomerImport(text);
      return {
        ok: preview.errors.length === 0,
        migration: preview,
        message:
          preview.errors.length === 0
            ? "Preview ready. Review the customers, then import."
            : "Some rows have errors. Nothing will be imported until they are fixed.",
        error:
          preview.errors.length > 0
            ? `${preview.errors.length} row(s) have errors.`
            : undefined,
      };
    }

    const result = await importCustomers(text);
    await audit(admin.id, "customers.import", "user", "", {
      imported: result.imported,
      skipped: result.skipped,
    });
    revalidatePath("/admin/customers");
    revalidatePath("/admin/reports");
    return {
      ok: result.errors.length === 0 || result.imported > 0,
      importedCustomers: result.imported,
      skipped: result.skipped,
      warnings: result.warnings,
      message: `Imported ${result.imported} customer(s). Skipped ${result.skipped} existing customer(s).`,
      error: result.errors.length ? `${result.errors.length} row(s) could not be imported.` : undefined,
    };
  });
}

export async function importOrdersAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("csv.manage");
    const mode = String(formData.get("mode") ?? "preview");
    const text = await readMigrationCsv(formData);

    if (mode === "preview") {
      const preview = await previewOrderImport(text);
      return {
        ok: preview.errors.length === 0,
        migration: preview,
        warnings: preview.warnings,
        message:
          preview.errors.length === 0
            ? "Preview ready. Review the orders, then import."
            : "Some rows have errors. Nothing will be imported until they are fixed.",
        error:
          preview.errors.length > 0
            ? `${preview.errors.length} row(s) have errors.`
            : undefined,
      };
    }

    const result = await importOrders(text);
    await audit(admin.id, "orders.import", "order", "", {
      imported: result.imported,
      skipped: result.skipped,
      customers: result.customersCreated,
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/reports");
    return {
      ok: result.errors.length === 0 || result.imported > 0,
      importedOrders: result.imported,
      importedCustomers: result.customersCreated,
      skipped: result.skipped,
      warnings: result.warnings,
      message: `Imported ${result.imported} order(s). Skipped ${result.skipped} existing order(s). Created ${result.customersCreated} customer(s).`,
      error: result.errors.length ? `${result.errors.length} order(s) failed to import.` : undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Customers                                                          */
/* ------------------------------------------------------------------ */

export async function toggleCustomerAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("customers.view");
    const userId = String(formData.get("userId") ?? "");
    if (!userId) throw new AppError("Customer is required.", 422);
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!rows[0]) throw new AppError("Customer not found.", 404);
    await db
      .update(users)
      .set({ isActive: !rows[0].isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await audit(admin.id, "customer.toggle", "user", userId, { active: !rows[0].isActive });
    revalidatePath(`/admin/customers/${userId}`);
    return { ok: true, message: rows[0].isActive ? "Customer disabled." : "Customer enabled." };
  });
}

/* ------------------------------------------------------------------ */
/* Top-up methods                                                     */
/* ------------------------------------------------------------------ */

export async function saveTopupMethodAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const name = String(formData.get("name") ?? "");
    const input = topupMethodSchema.parse({
      key: String(formData.get("key") ?? "") || slugify(name),
      name,
      description: String(formData.get("description") ?? ""),
      sortOrder: formData.get("sortOrder") ?? 0,
      isActive: bool(formData, "isActive"),
    });

    const id = optionalId(formData);
    const method = await saveTopupMethod(input, id);
    await audit(admin.id, id ? "topup_method.update" : "topup_method.create", "topup_method", method.id, {
      name: method.name,
    });
    revalidatePath("/admin/topup-methods");
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Top-up method saved." };
  });
}

export async function deleteTopupMethodAction(_state: FormState, formData: FormData): Promise<FormState> {
  return safe(async () => {
    const admin = await requireAdmin("products.manage");
    const id = Number(formData.get("id"));
    await deleteTopupMethod(id);
    await audit(admin.id, "topup_method.delete", "topup_method", id);
    revalidatePath("/admin/topup-methods");
    revalidatePath("/admin/products");
    revalidatePath("/");
    updateTag("storefront");
    return { ok: true, message: "Top-up method deleted." };
  });
}
