import { relations, sql } from "drizzle-orm";
import {
  AVAILABILITY_STATUSES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  type Availability,
  type ProductStatus,
  type ProductType,
} from "@/lib/catalog-rules";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  primaryKey,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ProductFieldOption = { value: string; label: string };

export type ProductField = {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "password" | "tel" | "select" | "radio" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: ProductFieldOption[];
};

export type ProductBadges = {
  banner?: string;
  static?: { icon?: string; label?: string };
  delivery?: { icon?: string; label?: string };
  region?: { icon?: string; name?: string };
};

export { AVAILABILITY_STATUSES, PRODUCT_STATUSES, PRODUCT_TYPES, type Availability, type ProductStatus, type ProductType };

export type Role = "owner" | "moderator";


export const ORDER_STATUSES = [
  "pending_payment",
  "processing",
  "completed",
  "failed",
  "on_hold",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Payment state, tracked separately from fulfillment. */
export const ORDER_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

/** Delivery of the purchased top-up, tracked separately from payment. */
export const ORDER_FULFILLMENT_STATUSES = [
  "pending",
  "processing",
  "on_hold",
  "completed",
  "failed",
  "cancelled",
] as const;
export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "initiated",
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const WALLET_TX_TYPES = [
  "deposit",
  "order_payment",
  "refund",
  "admin_credit",
  "admin_debit",
  "adjustment",
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Identity                                                           */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    picture: text("picture"),
    googleId: text("google_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull().default(""),
    role: text("role").$type<Role>().notNull().default("moderator"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    adminId: text("admin_id").references(() => adminUsers.id, { onDelete: "cascade" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_admin_idx").on(t.adminId),
  ],
);

/* ------------------------------------------------------------------ */
/* Catalog                                                            */
/* ------------------------------------------------------------------ */

export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    /** Parent game for a regional variant (e.g. "PUBG Mobile Korea" → "PUBG Mobile"). Null for top-level games. */
    parentId: integer("parent_id").references((): AnyPgColumn => games.id, { onDelete: "restrict" }),
    /** Region label for a regional variant, e.g. "Global" or "Korea". Empty for top-level games. */
    region: text("region").notNull().default(""),
    image: text("image"),
    icon: text("icon"),
    description: text("description").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("games_active_order_idx").on(t.isActive, t.sortOrder),
    index("games_parent_idx").on(t.parentId),
    check("games_parent_not_self", sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  ],
);

/** Admin-configurable top-up methods (e.g. UID, Login). Not tied to any game. */
export const topupMethods = pgTable(
  "topup_methods",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("topup_methods_active_order_idx").on(t.isActive, t.sortOrder)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    image: text("image"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /** Whether the section appears on the homepage (independent of isActive). */
    showOnHome: boolean("show_on_home").notNull().default(true),
    /** Maximum games shown in the section; 0 means all assigned games. */
    gameLimit: integer("game_limit").notNull().default(0),
    /** "parent_games": cards are games that open a variant list; "products": cards link straight to product pages. */
    layout: text("layout").notNull().default("parent_games"),
    createdAt,
    updatedAt,
  },
  (t) => [index("categories_active_order_idx").on(t.isActive, t.sortOrder)],
);

export const categoryGames = pgTable(
  "category_games",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.gameId] }),
    index("category_games_game_idx").on(t.gameId),
  ],
);

export const categoryProducts = pgTable(
  "category_products",
  {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.productId] }),
    index("category_products_product_idx").on(t.productId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").unique(),
    description: text("description").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    image: text("image"),
    /** Display price; the authoritative price lives on variations. */
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    fields: jsonb("fields").$type<ProductField[]>().notNull().default([]),
    /** Customer-facing instructions shown at checkout for this product. */
    instructions: text("instructions").notNull().default(""),
    topupMethodId: integer("topup_method_id").references(() => topupMethods.id, { onDelete: "set null" }),
    badges: jsonb("badges").$type<ProductBadges>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    /** available | unavailable | disabled. Independent of publication status. */
    availability: text("availability").$type<Availability>().notNull().default("available"),
    status: text("status").$type<ProductStatus>().notNull().default("draft"),
    productType: text("product_type").$type<ProductType>().notNull().default("simple"),
    isFeatured: boolean("is_featured").notNull().default(false),
    /** Admin-only notes for whoever fulfils the order. Never shown to customers. */
    fulfillmentNotes: text("fulfillment_notes").notNull().default(""),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("products_status_idx").on(t.status, t.availability),
    index("products_game_idx").on(t.gameId, t.status, t.availability, t.sortOrder),
    check("products_availability_valid", sql.raw(`availability in (${AVAILABILITY_STATUSES.map((v) => `'${v}'`).join(", ")})`)),
    check("products_price_nonnegative", sql`${t.price} >= 0`),
    check("products_sku_not_blank", sql`${t.sku} is null or length(btrim(${t.sku})) > 0`),
    uniqueIndex("products_sku_normalized_unique").on(sql`lower(btrim(${t.sku}))`).where(sql`${t.sku} is not null`),
    check("products_status_valid", sql.raw(`status in (${PRODUCT_STATUSES.map((v) => `'${v}'`).join(", ")})`)),
    check("products_type_valid", sql.raw(`product_type in (${PRODUCT_TYPES.map((v) => `'${v}'`).join(", ")})`)),
  ],
);

