// src/hooks/useFreshData.js

import { useCallback, useEffect, useRef, useState } from "react";
import { cacheEvents } from "../api/utils/cacheEvents";

/**
 * 🔥 Main hook for data fetching with auto-refresh
 *
 * Features:
 * - Fetches data on mount
 * - Auto-refreshes when cache is invalidated (no page reload!)
 * - Prevents duplicate requests
 * - Handles loading/error states
 */
export function useFreshData(key, fetchFn, initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep fetchFn reference updated
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const fetchData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);

        const result = await fetchFnRef.current();

        if (isMounted.current) {
          setData(result);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err);
          console.error(`Error fetching ${key}:`, err);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [key],
  );

  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    fetchData(true);

    // 🔥 Subscribe to cache invalidation
    const unsubscribeKey = cacheEvents.subscribe(key, () => {
      console.log(`🔄 Refetching: ${key}`);
      fetchData(false); // Background refresh (no loading spinner)
    });

    const unsubscribeAll = cacheEvents.subscribe("all", () => {
      console.log(`🔄 Refetching (all): ${key}`);
      fetchData(false);
    });

    return () => {
      isMounted.current = false;
      unsubscribeKey();
      unsubscribeAll();
    };
  }, [key, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}

// =====================================================
// CONVENIENCE HOOKS FOR COMMON USE CASES
// =====================================================

import { getAllCategories } from "../api/services/categoryService";
import {
  getAllProducts,
  getProductAndVariations,
  getProductBySlug,
  getProductsByCategoryId,
  searchProducts,
} from "../api/services/productService";

/**
 * Hook for categories
 */
export function useCategories() {
  return useFreshData("categories", getAllCategories, []);
}

/**
 * Hook for product list
 */
export function useProducts(perPage = 12, categoryId = null) {
  const key = categoryId
    ? `products-category-${categoryId}-${perPage}`
    : `products-${perPage}`;

  return useFreshData(key, () => {
    if (categoryId) {
      return getProductsByCategoryId(categoryId, perPage);
    }
    return getAllProducts(perPage);
  }, []);
}

/**
 * Hook for single product
 */
export function useProduct(slug) {
  return useFreshData(
    `product-${slug}`,
    () => (slug ? getProductBySlug(slug) : Promise.resolve(null)),
    null,
  );
}

/**
 * Hook for product with variations
 */
export function useProductWithVariations(slug) {
  return useFreshData(
    `product-full-${slug}`,
    () =>
      slug
        ? getProductAndVariations(slug)
        : Promise.resolve({ product: null, variations: [] }),
    { product: null, variations: [] },
  );
}

/**
 * Hook for search
 */
export function useProductSearch(query, perPage = 20) {
  const trimmedQuery = query?.trim() || "";

  return useFreshData(
    `search-${trimmedQuery}-${perPage}`,
    () =>
      trimmedQuery
        ? searchProducts(trimmedQuery, perPage)
        : Promise.resolve([]),
    [],
  );
}
