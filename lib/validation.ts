import { z } from "zod";

import { LIFECYCLE_OPS, PRODUCT_STATUSES, PRODUCT_TYPES } from "@/lib/catalog-rules";

export const lifecycleActionSchema = z.object({
  id: z.coerce.number().int().positive(),
  op: z.enum(LIFECYCLE_OPS),
});

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(190)
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password is too long.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Enter a valid phone number.")
    .optional()
    .default(""),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Enter a valid phone number.")
    .optional()
    .default(""),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});

export const checkoutItemSchema = z.object({
  variationId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  productId: z.coerce.number().int().positive(),
  items: z.array(checkoutItemSchema).min(1, "Select at least one package.").max(20),
  playerFields: z.record(z.string(), z.string().max(300)).default({}),
  paymentType: z.enum(["wallet", "gateway", "hybrid"]),
  walletAmount: z.coerce.number().min(0).max(1_000_000).optional().default(0),
  customerNote: z.string().trim().max(500).optional().default(""),
});

export const depositSchema = z.object({
  amount: z.coerce.number().positive("Enter a deposit amount.").max(1_000_000),
});

export const productFieldSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["text", "number", "email", "password", "tel", "select", "radio", "textarea"]),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(160).optional(),
  options: z
    .array(
      z.object({
        value: z.string().trim().min(1).max(120),
        label: z.string().trim().min(1).max(160),
      }),
    )
    .optional(),
});

/**
 * Customer fields are keyed by id on checkout and stored by label on orders,
 * so both must be unique. Choice fields need at least one distinct option.
 */
export const productFieldsSchema = z.array(productFieldSchema).max(20).superRefine((fields, ctx) => {
  const ids = new Set<string>();
  const labels = new Set<string>();
  fields.forEach((field, index) => {
    if (ids.has(field.id)) {
      ctx.addIssue({ code: "custom", path: [index, "id"], message: `Field id "${field.id}" is used more than once.` });
    }
    ids.add(field.id);
    const label = field.label.toLowerCase();
    if (labels.has(label)) {
      ctx.addIssue({ code: "custom", path: [index, "label"], message: `Field label "${field.label}" is used more than once.` });
    }
    labels.add(label);
    if (field.type === "select" || field.type === "radio") {
      const values = (field.options ?? []).map((option) => option.value);
      if (values.length === 0) {
        ctx.addIssue({ code: "custom", path: [index, "options"], message: `"${field.label}" needs at least one option.` });
      } else if (new Set(values).size !== values.length) {
        ctx.addIssue({ code: "custom", path: [index, "options"], message: `Options for "${field.label}" must be unique.` });
      }
    }
  });
});

/** An unchecked checkbox sends nothing, so a missing value means "off". */
const enabledCheckbox = z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean());

export const productSchema = z.object({
  gameId: z.coerce.number().int().positive("Choose a game."),
  name: z.string().trim().min(2, "Enter a product name.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers and dashes."),
  sku: z.string().trim().max(80).optional().default(""),
  description: z.string().max(20000).optional().default(""),
  shortDescription: z.string().max(500).optional().default(""),
  image: z.string().trim().max(500).optional().default(""),
  /** Derived from the packages on save (lowest package price). Submitted values are ignored. */
  price: z.coerce.number().min(0).max(1_000_000).optional().default(0),
  isActive: enabledCheckbox,
  /** Omitted fields keep their stored value. */
  status: z.enum(PRODUCT_STATUSES).optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  fields: productFieldsSchema.default([]),
  instructions: z.string().max(5000).optional().default(""),
  topupMethodId: z.coerce.number().int().positive().nullable().optional().default(null),
  fulfillmentNotes: z.string().max(2000).optional().default(""),
  /** Product-layout categories this product appears in, with its position in each. */
  categories: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
      }),
    )
    .max(50)
    .default([]),
});

export const bulkProductActionSchema = z.object({
  action: z.enum([
    "publish",
    "draft",
    "archive",
    "restore",
    "enable",
    "disable",
    "mark_available",
    "mark_unavailable",
    "feature",
    "unfeature",
    "delete",
  ]),
  ids: z.array(z.coerce.number().int().positive()).min(1, "Select at least one product.").max(200),
});

