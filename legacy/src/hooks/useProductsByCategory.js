// src/hooks/useProductsByCategory.js

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProductsByCategoryId } from "../api";
import { cacheEvents } from "../api/utils/cacheEvents";

const globalCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const STALE_TTL = 10 * 60 * 1000;

// Throttled background refresh
let lastBackgroundRefresh = 0;
const BACKGROUND_THROTTLE = 10000;

// Sequential queue
let requestQueue = Promise.resolve();

const queueRequest = (fn) => {
  requestQueue = requestQueue
    .then(() => new Promise((resolve) => setTimeout(resolve, 150)))
    .then(fn)
    .catch(() => {});
  return requestQueue;
};

// ✅ Sync cache check
const getCached = (cacheKey, allowStale = false) => {
  const cached = globalCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  const maxAge = allowStale ? STALE_TTL : CACHE_TTL;

  if (age < maxAge) {
    return {
      data: cached.data,
      isStale: age > CACHE_TTL,
    };
  }

  globalCache.delete(cacheKey);
  return null;
};

export function useProductsByCategory(categoryId, options = {}) {
  const { enabled = true } = options;
  const cacheKey = `category-${categoryId}`;

  // ✅ Get cached data IMMEDIATELY
  const initialData = useMemo(() => {
    if (!enabled || !categoryId) return { data: [], isStale: false };
    return getCached(cacheKey, true) || { data: [], isStale: false };
  }, [cacheKey, enabled, categoryId]);

  const [products, setProducts] = useState(initialData.data);
  const [isLoading, setIsLoading] = useState(initialData.data.length === 0);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  // 🔥 Fetch function (extracted for reuse)
  const fetchProducts = useCallback(
    async (showLoading = true) => {
      if (!enabled || !categoryId) return;

      if (showLoading && products.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Check if request already pending
        if (pendingRequests.has(cacheKey)) {
          const data = await pendingRequests.get(cacheKey);
          if (mountedRef.current) {
            setProducts(data);
            setIsLoading(false);
          }
          return;
        }

        // Create new request
        const requestPromise = queueRequest(async () => {
          try {
            const data = await getProductsByCategoryId(categoryId);
            const validData = Array.isArray(data) ? data : [];

            globalCache.set(cacheKey, {
              data: validData,
              timestamp: Date.now(),
            });

            return validData;
          } finally {
            pendingRequests.delete(cacheKey);
          }
        });

        pendingRequests.set(cacheKey, requestPromise);

        const data = await requestPromise;
        if (mountedRef.current) {
          setProducts(data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [categoryId, enabled, cacheKey, products.length],
  );

  useEffect(() => {
    mountedRef.current = true;
    fetchedRef.current = false;

    if (!enabled || !categoryId) {
      setIsLoading(false);
      return;
    }

    // ✅ Already have fresh data
    const cached = getCached(cacheKey, false);
    if (cached && !cached.isStale) {
      setProducts(cached.data);
      setIsLoading(false);
      fetchedRef.current = true;
    } else {
      // ✅ Have stale data - show it, refresh in background
      const stale = getCached(cacheKey, true);
      if (stale) {
        setProducts(stale.data);
        setIsLoading(false);

        if (canRefreshBackground()) {
          refreshInBackground(cacheKey, categoryId, (newData) => {
            if (mountedRef.current) {
              setProducts(newData);
            }
          });
        }
        fetchedRef.current = true;
      } else if (!fetchedRef.current) {
        // No cache - fetch fresh
        fetchedRef.current = true;
        fetchProducts(true);
      }
    }

    // 🔥 SUBSCRIBE TO CACHE INVALIDATION
    const unsubscribe = cacheEvents.subscribe("all", () => {

      // Clear this category's cache
      globalCache.delete(cacheKey);

      // Fetch fresh data (without loading spinner)
      fetchProducts(false);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [categoryId, enabled, cacheKey, fetchProducts]);

  return { products, isLoading, error };
}

// ✅ Throttle background refreshes
function canRefreshBackground() {
  const now = Date.now();
  if (now - lastBackgroundRefresh > BACKGROUND_THROTTLE) {
    lastBackgroundRefresh = now;
    return true;
  }
  return false;
}

// 🔥 UPDATED: Non-blocking background refresh with callback
function refreshInBackground(cacheKey, categoryId, onUpdate) {
  if (pendingRequests.has(cacheKey)) return;

  const promise = queueRequest(async () => {
    try {
      const data = await getProductsByCategoryId(categoryId);
      const validData = Array.isArray(data) ? data : [];

      globalCache.set(cacheKey, {
        data: validData,
        timestamp: Date.now(),
      });

      // 🔥 Notify component of new data
      if (onUpdate) {
        onUpdate(validData);
      }

      return validData;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  });

  pendingRequests.set(cacheKey, promise);
}

export function prefetchCategory(categoryId) {
  const cacheKey = `category-${categoryId}`;

  if (globalCache.has(cacheKey) || pendingRequests.has(cacheKey)) return;

  const promise = getProductsByCategoryId(categoryId).then((data) => {
    globalCache.set(cacheKey, {
      data: Array.isArray(data) ? data : [],
      timestamp: Date.now(),
    });
    pendingRequests.delete(cacheKey);
    return data;
  });

  pendingRequests.set(cacheKey, promise);
}

// 🔥 UPDATED: Clear cache and notify subscribers
export function clearProductsCache() {
  globalCache.clear();
  cacheEvents.notify("all"); // Notify all components to refresh
}
