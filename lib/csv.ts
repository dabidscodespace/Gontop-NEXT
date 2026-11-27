import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { games, products, variations } from "@/db/schema";
import { getDb } from "@/lib/db";
import { money, round2 } from "@/lib/money";

export type CsvRow = Record<string, string>;

export const IMPORT_COLUMNS = [
  "product_name",
  "product_slug",
  "game_slug",
  "game_name",
  "description",
  "short_description",
  "product_image",
  "product_sku",
  "price",
  "variation_name",
  "variation_sku",
  "regular_price",
  "sale_price",
  "variation_image",
  "variation_description",
  "stock_quantity",
  "stock_status",
  "is_active",
] as const;

/** RFC 4180 parser — supports quoted values, escaped quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  const escape = (value: string | number | null) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

type ParseResult = {
  headers: string[];
  rows: CsvRow[];
};

export function rowsFromCsv(text: string): ParseResult {
  const parsed = parseCsv(text);
  if (parsed.length < 2) {
    return { headers: parsed[0] ?? [], rows: [] };
  }
  const rawHeaders = parsed[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rawRows = parsed.slice(1).map((cells) => {
    const row: CsvRow = {};
    rawHeaders.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });

  const rows = isWooCommerceExport(rawHeaders)
    ? normalizeWooCommerceRows(rawRows)
    : normalizeAliasColumns(rawRows);

  // The required-column check must see both the original headers and any
  // columns produced by the WooCommerce/alias normalizer.
  const headers = [...new Set([...rawHeaders, ...rows.flatMap((row) => Object.keys(row))])];
  return { headers, rows };
}

/**
 * WooCommerce "Export all columns" uses different headers, keeps the variable
 * product on its own row and puts each variation on a child row. This converts
 * that shape into the one-row-per-variation format used by the importer.
 */
function isWooCommerceExport(headers: string[]) {
  return (
    !headers.includes("product_name") &&
    headers.includes("name") &&
    (headers.includes("type") || headers.includes("parent") || headers.includes("categories"))
  );
}

function firstImage(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean) ?? "";
}

/** Turn "Games > Mobile Legends" / "Mobile Legends, Games" into "Mobile Legends". */
function gameNameFromCategories(value: string | undefined) {
  const leaves = (value ?? "")
    .split(",")
    .map((category) => category.split(">").pop()?.trim() ?? "")
    .filter(Boolean);
  return leaves.find((leaf) => !/^(games?|top[ -]?ups?|all)$/i.test(leaf)) ?? leaves[0] ?? "";
}

function isWooParent(row: CsvRow) {
  const type = (row.type ?? "").toLowerCase();
  return type === "variable" || type === "grouped";
}

