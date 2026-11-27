import { Cache } from "./cache";
import { apiQueue } from "./requestQueue";

export async function fetchCached(cacheKey, fetchFn, fallback = null) {
  const cached = Cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  if (Cache.isPending(cacheKey)) {
    try {
      return await Cache.getPending(cacheKey);
    } catch {
      return fallback;
    }
  }

  const requestPromise = (async () => {
    try {
      const response = await apiQueue.add(() => fetchFn());
      const data = response?.data ?? fallback;
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

export async function fetchSafe(fetchFn, fallback = null) {
  try {
    const response = await apiQueue.add(() => fetchFn());
    return response?.data ?? fallback;
  } catch {
    return fallback;
  }
}
