import "server-only";

import { eq } from "drizzle-orm";

import {
  orderHistory,
  orderItems,
  orderNotes,
  orders,
  payments,
  products,
  refunds,
  users,
  variations,
  wallets,
  type OrderStatus,
} from "@/db/schema";
import { newId } from "@/lib/crypto";
import { fulfillmentStatusFor } from "@/lib/order-status";
import { rowsFromCsv, type CsvRow } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { round2 } from "@/lib/money";

/* ------------------------------------------------------------------ */
/* Shared types                                                       */
/* ------------------------------------------------------------------ */

export type MigrationError = { row: number; message: string };

export type MigrationPreview = {
  kind: "customers" | "orders";
  totalRows: number;
  groups: number;
  newGroups: number;
  existingGroups: number;
  errors: MigrationError[];
  warnings: string[];
  items: Array<{
    key: string;
    label: string;
    email: string;
    total: number | null;
    status: string | null;
    exists: boolean;
    rows: number[];
  }>;
};

export type MigrationResult = {
  imported: number;
  skipped: number;
  customersCreated: number;
  errors: MigrationError[];
  warnings: string[];
};

type CustomerRecord = {
  email: string;
  name: string;
  phone: string;
  createdAt: Date | null;
  row: number;
};

type ItemRecord = {
  name: string;
  sku: string;
  quantity: number;
  total: number;
  unitPrice: number;
  /** Every source column for this line item, kept verbatim. */
  meta?: Record<string, string>;
};

type OrderRecord = {
  key: string;
  publicId: string;
  email: string;
  customerName: string;
  phone: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount: number;
  walletAmount: number;
  paymentMethod: string;
  customerNote: string;
  notes: string;
  playerFields: Record<string, string>;
  /** Every order-level source column (first non-empty value across the group). */
  importedFields: Record<string, string>;
  transactionId: string;
  items: ItemRecord[];
  createdAt: Date;
  paidAt: Date | null;
  completedAt: Date | null;
  refundTotal: number;
  row: number;
  rowNumbers: number[];
};

const MAX_PREVIEW_ITEMS = 100;

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                    */
/* ------------------------------------------------------------------ */

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function pickGroup(rows: CsvRow[], keys: string[]) {
  for (const row of rows) {
    const value = pick(row, keys);
    if (value) return value;
  }
  return "";
}

function parseNumber(value: string) {
  if (!value) return Number.NaN;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? round2(n) : Number.NaN;
}

function parseQuantity(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : 1;
}

function parseDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d{10,13}$/.test(raw)) {
    const n = Number(raw);
    const date = new Date(raw.length === 13 ? n : n * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4}-\d{2}-\d{2}([ T].*)?$/.test(raw)) {
    const iso = raw.replace(" ", "T");
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
    const date = new Date(hasZone ? iso : `${iso}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](.*))?$/.exec(raw);
  if (us) {
    const [, month, day, year, time = "00:00:00"] = us;
    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function customerName(row: CsvRow) {
  return (
    pick(row, ["name", "full_name", "display_name", "customer_name"]) ||
    [pick(row, ["first_name", "billing_first_name"]), pick(row, ["last_name", "billing_last_name"])]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    pick(row, ["username", "user_login"])
  );
}

/* ------------------------------------------------------------------ */
/* Customers                                                          */
/* ------------------------------------------------------------------ */

function normalizeCustomers(rows: CsvRow[]) {
  const errors: MigrationError[] = [];
  const warnings: string[] = [];
  const byEmail = new Map<string, CustomerRecord>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const email = cleanEmail(
      pick(row, ["email", "billing_email", "customer_email", "user_email"]),
    );
    if (!email) {
      errors.push({ row: rowNumber, message: "Missing customer email." });
      return;
    }
    if (!isEmail(email)) {
      errors.push({ row: rowNumber, message: `Invalid email "${email}".` });
      return;
    }

    const name = customerName(row);
    const phone = pick(row, ["phone", "billing_phone", "customer_phone", "user_phone"]);
    const createdAt = parseDate(
      pick(row, [
        "registered",
        "registered_date",
        "user_registered",
        "date_registered",
        "customer_since",
        "created_at",
      ]),
    );

    const existing = byEmail.get(email);
    if (existing) {
      existing.name = existing.name || name;
      existing.phone = existing.phone || phone;
      existing.createdAt = existing.createdAt ?? createdAt;
      warnings.push(`Row ${rowNumber}: duplicate email ${email} merged.`);
      return;
    }

    byEmail.set(email, { email, name, phone, createdAt, row: rowNumber });
  });

  return { records: [...byEmail.values()], errors, warnings };
}

export async function previewCustomerImport(text: string): Promise<MigrationPreview> {
  const { rows, headers } = rowsFromCsv(text);
  if (!headers.some((header) => ["email", "billing_email", "customer_email", "user_email"].includes(header))) {
    return {
      kind: "customers",
      totalRows: 0,
      groups: 0,
      newGroups: 0,
      existingGroups: 0,
      errors: [{ row: 1, message: "Missing email column (email, billing_email or customer_email)." }],
      warnings: [],
      items: [],
    };
  }

  const { records, errors, warnings } = normalizeCustomers(rows);
  const db = await getDb();
  const existingRows = await db.select({ email: users.email }).from(users);
  const existing = new Set(existingRows.map((row) => row.email.toLowerCase()));
  const newRecords = records.filter((record) => !existing.has(record.email));

  return {
    kind: "customers",
    totalRows: rows.length,
    groups: records.length,
    newGroups: newRecords.length,
    existingGroups: records.length - newRecords.length,
    errors,
    warnings,
    items: records.slice(0, MAX_PREVIEW_ITEMS).map((record) => ({
      key: record.email,
      label: record.name || "(no name)",
      email: record.email,
      total: null,
      status: null,
      exists: existing.has(record.email),
      rows: [record.row],
    })),
  };
}

export async function importCustomers(text: string): Promise<MigrationResult> {
  const { records, errors, warnings } = normalizeCustomers(rowsFromCsv(text).rows);
  if (errors.length) {
    return { imported: 0, skipped: 0, customersCreated: 0, errors, warnings };
  }

  const db = await getDb();
  const existingRows = await db.select({ email: users.email }).from(users);
  const existing = new Set(existingRows.map((row) => row.email.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  for (const record of records) {
    if (existing.has(record.email)) {
      skipped += 1;
      continue;
    }

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          id: newId(),
          email: record.email,
          name: record.name,
          phone: record.phone,
          passwordHash: null,
          createdAt: record.createdAt ?? new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: users.id });
      await tx.insert(wallets).values({ userId: created.id, balance: "0" }).onConflictDoNothing();
    });

    existing.add(record.email);
    imported += 1;
  }

  return {
    imported,
    skipped,
    customersCreated: imported,
    errors: [],
    warnings: [
      ...warnings,
      "Imported customers have no password. They can sign in with Google using the same email; otherwise they will need a password reset before they can sign in.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, OrderStatus | "skip"> = {
  pending: "pending_payment",
  "pending-payment": "pending_payment",
  paid: "paid",
  "on-hold": "on_hold",
  onhold: "on_hold",
  processing: "processing",
  completed: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  failed: "failed",
  "checkout-draft": "skip",
};

function mapStatus(raw: string): OrderStatus | "skip" | null {
  const normalized = raw.trim().toLowerCase().replace(/^wc-/, "").replace(/_/g, "-");
  return STATUS_MAP[normalized] ?? null;
}

function parsePlayerFields(row: CsvRow) {
  const fields: Record<string, string> = {};
  const explicit = pick(row, ["player_fields", "player_data"]);
  if (explicit) {
    try {
      const parsed = JSON.parse(explicit) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        if (key && value !== null && value !== undefined && String(value).trim()) {
          fields[key] = String(value).trim();
        }
      }
      return fields;
    } catch {
      for (const pair of explicit.split(/[;|]/)) {
        const index = pair.indexOf("=");
        const colon = pair.indexOf(":");
        const split = index > 0 ? index : colon;
        if (split > 0) {
          const key = pair.slice(0, split).trim();
          const value = pair.slice(split + 1).trim();
          if (key && value) fields[key] = value;
        }
      }
      return fields;
    }
  }

  const labels: Record<string, string> = {
    player_id: "Player ID",
    server_id: "Server ID",
    game_id: "Game ID",
    zone_id: "Zone ID",
    character_id: "Character ID",
  };
  for (const [key, label] of Object.entries(labels)) {
    const value = pick(row, [key]);
    if (value) fields[label] = value;
  }
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("player_field_") && value?.trim()) {
      fields[key.slice("player_field_".length).replace(/_/g, " ")] = value.trim();
    }
  }
  return fields;
}

function itemFromObject(raw: unknown): ItemRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = data[key] ?? data[key.replace(/_/g, " ")];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const name = get("name", "product_name", "title", "item_name");
  if (!name) return null;

  const quantity = parseQuantity(get("quantity", "qty", "item_quantity"));
  const explicitPrice = parseNumber(get("price", "unit_price"));
  const total = parseNumber(get("total", "line_total", "item_total", "subtotal"));
  const lineTotal = Number.isFinite(total)
    ? total
    : Number.isFinite(explicitPrice)
      ? round2(explicitPrice * quantity)
      : 0;
  const unitPrice = Number.isFinite(explicitPrice)
    ? explicitPrice
    : quantity > 0
      ? round2(lineTotal / quantity)
      : lineTotal;

  return {
    name,
    sku: get("sku", "variation_sku"),
    quantity,
    total: lineTotal,
    unitPrice,
  };
}

function parsePipeItems(cell: string) {
  return cell
    .split(/\|\|/)
    .map((group) => {
      const data: Record<string, unknown> = {};
      for (const part of group.split("|")) {
        const index = part.indexOf(":");
        if (index <= 0) continue;
        const key = part.slice(0, index).trim().toLowerCase();
        const value = part.slice(index + 1).trim();
        if (key && value) data[key] = value;
      }
      return itemFromObject(data);
    })
    .filter((item): item is ItemRecord => Boolean(item));
}

function parseItemCell(cell: string): ItemRecord[] {
  const value = cell.trim();
  if (!value) return [];

  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(itemFromObject).filter((item): item is ItemRecord => Boolean(item));
      }
      const item = itemFromObject(parsed);
      return item ? [item] : [];
    } catch {
      // Fall through to pipe/human parsing.
    }
  }

  if (value.includes("|")) {
    const items = parsePipeItems(value);
    if (items.length) return items;
  }

  const human = /^(.*?)\s*[x×]\s*(\d+)\s*$/i.exec(value);
  if (human && human[1].trim()) {
    const quantity = parseQuantity(human[2]);
    return [{ name: human[1].trim(), sku: "", quantity, total: 0, unitPrice: 0 }];
  }

  return [];
}

/** Columns that describe a line item rather than the whole order. */
const ITEM_COLUMN = /^(?:line_?items?|order_?items?|items?|line_|product_|variation_|sku$|quantity$|qty$|price$)/;

/** WooCommerce-style numbered item columns, e.g. "Item #1 Name" -> item_#1_name. */
const NUMBERED_ITEM = /^(?:line_?item|order_?item|item)_?#?(\d+)_(.+)$/;

function itemColumns(row: CsvRow) {
  const meta: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (ITEM_COLUMN.test(key) && value) meta[key] = value;
  }
  return meta;
}

function orderFieldsOf(rows: CsvRow[]) {
  const fields: Record<string, string> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!value || ITEM_COLUMN.test(key) || NUMBERED_ITEM.test(key)) continue;
      if (!(key in fields)) fields[key] = value;
    }
  }
  return fields;
}

function parseNumberedItems(rows: CsvRow[]): ItemRecord[] {
  const byIndex = new Map<number, Record<string, string>>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const match = NUMBERED_ITEM.exec(key);
      if (!match || !value) continue;
      const bucket = byIndex.get(Number(match[1])) ?? {};
      if (!(match[2] in bucket)) bucket[match[2]] = value;
      byIndex.set(Number(match[1]), bucket);
    }
  }

  return [...byIndex.keys()]
    .sort((a, b) => a - b)
    .map((index) => {
      const data = byIndex.get(index) ?? {};
      const name = data.name || data.product_name || data.item_name || data.title || "";
      const quantity = parseQuantity(data.quantity || data.qty || "");
      const total = parseNumber(data.total || data.line_total || data.item_total || "");
      const unitPrice = parseNumber(data.price || data.item_price || data.cost || "");
      return {
        name,
        sku: data.sku || data.variation_sku || "",
        quantity,
        total: Number.isFinite(total)
          ? total
          : Number.isFinite(unitPrice)
            ? round2(unitPrice * quantity)
            : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : Number.isFinite(total) ? round2(total / quantity) : 0,
        meta: data,
      };
    })
    .filter((item) => item.name);
}

function parseItems(rows: CsvRow[]) {
  const items: ItemRecord[] = [];

  for (const row of rows) {
    const name = pick(row, ["item_name", "order_item_name", "line_item_name"]);
    if (!name) continue;
    const quantity = parseQuantity(pick(row, ["item_quantity", "quantity", "qty"]));
    const unitPrice = parseNumber(pick(row, ["item_price", "price"]));
    const total = parseNumber(pick(row, ["item_total", "line_total"]));
    items.push({
      name,
      sku: pick(row, ["item_sku", "variation_sku", "sku"]),
      quantity,
      total: Number.isFinite(total)
        ? total
        : Number.isFinite(unitPrice)
          ? round2(unitPrice * quantity)
          : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : Number.isFinite(total) ? round2(total / quantity) : 0,
      meta: itemColumns(row),
    });
  }

  items.push(...parseNumberedItems(rows));

  const cell = pickGroup(rows, ["line_items", "order_items", "items"]);
  if (cell) items.push(...parseItemCell(cell));

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.sku.toLowerCase()}|${item.quantity}|${item.total}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeOrders(rows: CsvRow[]) {
  const errors: MigrationError[] = [];
  const warnings: string[] = [];
  const groups = new Map<string, { key: string; rows: CsvRow[]; rowNumbers: number[] }>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const key = pick(row, ["order_id", "order_number", "id"]).replace(/^#/, "");
    if (!key) {
      errors.push({ row: rowNumber, message: "Missing order_id or order_number." });
      return;
    }
    const group = groups.get(key) ?? { key, rows: [], rowNumbers: [] };
    group.rows.push(row);
    group.rowNumbers.push(rowNumber);
    groups.set(key, group);
  });

  const records: OrderRecord[] = [];

  for (const group of groups.values()) {
    const rowsInGroup = group.rows;
    const rawStatus = pickGroup(rowsInGroup, ["status", "order_status"]);
    const status = mapStatus(rawStatus || "completed");
    if (!status) {
      errors.push({
        row: group.rowNumbers[0],
        message: `Unknown order status "${rawStatus}" for order ${group.key}.`,
      });
      continue;
    }
    if (status === "skip") {
      warnings.push(`Order ${group.key} is a checkout draft and was skipped.`);
      continue;
    }

    const publicKey = group.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
    const publicId = `GT-WC-${publicKey}`;
    const email = cleanEmail(
      pickGroup(rowsInGroup, ["billing_email", "customer_email", "email"]),
    );
    const customer = customerName(rowsInGroup[0]);
    const items = parseItems(rowsInGroup);
    const itemSubtotal = round2(items.reduce((sum, item) => sum + item.total, 0));

    const rawTotal = parseNumber(pickGroup(rowsInGroup, ["order_total", "total", "order_total_amount"]));
    const total = Number.isFinite(rawTotal) ? rawTotal : itemSubtotal;
    if (!Number.isFinite(total)) {
      errors.push({ row: group.rowNumbers[0], message: `Order ${group.key} has no valid total.` });
      continue;
    }

    const rawSubtotal = parseNumber(
      pickGroup(rowsInGroup, ["order_subtotal", "subtotal", "cart_subtotal"]),
    );
    const subtotal = Number.isFinite(rawSubtotal)
      ? Math.max(rawSubtotal, total)
      : Math.max(itemSubtotal, total);
    const rawDiscount = parseNumber(
      pickGroup(rowsInGroup, ["discount_total", "order_discount", "coupon_amount"]),
    );
    const discount = Number.isFinite(rawDiscount)
      ? Math.min(Math.max(rawDiscount, 0), subtotal)
      : Math.max(0, round2(subtotal - total));

    const rawWallet = parseNumber(pickGroup(rowsInGroup, ["wallet_amount", "wallet_paid"]));
    const walletAmount = Number.isFinite(rawWallet)
      ? Math.min(Math.max(rawWallet, 0), total)
      : 0;

    const orderDate = parseDate(
      pickGroup(rowsInGroup, ["order_date", "date_created", "date", "created_at"]),
    );
    const paidDate = parseDate(
      pickGroup(rowsInGroup, ["paid_date", "date_paid", "payment_date"]),
    );
    const completedDate = parseDate(
      pickGroup(rowsInGroup, ["completed_date", "date_completed"]),
    );
    const createdAt = orderDate ?? new Date();
    const isPaid = ["paid", "processing", "completed", "refunded", "on_hold"].includes(status);

    if (!orderDate) warnings.push(`Order ${group.key} has no valid date; import time was used.`);
    if (!email || !isEmail(email)) {
      warnings.push(`Order ${group.key} has no valid customer email; a guest customer will be created.`);
    }
    if (!items.length) {
      warnings.push(`Order ${group.key} has no line items; a summary item was created.`);
      items.push({
        name: `Order ${group.key}`,
        sku: "",
        quantity: 1,
        total,
        unitPrice: total,
      });
    }

    const rawRefund = parseNumber(
      pickGroup(rowsInGroup, ["refund_total", "refund_amount", "total_refunded"]),
    );
    const refundTotal = Number.isFinite(rawRefund) ? Math.min(Math.max(rawRefund, 0), total) : 0;

    records.push({
      key: group.key,
      publicId,
      email: email && isEmail(email) ? email : "",
      customerName: customer || "Guest",
      phone: pickGroup(rowsInGroup, ["billing_phone", "customer_phone", "phone"]),
      status,
      total,
      subtotal,
      discount,
      walletAmount,
      paymentMethod:
        pickGroup(rowsInGroup, ["payment_method_title", "payment_method", "payment_gateway"]) ||
        "woocommerce",
      customerNote: pickGroup(rowsInGroup, ["customer_note", "customer_message"]),
      notes: pickGroup(rowsInGroup, ["order_notes", "notes", "admin_notes"]),
      playerFields: parsePlayerFields(rowsInGroup[0]),
      importedFields: orderFieldsOf(rowsInGroup),
      transactionId: pickGroup(rowsInGroup, ["transaction_id", "transaction_ref", "payment_transaction_id"]),
      items,
      createdAt,
      paidAt: isPaid ? paidDate ?? completedDate ?? orderDate ?? createdAt : null,
      completedAt: status === "completed" || status === "refunded" ? completedDate ?? paidDate ?? orderDate ?? createdAt : null,
      refundTotal,
      row: group.rowNumbers[0],
      rowNumbers: group.rowNumbers,
    });
  }

  return { records, errors, warnings };
}

export async function previewOrderImport(text: string): Promise<MigrationPreview> {
  const { rows, headers } = rowsFromCsv(text);
  if (!headers.some((header) => ["order_id", "order_number"].includes(header))) {
    return {
      kind: "orders",
      totalRows: rows.length,
      groups: 0,
      newGroups: 0,
      existingGroups: 0,
      errors: [{ row: 1, message: "Missing order_id or order_number column." }],
      warnings: [],
      items: [],
    };
  }

  const { records, errors, warnings } = normalizeOrders(rows);
  const db = await getDb();
  const existingRows = await db.select({ publicId: orders.publicId }).from(orders);
  const existing = new Set(existingRows.map((row) => row.publicId));
  const newRecords = records.filter((record) => !existing.has(record.publicId));

  return {
    kind: "orders",
    totalRows: rows.length,
    groups: records.length,
    newGroups: newRecords.length,
    existingGroups: records.length - newRecords.length,
    errors,
    warnings: [
      ...warnings,
      ...(records.length > MAX_PREVIEW_ITEMS
        ? [`Showing the first ${MAX_PREVIEW_ITEMS} orders in this preview.`]
        : []),
    ],
    items: records.slice(0, MAX_PREVIEW_ITEMS).map((record) => ({
      key: record.key,
      label: `Order #${record.key}`,
      email: record.email || "(guest)",
      total: record.total,
      status: record.status,
      exists: existing.has(record.publicId),
      rows: record.rowNumbers,
    })),
  };
}

