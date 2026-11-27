import { cacheEvents } from "./cacheEvents";
import { CONFIG } from "../config";

const CACHE_TTL = CONFIG.CACHE_DURATION || 10 * 60 * 1000;
const STALE_TTL = CACHE_TTL * 2;

class GlobalCache {
  constructor() {
    this.cache = new Map();
    this.pending = new Map();
    this.subscribers = new Map();
  }

  key(...parts) {
    return "gc:" + parts.filter(Boolean).join(":");
  }

  get(key, allowStale = false) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const maxAge = allowStale ? STALE_TTL : CACHE_TTL;

    if (age < maxAge) {
      return {
        data: cached.data,
        isStale: age > CACHE_TTL,
        age,
      };
    }

    this.cache.delete(key);
    return null;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.notifySubscribers(key, data);
  }

  remove(key) {
    this.cache.delete(key);
    this.pending.delete(key);
  }

  clear() {
    console.log("🗑️ Global cache cleared");
    this.cache.clear();
    this.pending.clear();
  }

  isPending(key) {
    return this.pending.has(key);
  }

  getPending(key) {
    return this.pending.get(key);
  }

  async fetch(key, fetchFn, options = {}) {
    const { allowStale = true, forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = this.get(key, allowStale);

      if (cached && !cached.isStale) {
        return cached.data;
      }

      if (cached && cached.isStale) {
        this.refreshInBackground(key, fetchFn);
        return cached.data;
      }
    }

    if (this.isPending(key)) {
      return this.getPending(key);
    }

    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise;
  }

  refreshInBackground(key, fetchFn) {
    if (this.isPending(key)) return;

    const promise = (async () => {
      try {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      } catch (err) {
        console.error(`Background refresh failed: ${key}`, err);
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  notifySubscribers(key, data) {
    this.subscribers.get(key)?.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      pending: this.pending.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const globalCache = new GlobalCache();

// Clear on cache invalidation
cacheEvents.subscribe("all", () => globalCache.clear());

// Debug
if (typeof window !== "undefined") {
  window.globalCache = globalCache;
}