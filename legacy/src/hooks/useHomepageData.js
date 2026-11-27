// src/hooks/useHomepageData.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { globalCache } from "../api/utils/globalCache";
import { cacheEvents } from "../api/utils/cacheEvents";
import { publicApi } from "../api/axios";
import { CONFIG, FIELDS, HOMEPAGE_CATEGORIES } from "../api/config";

const ALL_CATEGORY_IDS = [
  HOMEPAGE_CATEGORIES.FEATURED_CATEGORY_ID,
  HOMEPAGE_CATEGORIES.POPULAR_CATEGORY_ID,
  HOMEPAGE_CATEGORIES.POPULAR_GRID_CATEGORY_ID, // 34 ✅
];

const CACHE_KEY = globalCache.key("homepage", "all");
const STATIC_URL = `${CONFIG.STATIC_JSON_URL}/homepage.json`;

// ✅ Check if running in development
const isDev = import.meta.env.DEV;

async function fetchFromStaticJSON() {
  // ✅ Skip static JSON in development (CORS issue)
  if (isDev) {
    throw new Error("Skip static JSON in dev");
  }

  const response = await fetch(STATIC_URL, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchFromAPI() {

  const [categoriesRes, ...productResponses] = await Promise.all([
    publicApi.get("/products/categories", {
      params: { per_page: 100, hide_empty: false, _fields: FIELDS.category },
    }),
    ...ALL_CATEGORY_IDS.map((catId) =>
      publicApi
        .get("/products", {
          params: {
            category: catId,
            per_page: 20,
            status: "publish",
            orderby: "menu_order",
            order: "asc",
            _fields: FIELDS.productList,
          },
        })
        .catch(() => ({ data: [] })),
    ),
  ]);

  const result = {
    categories: categoriesRes.data || [],
    productsByCategory: {},
    fetchedAt: Date.now(),
  };

  ALL_CATEGORY_IDS.forEach((catId, index) => {
    result.productsByCategory[catId] = productResponses[index]?.data || [];
  });

  return result;
}

async function fetchHomepageData() {

  // Try static JSON first (production only)
  try {
    const data = await fetchFromStaticJSON();
    return data;
  } catch (e) {
    console.log("🔄 Using API fallback:", e.message);
  }

  // Fallback to API
  const data = await fetchFromAPI();
  return data;
}

export function useHomepageData() {
  const initialData = useMemo(
    () => globalCache.get(CACHE_KEY, true)?.data || null,
    [],
  );

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const result = await globalCache.fetch(CACHE_KEY, fetchHomepageData, {
        forceRefresh: !showLoading,
      });

      if (mountedRef.current) {
        setData(result);

        // Populate individual category caches
        Object.entries(result.productsByCategory).forEach(
          ([catId, products]) => {
            globalCache.set(
              globalCache.key("products", "category", catId),
              products,
            );
          },
        );
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const cached = globalCache.get(CACHE_KEY, true);
    if (cached) {
      setData(cached.data);
      setIsLoading(false);
      if (cached.isStale) fetchData(false);
    } else {
      fetchData(true);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    return globalCache.subscribe(CACHE_KEY, (newData) => {
      if (mountedRef.current) setData(newData);
    });
  }, []);

  useEffect(() => {
    return cacheEvents.subscribe("all", () => fetchData(false));
  }, [fetchData]);

  const getProductsForCategory = useCallback(
    (categoryId) => data?.productsByCategory?.[categoryId] || [],
    [data],
  );

  const getCategoryById = useCallback(
    (categoryId) =>
      data?.categories?.find((c) => Number(c.id) === Number(categoryId)),
    [data],
  );

  const getCategoriesByIds = useCallback(
    (ids) => {
      if (!data?.categories || !ids?.length) return [];
      return ids
        .map((id) => data.categories.find((c) => Number(c.id) === Number(id)))
        .filter(Boolean);
    },
    [data],
  );

  // ✅ Returns products for Popular category (53)
  const getPopularGamesProducts = useCallback(() => {
    return (
      data?.productsByCategory?.[HOMEPAGE_CATEGORIES.POPULAR_CATEGORY_ID] || []
    );
  }, [data]);

  // ✅ Returns products for Featured category (113)
  const getFeaturedProducts = useCallback(() => {
    return (
      data?.productsByCategory?.[HOMEPAGE_CATEGORIES.FEATURED_CATEGORY_ID] || []
    );
  }, [data]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    getProductsForCategory,
    getCategoryById,
    getCategoriesByIds,
    getPopularGamesProducts,
    getFeaturedProducts,
  };
}
