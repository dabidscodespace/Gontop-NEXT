// src/api/services/categoryService.js

import { publicApi } from "../axios";
import { FIELDS } from "../config";
import { Cache } from "../utils/cache";
import { fetchCached } from "../utils/helpers";

/**
 * Get all categories
 */
export const getAllCategories = () => {
  const cacheKey = Cache.key("categories", "all");

  return fetchCached(
    cacheKey,
    () =>
      publicApi.get("/products/categories", {
        params: {
          per_page: 100,
          hide_empty: true,
          orderby: "name",
          order: "asc",
          _fields: FIELDS.category,
        },
      }),
    []
  );
};

/**
 * Get single category by ID
 */
export const getCategoryById = (categoryId) => {
  if (!categoryId) return Promise.resolve(null);

  const cacheKey = Cache.key("category", categoryId);

  return fetchCached(
    cacheKey,
    () =>
      publicApi.get(`/products/categories/${categoryId}`, {
        params: { _fields: FIELDS.category },
      }),
    null
  );
};

/**
 * Get category by slug
 */
export const getCategoryBySlug = (slug) => {
  if (!slug) return Promise.resolve(null);

  const cacheKey = Cache.key("category-slug", slug);

  return fetchCached(
    cacheKey,
    async () => {
      const { data } = await publicApi.get("/products/categories", {
        params: {
          slug,
          _fields: FIELDS.category,
        },
      });
      return data?.[0] || null;
    },
    null
  );
};