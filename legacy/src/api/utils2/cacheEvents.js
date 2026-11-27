// src/api/utils/cacheEvents.js

/**
 * Event system for cache invalidation
 * Allows components to subscribe and auto-refresh when cache is cleared
 */
class CacheEventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to cache invalidation events
   * @param {string} key - Event key to listen to
   * @param {Function} callback - Function to call when event fires
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);

      // Clean up empty sets
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Notify subscribers to refetch their data
   * @param {string} key - Specific key or "all" for everyone
   */
  notify(key = "all") {
    console.log(`🔔 Cache event: ${key}`);

    if (key === "all") {
      // Notify all listeners
      this.listeners.forEach((callbacks) => {
        callbacks.forEach((callback) => {
          try {
            callback();
          } catch (err) {
            console.error("Cache event callback error:", err);
          }
        });
      });
    } else {
      // Notify specific key listeners
      this.listeners.get(key)?.forEach((callback) => {
        try {
          callback();
        } catch (err) {
          console.error("Cache event callback error:", err);
        }
      });
    }
  }

  /**
   * Get count of active listeners
   */
  getListenerCount() {
    let count = 0;
    this.listeners.forEach((set) => {
      count += set.size;
    });
    return count;
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

export const cacheEvents = new CacheEventEmitter();