export const variations = pgTable(
  "variations",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").unique(),
    description: text("description").notNull().default(""),
    /** Overrides the product's top-up method when set; null inherits it. */
    topupMethodId: integer("topup_method_id").references(() => topupMethods.id, { onDelete: "set null" }),
    /** Overrides the product's customer fields when set; null inherits them. */
    fields: jsonb("fields").$type<ProductField[]>(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
    image: text("image"),
    stockStatus: text("stock_status")
      .$type<"instock" | "outofstock">()
      .notNull()
      .default("instock"),
    stockQuantity: integer("stock_quantity"),
    sortOrder: integer("sort_order").notNull().default(0),
    availability: text("availability").$type<Availability>().notNull().default("available"),
    status: text("status").$type<ProductStatus>().notNull().default("draft"),
    /** Optional sale window for `price` (vs `compareAtPrice`, the regular price). */
    saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("variations_product_idx").on(t.productId, t.status, t.availability, t.sortOrder),
    check("variations_availability_valid", sql.raw(`availability in (${AVAILABILITY_STATUSES.map((v) => `'${v}'`).join(", ")})`)),
    index("variations_topup_idx").on(t.topupMethodId),
    check("variations_price_nonnegative", sql`${t.price} >= 0`),
    check("variations_compare_at_valid", sql`${t.compareAtPrice} is null or ${t.price} <= ${t.compareAtPrice}`),
    check(
      "variations_sale_window_valid",
      sql`${t.saleStartsAt} is null or ${t.saleEndsAt} is null or ${t.saleStartsAt} < ${t.saleEndsAt}`,
    ),
    check("variations_sku_not_blank", sql`${t.sku} is null or length(btrim(${t.sku})) > 0`),
    uniqueIndex("variations_sku_normalized_unique").on(sql`lower(btrim(${t.sku}))`).where(sql`${t.sku} is not null`),
    check("variations_status_valid", sql.raw(`status in (${PRODUCT_STATUSES.map((v) => `'${v}'`).join(", ")})`)),
    check("variations_stock_valid", sql`${t.stockStatus} in ('instock', 'outofstock')`),
  ],
);

export const banners = pgTable(
  "banners",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    image: text("image").notNull(),
    link: text("link"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("banners_active_order_idx").on(t.isActive, t.sortOrder)],
);