export const bulkProductCategorySchema = z.object({
  mode: z.enum(["add", "remove"]),
  categoryId: z.coerce.number().int().positive("Choose a category."),
  ids: z.array(z.coerce.number().int().positive()).min(1, "Select at least one product.").max(200),
});

export const bulkVariationActionSchema = z.object({
  productId: z.coerce.number().int().positive(),
  action: z.enum([
    "publish",
    "draft",
    "archive",
    "restore",
    "enable",
    "disable",
    "mark_available",
    "mark_unavailable",
    "delete",
    "price_set",
    "price_change",
  ]),
  ids: z.array(z.coerce.number().int().positive()).min(1, "Select at least one package.").max(200),
  /** price_set: new price. price_change: percentage. */
  amount: z.coerce.number().min(0).max(1_000_000).optional(),
  direction: z.enum(["increase", "decrease"]).optional(),
});

export const variationBulkCreateSchema = z.object({
  productId: z.coerce.number().int().positive(),
  lines: z.string().max(10000),
});

export const variationSchema = z.object({
  productId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Enter a package name.").max(160),
  sku: z.string().trim().max(80).optional().default(""),
  description: z.string().max(5000).optional().default(""),
  price: z.coerce.number().min(0).max(1_000_000),
  compareAtPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  image: z.string().trim().max(500).optional().default(""),
  stockStatus: z.enum(["instock", "outofstock"]).default("instock"),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  isActive: enabledCheckbox,
  /** null inherits the product's top-up method. */
  topupMethodId: z.coerce.number().int().positive().nullable().optional().default(null),
  /** null inherits the product's customer fields. */
  fields: productFieldsSchema.nullable().optional().default(null),
  status: z.enum(PRODUCT_STATUSES).optional(),
  /** datetime-local values ("YYYY-MM-DDTHH:mm"). Empty string means no bound. */
  saleStartsAt: z.string().trim().max(40).optional().default(""),
  saleEndsAt: z.string().trim().max(40).optional().default(""),
});

export const topupMethodSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Key can only contain lowercase letters, numbers and dashes."),
  name: z.string().trim().min(2, "Enter a method name.").max(80),
  description: z.string().trim().max(500).optional().default(""),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const gameSchema = z.object({
  name: z.string().trim().min(2, "Enter a game name.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug."),
  image: z.string().trim().max(500).optional().default(""),
  icon: z.string().trim().max(500).optional().default(""),
  description: z.string().max(5000).optional().default(""),
  instructions: z.string().max(5000).optional().default(""),
  /** Top-level game this regional variant belongs to. Empty for top-level games. */
  parentId: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  region: z.string().trim().max(60).optional().default(""),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug."),
  image: z.string().trim().max(500).optional().default(""),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  isActive: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
  gameLimit: z.coerce.number().int().min(0).max(100).default(0),
  layout: z.enum(["parent_games", "products"]).default("parent_games"),
  gameIds: z.array(z.number().int().positive()).max(500).default([]),
  productIds: z.array(z.number().int().positive()).max(2000).default([]),
});

export const bannerSchema = z.object({
  title: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  image: z.string().trim().min(1, "Upload or link a banner image.").max(500),
  link: z.string().trim().max(500).optional().default(""),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const adminSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["owner", "moderator"]),
  permissions: z.array(z.string()).default([]),
  isActive: z.coerce.boolean().default(true),
});

export const adminEditSchema = adminSchema.extend({
  password: z.string().max(200).optional().default(""),
});

export const statusSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  status: z.enum([
    "pending_payment",
    "paid",
    "processing",
    "completed",
    "failed",
    "on_hold",
    "cancelled",
    "refunded",
  ]),
  note: z.string().trim().max(500).optional().default(""),
});

export const pendingRefundSchema = z.object({
  refundId: z.string().trim().min(1).max(64),
  outcome: z.enum(["completed", "failed"]),
  gatewayReference: z.string().trim().max(200).optional().default(""),
});

export const refundSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Enter a refund amount.").max(1_000_000),
  method: z.enum(["wallet", "gateway"]),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
  externalReference: z.string().trim().max(200).optional().default(""),
  recordOnly: z.coerce.boolean().default(false),
});