type CatalogItem = {
  productId: number | null;
  variationId: number | null;
  productName: string;
  variationName: string;
  image: string | null;
  sku: string;
};

function resolveCatalogItem(
  item: ItemRecord,
  catalog: {
    productsById: Map<number, { name: string; image: string | null }>;
    productBySku: Map<string, { id: number; name: string; image: string | null }>;
    variationBySku: Map<string, { id: number; productId: number; name: string; image: string | null }>;
    productByName: Map<string, { id: number; name: string; image: string | null }>;
    variationByName: Map<string, { id: number; productId: number; name: string; image: string | null }>;
    combination: Map<string, { id: number; productId: number; name: string; image: string | null }>;
  },
): CatalogItem {
  const sku = item.sku.toLowerCase();
  if (sku && catalog.variationBySku.has(sku)) {
    const variation = catalog.variationBySku.get(sku)!;
    const product = catalog.productsById.get(variation.productId);
    return {
      productId: variation.productId,
      variationId: variation.id,
      productName: product?.name ?? item.name,
      variationName: variation.name,
      image: variation.image ?? product?.image ?? null,
      sku: item.sku,
    };
  }
  if (sku && catalog.productBySku.has(sku)) {
    const product = catalog.productBySku.get(sku)!;
    return {
      productId: product.id,
      variationId: null,
      productName: product.name,
      variationName: item.name,
      image: product.image,
      sku: item.sku,
    };
  }

  const name = item.name.toLowerCase();
  if (catalog.variationByName.has(name)) {
    const variation = catalog.variationByName.get(name)!;
    const product = catalog.productsById.get(variation.productId);
    return {
      productId: variation.productId,
      variationId: variation.id,
      productName: product?.name ?? item.name,
      variationName: variation.name,
      image: variation.image ?? product?.image ?? null,
      sku: item.sku,
    };
  }
  if (catalog.productByName.has(name)) {
    const product = catalog.productByName.get(name)!;
    return {
      productId: product.id,
      variationId: null,
      productName: product.name,
      variationName: item.name,
      image: product.image,
      sku: item.sku,
    };
  }
  if (catalog.combination.has(name)) {
    const variation = catalog.combination.get(name)!;
    const product = catalog.productsById.get(variation.productId);
    return {
      productId: variation.productId,
      variationId: variation.id,
      productName: product?.name ?? item.name,
      variationName: variation.name,
      image: variation.image ?? product?.image ?? null,
      sku: item.sku,
    };
  }

  return {
    productId: null,
    variationId: null,
    productName: item.name,
    variationName: item.name,
    image: null,
    sku: item.sku,
  };
}