function findWooParent(
  row: CsvRow,
  bySku: Map<string, CsvRow>,
  byName: Map<string, CsvRow>,
  parents: CsvRow[],
) {
  const key = (row.parent ?? "").trim().toLowerCase();
  const direct = (key && bySku.get(key)) || (key && byName.get(key));
  if (direct) return direct;

  // Some exports put the parent ID in `parent`; fall back to the longest parent
  // name that prefixes the variation name.
  const name = (row.name ?? "").toLowerCase();
  return parents
    .filter((parent) => parent.name && name.startsWith(parent.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

function normalizeWooCommerceRows(rawRows: CsvRow[]): CsvRow[] {
  const parents = rawRows.filter(isWooParent);
  const bySku = new Map<string, CsvRow>();
  const byName = new Map<string, CsvRow>();
  for (const parent of parents) {
    if (parent.sku) bySku.set(parent.sku.toLowerCase(), parent);
    if (parent.name) byName.set(parent.name.toLowerCase(), parent);
  }

  const normalized: CsvRow[] = [];

  for (const row of rawRows) {
    const type = (row.type ?? "").toLowerCase();
    if (type === "variable" || type === "grouped" || type === "external") continue;
    if (type && type !== "variation" && type !== "simple") continue;

    const parent = type === "variation" ? findWooParent(row, bySku, byName, parents) : undefined;
    const productName = parent?.name || row.name || "";
    const categories = parent?.categories || row.categories || "";
    const gameName = gameNameFromCategories(categories);

    const attributes = [1, 2, 3, 4, 5, 6]
      .map((index) => row[`attribute_${index}_value(s)`] || row[`attribute_${index}_values`])
      .filter(Boolean)
      .join(" / ");

    let variationName = attributes || row.name || "Default";
    if (!attributes && parent?.name && variationName.startsWith(parent.name)) {
      variationName = variationName
        .slice(parent.name.length)
        .replace(/^\s*[-–—:]\s*/, "")
        .trim() || "Default";
    }

    const inStock = (row.in_stock ?? row["in_stock?"] ?? "").trim();
    const stockStatus =
      row.stock_status?.trim() ||
      (inStock === "0" ? "outofstock" : inStock === "1" ? "instock" : "");

    normalized.push({
      product_name: productName,
      product_slug: parent?.slug || row.slug || slugify(productName),
      game_name: gameName,
      game_slug: gameName ? slugify(gameName) : "",
      description: parent?.description || row.description || "",
      short_description: parent?.short_description || row.short_description || "",
      product_image: firstImage(parent?.images) || firstImage(row.images),
      product_sku: parent?.sku || (type === "variation" ? "" : row.sku || ""),
      regular_price: row.regular_price || "",
      sale_price: row.sale_price || "",
      price: row.price || "",
      variation_name: variationName,
      variation_sku: type === "variation" ? row.sku || "" : "",
      variation_image: firstImage(row.images),
      variation_description: type === "variation" ? row.description || "" : "",
      stock_quantity: row.stock_quantity || row.stock || "",
      stock_status: stockStatus,
      is_active: row.published === "0" ? "0" : "1",
    });
  }

  return normalized;
}

/** Accept friendlier headings (name, slug, sku, images, categories) too. */
function normalizeAliasColumns(rawRows: CsvRow[]): CsvRow[] {
  return rawRows.map((row) => {
    const gameName = row.game_name || gameNameFromCategories(row.categories);
    return {
      ...row,
      product_name: row.product_name || row.name || "",
      product_slug: row.product_slug || row.slug || "",
      game_name: gameName,
      game_slug: row.game_slug || (gameName ? slugify(gameName) : ""),
      product_image: row.product_image || firstImage(row.images),
      product_sku: row.product_sku || row.sku || "",
      variation_name: row.variation_name || row.name || "",
      stock_status:
        row.stock_status || (row.in_stock === "0" ? "outofstock" : row.in_stock === "1" ? "instock" : ""),
    };
  });
}

export type ImportPreview = {
  totalRows: number;
  products: number;
  validProducts: number;
  skippedProducts: number;
  errors: Array<{ row: number; message: string }>;
  warnings: string[];
  items: Array<{
    productSlug: string;
    productName: string;
    gameSlug: string;
    exists: boolean;
    variationCount: number;
    minPrice: number;
    image: string;
    rows: number[];
  }>;
  gamesToCreate: string[];
};

function priceOf(row: CsvRow) {
  const raw = row.sale_price || row.regular_price || row.price || "0";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? round2(n) : NaN;
}

export async function previewImport(text: string): Promise<ImportPreview> {
  const { headers, rows } = rowsFromCsv(text);
  const errors: ImportPreview["errors"] = [];
  const warnings: string[] = [];

  const missing = ["product_slug", "product_name", "variation_name"].filter(
    (column) => !headers.includes(column),
  );
  if (missing.length) {
    return {
      totalRows: 0,
      products: 0,
      validProducts: 0,
      skippedProducts: 0,
      errors: [{ row: 1, message: `Missing required columns: ${missing.join(", ")}` }],
      warnings,
      items: [],
      gamesToCreate: [],
    };
  }

  const db = await getDb();
  const existingProducts = await db
    .select({ slug: products.slug, sku: products.sku })
    .from(products);
  const existingVariations = await db
    .select({ sku: variations.sku })
    .from(variations);
  const existingGames = await db.select({ slug: games.slug }).from(games);

  const productSlugs = new Set(existingProducts.map((p) => p.slug));
  const dbSlugs = new Set(existingProducts.map((p) => p.slug));
  // SKUs are globally unique, but a WooCommerce product SKU legitimately
  // repeats on every variation row of the same product.
  const skuOwner = new Map<string, { slug: string; kind: "product" | "variation" | "db" }>();
  for (const p of existingProducts) {
    if (p.sku) skuOwner.set(p.sku.toLowerCase(), { slug: p.slug, kind: "db" });
  }
  for (const v of existingVariations) {
    if (v.sku) skuOwner.set(v.sku.toLowerCase(), { slug: "", kind: "db" });
  }

  const gamesToCreate = new Set<string>();
  const groupMap = new Map<string, ImportPreview["items"][number]>();
  const seenSlugs = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const slug = (row.product_slug || slugify(row.product_name || "")).trim();
    const productName = row.product_name?.trim();
    const variationName = row.variation_name?.trim();
    const gameSlug = (row.game_slug || slugify(row.game_name || "")).trim();

    if (!slug) return errors.push({ row: rowNumber, message: "Missing product slug." });
    if (!productName) return errors.push({ row: rowNumber, message: "Missing product name." });
    if (!variationName)
      return errors.push({ row: rowNumber, message: "Missing variation/package name." });
    if (!gameSlug)
      return errors.push({
        row: rowNumber,
        message: "Missing game_slug (or game_name to derive one).",
      });

    const price = priceOf(row);
    if (!Number.isFinite(price) || price < 0) {
      return errors.push({ row: rowNumber, message: `Invalid price "${row.price}".` });
    }

    const productSku = row.product_sku?.trim().toLowerCase();
    if (productSku && !dbSlugs.has(slug)) {
      const owner = skuOwner.get(productSku);
      if (owner && !(owner.kind === "product" && owner.slug === slug)) {
        errors.push({
          row: rowNumber,
          message: `Duplicate SKU "${productSku}" already exists or is used by another row.`,
        });
        return;
      }
      skuOwner.set(productSku, { slug, kind: "product" });
    }

    const variationSku = row.variation_sku?.trim().toLowerCase();
    if (variationSku && !dbSlugs.has(slug)) {
      if (skuOwner.has(variationSku)) {
        errors.push({
          row: rowNumber,
          message: `Duplicate SKU "${variationSku}" already exists or appears earlier in the file.`,
        });
        return;
      }
      skuOwner.set(variationSku, { slug, kind: "variation" });
    }

    if (!existingGames.some((game) => game.slug === gameSlug)) {
      gamesToCreate.add(`${gameSlug}${row.game_name ? ` (${row.game_name})` : ""}`);
    }

    const group = groupMap.get(slug);
    if (group) {
      group.variationCount += 1;
      group.minPrice = Math.min(group.minPrice, price);
      group.rows.push(rowNumber);
      if (seenSlugs.has(slug)) {
        // first occurrence already registered; same slug is a valid variation row
      }
    } else {
      const exists = productSlugs.has(slug);
      groupMap.set(slug, {
        productSlug: slug,
        productName,
        gameSlug,
        exists,
        variationCount: 1,
        minPrice: price,
        image: row.product_image || row.variation_image || "",
        rows: [rowNumber],
      });
      if (exists) warnings.push(`Product "${slug}" already exists and will be skipped.`);
      seenSlugs.add(slug);
      productSlugs.add(slug);
    }
  });

  const items = [...groupMap.values()];

  return {
    totalRows: rows.length,
    products: items.length,
    validProducts: items.filter((item) => !item.exists).length,
    skippedProducts: items.filter((item) => item.exists).length,
    errors,
    warnings,
    items,
    gamesToCreate: [...gamesToCreate],
  };
}

export async function importProducts(text: string, options: { createMissingGames: boolean }) {
  const preview = await previewImport(text);
  const { rows } = rowsFromCsv(text);

  if (preview.errors.length > 0) {
    return { ...preview, imported: 0, importedVariations: 0, skipped: preview.skippedProducts };
  }

  const db = await getDb();
  const gameRows = await db.select().from(games);
  const gameBySlug = new Map(gameRows.map((game) => [game.slug, game]));

  const grouped = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const slug = row.product_slug || slugify(row.product_name || "");
    const list = grouped.get(slug) ?? [];
    list.push(row);
    grouped.set(slug, list);
  }

  let imported = 0;
  let importedVariations = 0;
  let skipped = 0;

  for (const [slug, groupRows] of grouped) {
    const first = groupRows[0];
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (exists[0]) {
      skipped += 1;
      continue;
    }

    const gameSlug = (first.game_slug || slugify(first.game_name || "")).trim();
    let game = gameBySlug.get(gameSlug);

    if (!game) {
      if (!options.createMissingGames) {
        skipped += 1;
        continue;
      }
      const [created] = await db
        .insert(games)
        .values({
          name: first.game_name?.trim() || gameSlug.replace(/-/g, " "),
          slug: gameSlug,
          image: first.product_image || null,
          isActive: true,
        })
        .returning();
      game = created;
      gameBySlug.set(gameSlug, created);
    }

    const prices = groupRows.map(priceOf);
    const basePrice = Math.min(...prices);

    await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          gameId: game.id,
          name: first.product_name.trim(),
          slug,
          sku: first.product_sku?.trim() || null,
          description: first.description || "",
          shortDescription: first.short_description || "",
          image: first.product_image || first.variation_image || null,
          price: basePrice.toFixed(2),
          availability: first.is_active !== "0" && first.is_active !== "false" ? "available" : "disabled",
          status: first.published === "0" ? "draft" : "published",
          productType: groupRows.length > 1 ? "variable" : "simple",
        })
        .returning();

      const skuSeen = new Set<string>();
      let order = 0;

      for (const row of groupRows) {
        const variationSku = row.variation_sku?.trim() || null;
        if (variationSku && skuSeen.has(variationSku.toLowerCase())) continue;
        if (variationSku) skuSeen.add(variationSku.toLowerCase());

        const sale = row.sale_price ? Number.parseFloat(row.sale_price) : NaN;
        const regular = row.regular_price ? Number.parseFloat(row.regular_price) : NaN;
        const price = priceOf(row);
        const compareAt = Number.isFinite(sale) && Number.isFinite(regular) && regular > sale ? regular : null;
        const quantity = row.stock_quantity ? Number.parseInt(row.stock_quantity, 10) : null;

        await tx.insert(variations).values({
          productId: product.id,
          name: row.variation_name.trim(),
          sku: variationSku,
          description: row.variation_description || "",
          price: price.toFixed(2),
          compareAtPrice: compareAt ? compareAt.toFixed(2) : null,
          image: row.variation_image || null,
          stockStatus: row.stock_status === "outofstock" ? "outofstock" : "instock",
          stockQuantity: Number.isFinite(quantity) ? quantity : null,
          sortOrder: order++,
          availability: "available",
          status: row.published === "0" ? "draft" : "published",
        });
        importedVariations += 1;
      }
    });

    imported += 1;
  }

  return { ...preview, imported, importedVariations, skipped };
}

