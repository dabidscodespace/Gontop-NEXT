// src/api/utils/cache.js

import { CONFIG } from "../config";

const memoryCache = new Map();
const pendingRequests = new Map();

export const Cache = {
  /**
   * Get cached data
   */
  get(key) {
    // Check memory cache first
    const memoryCached = memoryCache.get(key);
    if (memoryCached) {
      const age = Date.now() - memoryCached.timestamp;
      if (age < CONFIG.CACHE_DURATION) {
        return memoryCached.data;
      }
      memoryCache.delete(key);
    }

    // Check sessionStorage
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const age = Date.now() - parsed.timestamp;

      if (age < CONFIG.CACHE_DURATION) {
        // Restore to memory cache
        memoryCache.set(key, parsed);
        return parsed.data;
      }

      sessionStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set cache data
   */
  set(key, data) {
    const cacheItem = { data, timestamp: Date.now() };
    memoryCache.set(key, cacheItem);

    try {
      sessionStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (e) {
      // Storage full - clear old items
      this.clearOldest();
      try {
        sessionStorage.setItem(key, JSON.stringify(cacheItem));
      } catch {}
    }
  },

  /**
   * Remove specific key
   */
  remove(key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {}
  },

  /**
   * Clear ALL cache
   */
  clear() {
    memoryCache.clear();

    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CONFIG.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch {}
  },

  /**
   * Clear oldest cache items when storage is full
   */
  clearOldest() {
    try {
      const items = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CONFIG.CACHE_PREFIX)) {
          const item = JSON.parse(sessionStorage.getItem(key));
          items.push({ key, timestamp: item.timestamp });
        }
      }

      // Sort by oldest first
      items.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25%
      const removeCount = Math.ceil(items.length * 0.25);
      items.slice(0, removeCount).forEach(({ key }) => {
        sessionStorage.removeItem(key);
        memoryCache.delete(key);
      });
    } catch {}
  },

  /**
   * Generate cache key
   */
  key(...parts) {
    return CONFIG.CACHE_PREFIX + parts.filter(Boolean).join("-");
  },

  // Pending request management (prevents duplicate simultaneous requests)
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