/* ------------------------------------------------------------------ */
/* Commerce                                                           */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    orderNumber: integer("order_number")
      .notNull()
      .default(sql`nextval('order_number_seq')`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
    paymentStatus: text("payment_status").$type<OrderPaymentStatus>().notNull().default("pending"),
    fulfillmentStatus: text("fulfillment_status")
      .$type<OrderFulfillmentStatus>()
      .notNull()
      .default("pending"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    walletAmount: numeric("wallet_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    gatewayAmount: numeric("gateway_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    itemCount: integer("item_count").notNull().default(1),
    paymentMethod: text("payment_method").notNull().default("uddoktapay"),
    playerFields: jsonb("player_fields").$type<Record<string, string>>().notNull().default({}),
    customerNote: text("customer_note").notNull().default(""),
    adminNote: text("admin_note").notNull().default(""),
    deliveryMessage: text("delivery_message").notNull().default(""),
    importedData: jsonb("imported_data").$type<Record<string, unknown>>().notNull().default({}),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("orders_user_created_idx").on(t.userId, t.createdAt),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    check(
      "orders_payment_status_valid",
      sql.raw(`payment_status in (${ORDER_PAYMENT_STATUSES.map((v) => `'${v}'`).join(", ")})`),
    ),
    check(
      "orders_fulfillment_status_valid",
      sql.raw(`fulfillment_status in (${ORDER_FULFILLMENT_STATUSES.map((v) => `'${v}'`).join(", ")})`),
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    variationId: integer("variation_id").references(() => variations.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    variationName: text("variation_name").notNull(),
    /** Snapshot of the top-up method name at purchase time. */
    topupMethod: text("topup_method").notNull().default(""),
    sku: text("sku"),
    image: text("image"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    importedData: jsonb("imported_data").$type<Record<string, string>>().notNull().default({}),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
    index("order_items_variation_idx").on(t.variationId),
  ],
);

export const orderHistory = pgTable(
  "order_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedByType: text("changed_by_type").$type<"customer" | "admin" | "system">().notNull(),
    changedById: text("changed_by_id"),
    note: text("note").notNull().default(""),
    customerVisible: boolean("customer_visible").notNull().default(false),
    createdAt,
  },
  (t) => [index("order_history_order_idx").on(t.orderId, t.createdAt)],
);

export const orderNotes = pgTable(
  "order_notes",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    adminId: text("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    customerVisible: boolean("customer_visible").notNull().default(false),
    createdAt,
  },
  (t) => [index("order_notes_order_idx").on(t.orderId, t.createdAt)],
);

/** Outcome of one provider fulfillment run. Admin-only manual steps are recorded in order_history. */
export const FULFILLMENT_OUTCOMES = ["in_progress", "completed", "failed", "manual_required"] as const;
export type FulfillmentOutcome = (typeof FULFILLMENT_OUTCOMES)[number];

export const fulfillmentAttempts = pgTable(
  "fulfillment_attempts",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    outcome: text("outcome").$type<FulfillmentOutcome>().notNull(),
    message: text("message").notNull().default(""),
    reference: text("reference").notNull().default(""),
    retryable: boolean("retryable").notNull().default(false),
    adminId: text("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("fulfillment_attempts_order_idx").on(t.orderId, t.createdAt),
    check(
      "fulfillment_attempts_outcome_valid",
      sql.raw(`outcome in (${FULFILLMENT_OUTCOMES.map((v) => `'${v}'`).join(", ")})`),
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    type: text("type").$type<"order" | "wallet_deposit">().notNull(),
    gateway: text("gateway").notNull().default("uddoktapay"),
    invoiceId: text("invoice_id").unique(),
    transactionId: text("transaction_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").$type<PaymentStatus>().notNull().default("initiated"),
    paymentMethod: text("payment_method"),
    senderNumber: text("sender_number"),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_user_idx").on(t.userId, t.createdAt),
    index("payments_order_idx").on(t.orderId),
  ],
);

export const wallets = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedAt,
});

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: text("type").$type<WalletTxType>().notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    balanceBefore: numeric("balance_before", { precision: 14, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 14, scale: 2 }).notNull(),
    status: text("status").$type<"completed" | "failed">().notNull().default("completed"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    description: text("description").notNull().default(""),
    createdByAdminId: text("created_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    createdAt,
  },
  (t) => [
    index("wallet_tx_user_idx").on(t.userId, t.createdAt),
    index("wallet_tx_reference_idx").on(t.referenceType, t.referenceId),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: text("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: text("method").$type<"wallet" | "gateway">().notNull(),
    reason: text("reason").notNull(),
    gatewayReference: text("gateway_reference"),
    status: text("status")
      .$type<"pending" | "completed" | "failed">()
      .notNull()
      .default("pending"),
    processedByAdminId: text("processed_by_admin_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    createdAt,
  },
  (t) => [index("refunds_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Platform                                                           */
/* ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt,
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull().default(""),
    entityId: text("entity_id").notNull().default(""),
    details: jsonb("details").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt,
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                          */
/* ------------------------------------------------------------------ */

export const gamesRelations = relations(games, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  game: one(games, { fields: [products.gameId], references: [games.id] }),
  variations: many(variations),
}));

export const variationsRelations = relations(variations, ({ one }) => ({
  product: one(products, { fields: [variations.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  history: many(orderHistory),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  orders: many(orders),
}));