async function loadCatalog() {
  const db = await getDb();
  const productRows = await db
    .select({ id: products.id, name: products.name, sku: products.sku, image: products.image })
    .from(products);
  const variationRows = await db
    .select({
      id: variations.id,
      productId: variations.productId,
      name: variations.name,
      sku: variations.sku,
      image: variations.image,
    })
    .from(variations);

  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const productBySku = new Map(
    productRows.filter((row) => row.sku).map((row) => [row.sku!.toLowerCase(), row]),
  );
  const variationBySku = new Map(
    variationRows.filter((row) => row.sku).map((row) => [row.sku!.toLowerCase(), row]),
  );
  const productByName = new Map(productRows.map((row) => [row.name.toLowerCase(), row]));
  const variationByName = new Map(variationRows.map((row) => [row.name.toLowerCase(), row]));
  const combination = new Map<string, (typeof variationRows)[number]>();
  for (const variation of variationRows) {
    const product = productsById.get(variation.productId);
    if (product) {
      combination.set(`${product.name} - ${variation.name}`.toLowerCase(), variation);
    }
  }

  return {
    productsById,
    productBySku,
    variationBySku,
    productByName,
    variationByName,
    combination,
  };
}

export async function importOrders(text: string): Promise<MigrationResult> {
  const { records, errors, warnings } = normalizeOrders(rowsFromCsv(text).rows);
  if (errors.length) {
    return { imported: 0, skipped: 0, customersCreated: 0, errors, warnings };
  }

  const db = await getDb();
  const existingRows = await db.select({ publicId: orders.publicId }).from(orders);
  const existing = new Set(existingRows.map((row) => row.publicId));
  const userRows = await db.select({ id: users.id, email: users.email }).from(users);
  const usersByEmail = new Map(userRows.map((row) => [row.email.toLowerCase(), row.id]));
  const catalog = await loadCatalog();

  let imported = 0;
  let skipped = 0;
  let customersCreated = 0;
  const importErrors: MigrationError[] = [];

  for (const record of records) {
    if (existing.has(record.publicId)) {
      skipped += 1;
      continue;
    }

    const guestEmail = `guest-${record.publicId.toLowerCase()}@imported.local`;
    const email = record.email || guestEmail;
    let customerCreated = false;
    let resolvedUserId = "";

    try {
      await db.transaction(async (tx) => {
        let userId = usersByEmail.get(email);
        if (!userId) {
          userId = newId();
          await tx.insert(users).values({
            id: userId,
            email,
            name: record.customerName,
            phone: record.phone,
            passwordHash: null,
            createdAt: record.createdAt,
            updatedAt: new Date(),
          });
          await tx.insert(wallets).values({ userId, balance: "0" }).onConflictDoNothing();
          customerCreated = true;
        }
        resolvedUserId = userId;

        const [order] = await tx
          .insert(orders)
          .values({
            publicId: record.publicId,
            userId,
            status: record.status,
            paymentStatus:
              record.status === "refunded"
                ? "refunded"
                : record.paidAt
                  ? "paid"
                  : record.status === "cancelled" || record.status === "failed"
                    ? "failed"
                    : "pending",
            fulfillmentStatus: fulfillmentStatusFor(record.status) ?? "pending",
            subtotal: record.subtotal.toFixed(2),
            discount: record.discount.toFixed(2),
            total: record.total.toFixed(2),
            walletAmount: record.walletAmount.toFixed(2),
            gatewayAmount: (record.status === "pending_payment" || record.status === "cancelled" || record.status === "failed"
              ? 0
              : record.total - record.walletAmount
            ).toFixed(2),
            itemCount: record.items.reduce((sum, item) => sum + item.quantity, 0),
            paymentMethod: record.paymentMethod,
            playerFields: record.playerFields,
            customerNote: record.customerNote,
            adminNote: record.notes,
            importedData: { platform: "woocommerce", orderNumber: record.key, fields: record.importedFields },
            paidAt: record.paidAt,
            completedAt: record.completedAt,
            createdAt: record.createdAt,
            updatedAt: record.completedAt ?? record.createdAt,
          })
          .returning({ id: orders.id });

        for (const item of record.items) {
          const catalogItem = resolveCatalogItem(item, catalog);
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: catalogItem.productId,
            variationId: catalogItem.variationId,
            productName: catalogItem.productName,
            variationName: catalogItem.variationName,
            sku: catalogItem.sku || null,
            image: catalogItem.image,
            unitPrice: item.unitPrice.toFixed(2),
            quantity: item.quantity,
            lineTotal: item.total.toFixed(2),
            importedData: item.meta ?? {},
          });
        }

        await tx.insert(orderHistory).values({
          orderId: order.id,
          fromStatus: null,
          toStatus: record.status,
          changedByType: "system",
          changedById: null,
          note: `Imported from WooCommerce order #${record.key}.`,
          createdAt: record.createdAt,
        });

        if (record.notes) {
          await tx.insert(orderNotes).values({
            orderId: order.id,
            adminId: null,
            content: record.notes,
            createdAt: record.createdAt,
          });
        }

        if (record.status !== "pending_payment" && record.status !== "cancelled" && record.status !== "failed") {
          const [payment] = await tx
            .insert(payments)
            .values({
              id: newId(),
              userId,
              orderId: order.id,
              type: "order",
              gateway: "woocommerce",
              invoiceId: `woo-${record.publicId}`,
              transactionId: record.transactionId || record.key,
              amount: (record.total - record.walletAmount).toFixed(2),
              status: record.status === "refunded" ? "refunded" : "completed",
              paymentMethod: record.paymentMethod,
              raw: { source: "woocommerce", orderNumber: record.key, status: record.status },
              completedAt: record.paidAt ?? record.createdAt,
            })
            .returning({ id: payments.id });

          if (record.refundTotal > 0) {
            await tx.insert(refunds).values({
              id: newId(),
              orderId: order.id,
              paymentId: payment.id,
              userId,
              amount: record.refundTotal.toFixed(2),
              method: "gateway",
              reason: "Imported from WooCommerce.",
              gatewayReference: record.key,
              status: "completed",
              processedByAdminId: null,
            });
          }
        } else if (record.refundTotal > 0) {
          await tx.insert(refunds).values({
            id: newId(),
            orderId: order.id,
            paymentId: null,
            userId,
            amount: record.refundTotal.toFixed(2),
            method: "gateway",
            reason: "Imported from WooCommerce.",
            gatewayReference: record.key,
            status: "completed",
            processedByAdminId: null,
          });
        }
      });

      if (customerCreated) {
        customersCreated += 1;
        usersByEmail.set(email, resolvedUserId);
      }
      existing.add(record.publicId);
      imported += 1;
    } catch (error) {
      importErrors.push({
        row: record.row,
        message: `Order ${record.key}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    imported,
    skipped,
    customersCreated,
    errors: importErrors,
    warnings: [
      ...warnings,
      "Imported orders do not change wallet balances or create wallet ledger entries.",
    ],
  };
}
