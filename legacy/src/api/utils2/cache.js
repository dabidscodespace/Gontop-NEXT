import { CONFIG } from "../config";

const memoryCache = new Map();
const pendingRequests = new Map();

const STALE_TIME = 5 * 60 * 1000;

export const Cache = {
  get(key) {
    const memoryCached = memoryCache.get(key);
    if (memoryCached) {
      const age = Date.now() - memoryCached.timestamp;
      if (age < CONFIG.CACHE_DURATION + STALE_TIME) {
        return memoryCached.data;
      }
      memoryCache.delete(key);
    }

    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const age = Date.now() - parsed.timestamp;

      if (age < CONFIG.CACHE_DURATION + STALE_TIME) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }

      sessionStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },

  isStale(key) {
    const memoryCached = memoryCache.get(key);
    if (memoryCached) {
      const age = Date.now() - memoryCached.timestamp;
      return age > CONFIG.CACHE_DURATION;
    }
    return false;
  },

  set(key, data) {
    const cacheItem = { data, timestamp: Date.now() };
    memoryCache.set(key, cacheItem);

    try {
      sessionStorage.setItem(key, JSON.stringify(cacheItem));
    } catch {}
  },

  remove(key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },

  clear() {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(CONFIG.CACHE_PREFIX))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
  },

  key(...parts) {
    return CONFIG.CACHE_PREFIX + parts.filter(Boolean).join("-");
  },

  isPending(key) {
    return pendingRequests.has(key);
  },

  getPending(key) {
    return pendingRequests.get(key);
  },

  setPending(key, promise) {
    pendingRequests.set(key, promise);
  },

  removePending(key) {
    pendingRequests.delete(key);
  },
};