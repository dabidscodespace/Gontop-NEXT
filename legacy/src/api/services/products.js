// src/api/services/productService.js

import { publicApi } from "../axios";
import { FIELDS } from "../config";
import { Cache } from "../utils/cache";
import { fetchCached, fetchSafe } from "../utils/helpers";

const DEFAULT_PRODUCT_PARAMS = {
  status: "publish",
  orderby: "menu_order",
  order: "asc",
};

/**
 * Get all products (with optional category filter)
 */
export const getAllProducts = (perPage = 12, categoryId = null) => {
  const cacheKey = categoryId
    ? Cache.key("products-cat", categoryId, perPage)
    : Cache.key("products", perPage);

  const params = {
    ...DEFAULT_PRODUCT_PARAMS,
    per_page: Math.min(perPage, 20),
    _fields: FIELDS.productList,
  };

  if (categoryId) params.category = categoryId;

  return fetchCached(
    cacheKey,
    () => publicApi.get("/products", { params }),
    [],
  );
};

/**
 * Get products by category ID
 */
export const getProductsByCategoryId = (categoryId, perPage = 40) => {
  if (!categoryId) return Promise.resolve([]);

  // ✅ Support array of category IDs
  if (Array.isArray(categoryId)) {
    return Promise.all(
      categoryId.map((id) => getProductsByCategoryId(id, perPage)),
    ).then((results) => results.flat());
  }

  const cacheKey = Cache.key("products-cat", categoryId, perPage);

  return fetchCached(
    cacheKey,
    () =>
      publicApi.get("/products", {
        params: {
          ...DEFAULT_PRODUCT_PARAMS,
          category: categoryId,
          per_page: Math.min(perPage, 40),
          _fields: FIELDS.productCategory,
        },
      }),
    [],
  );
};

/**
 * Get single product by slug
 */
export const getProductBySlug = async (slug) => {
  if (!slug) return null;

  const cacheKey = Cache.key("product", slug);

  const data = await fetchCached(
    cacheKey,
    () =>
      publicApi.get("/products", {
        params: {
          ...DEFAULT_PRODUCT_PARAMS,
          slug,
          _fields: FIELDS.productDetail,
        },
      }),
    [],
  );

  return Array.isArray(data) ? data[0] || null : null;
};

/**
 * Get product variations (NO CACHE - prices change frequently)
 */
export const getProductVariations = async (productId) => {
  if (!productId) return [];

  return fetchSafe(
    () =>
      publicApi.get(`/products/${productId}/variations`, {
        params: {
          per_page: 50,
          orderby: "menu_order",
          order: "asc",
          status: "publish",
          _fields: FIELDS.variation,
        },
      }),
    [],
  );
};

/**
 * Get product with variations (combined)
 */
export const getProductAndVariations = async (slug) => {
  const product = await getProductBySlug(slug);

  if (!product?.id) {
    return { product: null, variations: [] };
  }

  const variations = await getProductVariations(product.id);

  return { product, variations };
};

/**
 * Get product game inputs
 */
export const getProductGameInputs = async (productId) => {
  if (!productId) return null;

  const cacheKey = Cache.key("game-inputs", productId);

  const data = await fetchCached(
    cacheKey,
    () =>
      publicApi.get(`/products/${productId}`, {
        params: { _fields: "id,game_inputs" },
      }),
    null,
  );

  return data?.game_inputs || null;
};

/**
 * Search products
 */
export const searchProducts = async (searchQuery, perPage = 20) => {
  if (!searchQuery?.trim()) return [];

  const cacheKey = Cache.key(
    "search",
    searchQuery.toLowerCase().trim(),
    perPage,
  );

  return fetchCached(
    cacheKey,
    () =>
      publicApi.get("/products", {
        params: {
          ...DEFAULT_PRODUCT_PARAMS,
          search: searchQuery,
          per_page: Math.min(perPage, 20),
          _fields: FIELDS.productList,
        },
      }),
    [],
  );
};

/**
 * Manually clear products cache
 */
export const clearProductsCache = () => {
  Cache.clear();
};
