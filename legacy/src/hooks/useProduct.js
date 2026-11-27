import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProductAndVariations } from "../api";
import { globalCache } from "../api/utils/globalCache";
import { cacheEvents } from "../api/utils/cacheEvents";

export function useProduct(slug) {
  const cacheKey = globalCache.key("product", slug);

  // ✅ Get cached data IMMEDIATELY (sync)
  const initialData = useMemo(() => {
    if (!slug) return null;
    const cached = globalCache.get(cacheKey, true);
    return cached?.data || null;
  }, [cacheKey, slug]);

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  // Fetch function
  const fetchProduct = useCallback(
    async (showLoading = true) => {
      if (!slug) return;

      if (showLoading && !data) {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await globalCache.fetch(
          cacheKey,
          () => getProductAndVariations(slug),
          { forceRefresh: !showLoading }
        );

        if (mountedRef.current) {
          setData(result);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [slug, cacheKey, data]
  );

  // Initial fetch + cache check
  useEffect(() => {
    mountedRef.current = true;
    fetchedRef.current = false;

    if (!slug) {
      setLoading(false);
      return;
    }

    // ✅ Check cache
    const fresh = globalCache.get(cacheKey, false);
    if (fresh && !fresh.isStale) {
      // Fresh cache - use it
      setData(fresh.data);
      setLoading(false);
      fetchedRef.current = true;
    } else {
      // Check stale cache
      const stale = globalCache.get(cacheKey, true);
      if (stale) {
        // Show stale data, refresh in background
        setData(stale.data);
        setLoading(false);
        fetchedRef.current = true;

        // Background refresh
        globalCache.refreshInBackground(cacheKey, () =>
          getProductAndVariations(slug)
        );
      } else if (!fetchedRef.current) {
        // No cache - fetch fresh
        fetchedRef.current = true;
        fetchProduct(true);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [slug, cacheKey, fetchProduct]);

  // Subscribe to cache updates (background refresh)
  useEffect(() => {
    if (!slug) return;

    const unsubscribe = globalCache.subscribe(cacheKey, (newData) => {
      if (mountedRef.current) {
        setData(newData);
      }
    });

    return unsubscribe;
  }, [cacheKey, slug]);

  // Subscribe to global cache invalidation
  useEffect(() => {
    if (!slug) return;

    const unsubscribe = cacheEvents.subscribe("all", () => {
      // Re-fetch without loading spinner
      fetchProduct(false);
    });

    return unsubscribe;
  }, [fetchProduct, slug]);

  return {
    product: data?.product || null,
    variations: data?.variations || [],
    loading,
    error,
    refetch: () => fetchProduct(true),
  };
}

/**
 * Prefetch product on hover (call from GameItem)
 */
export function prefetchProduct(slug) {
  if (!slug) return;

  const cacheKey = globalCache.key("product", slug);

  // Skip if already cached or fetching
  if (globalCache.get(cacheKey) || globalCache.isPending(cacheKey)) {
    return;
  }

  // Prefetch in background
  globalCache
    .fetch(cacheKey, () => getProductAndVariations(slug))
    .catch(() => {
      // Silently fail prefetch
    });
}

/**
 * Clear product cache
 */
export function clearProductCache(slug) {
  if (slug) {
    globalCache.remove(globalCache.key("product", slug));
  }
}