export async function exportProductsCsv() {
  const db = await getDb();
  const rows = await db
    .select({
      productName: products.name,
      productSlug: products.slug,
      gameSlug: games.slug,
      gameName: games.name,
      description: products.description,
      shortDescription: products.shortDescription,
      productImage: products.image,
      productSku: products.sku,
      variationName: variations.name,
      variationSku: variations.sku,
      price: variations.price,
      compareAtPrice: variations.compareAtPrice,
      variationImage: variations.image,
      variationDescription: variations.description,
      stockQuantity: variations.stockQuantity,
      stockStatus: variations.stockStatus,
    })
    .from(products)
    .innerJoin(games, eq(games.id, products.gameId))
    .leftJoin(variations, eq(variations.productId, products.id))
    .orderBy(products.sortOrder, products.id, variations.sortOrder);

  const headers = [
    "product_name",
    "product_slug",
    "game_slug",
    "game_name",
    "description",
    "short_description",
    "product_image",
    "product_sku",
    "price",
    "variation_name",
    "variation_sku",
    "regular_price",
    "sale_price",
    "variation_image",
    "variation_description",
    "stock_quantity",
    "stock_status",
  ];

  const body = rows.map((row) => [
    row.productName,
    row.productSlug,
    row.gameSlug,
    row.gameName,
    row.description,
    row.shortDescription,
    row.productImage,
    row.productSku,
    row.price,
    row.variationName,
    row.variationSku,
    row.compareAtPrice ?? row.price,
    row.compareAtPrice ? row.price : "",
    row.variationImage,
    row.variationDescription,
    row.stockQuantity,
    row.stockStatus,
  ]);

  return toCsv(headers, body);
}

export async function productBulkSummary(ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  return db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(inArray(products.id, ids)))
    .limit(100);
}
