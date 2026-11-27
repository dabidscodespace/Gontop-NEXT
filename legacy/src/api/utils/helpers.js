// src/api/utils/helpers.js

import { Cache } from "./cache";
import { apiQueue } from "./requestQueue";

/**
 * Fetch with caching and duplicate request prevention
 */
export async function fetchCached(cacheKey, fetchFn, fallback = null) {
  // Check cache first
  const cached = Cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Prevent duplicate simultaneous requests
  if (Cache.isPending(cacheKey)) {
    try {
      return await Cache.getPending(cacheKey);
    } catch {
      return fallback;
    }
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await apiQueue.add(() => fetchFn());
      const data = response?.data ?? fallback;
      
      // Store in cache
      Cache.set(cacheKey, data);
      
      return data;
    } finally {
      Cache.removePending(cacheKey);
    }
  })();

  Cache.setPending(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } catch {
    return fallback;
  }
}

/**
 * Fetch without caching (for mutations, real-time data)
 */
export async function fetchSafe(fetchFn, fallback = null) {
  try {
    const response = await apiQueue.add(() => fetchFn());
    return response?.data ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetch fresh (bypass cache, but still store result)
 */
export async function fetchFresh(cacheKey, fetchFn, fallback = null) {
  try {
    const response = await apiQueue.add(() => fetchFn());
    const data = response?.data ?? fallback;
    
    if (cacheKey) {
      Cache.set(cacheKey, data);
    }
    
    return data;
  } catch {
    return fallback;
  }
}