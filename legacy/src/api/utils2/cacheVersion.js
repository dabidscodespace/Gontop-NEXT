// src/api/utils/cacheVersion.js

import { CONFIG, ENDPOINTS } from "../config";
import { Cache } from "./cache";
import { cacheEvents } from "./cacheEvents";

const VERSION_KEY = "rmt-cache-version";
let checkInterval = null;
let isChecking = false;

export const CacheVersion = {
  /**
   * Get locally stored version
   */
  getLocal() {
    return localStorage.getItem(VERSION_KEY);
  },

  /**
   * Save version locally
   */
  setLocal(version) {
    localStorage.setItem(VERSION_KEY, String(version));
  },

  /**
   * Fetch current version from server
   */
  async fetchRemote() {
    try {
      const response = await fetch(ENDPOINTS.CACHE_VERSION, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return String(data.version);
    } catch (err) {
      console.warn("Failed to fetch cache version:", err.message);
      return null;
    }
  },

  /**
   * Check version and invalidate cache if changed
   * @returns {boolean} True if cache was invalidated
   */
  async checkAndInvalidate() {
    // Prevent concurrent checks
    if (isChecking) return false;
    isChecking = true;

    try {
      const remoteVersion = await this.fetchRemote();

      if (!remoteVersion) {
        return false;
      }

      const localVersion = this.getLocal();

      // First time - just save version
      if (!localVersion) {
        this.setLocal(remoteVersion);
        return false;
      }

      // Version changed - invalidate!
      if (localVersion !== remoteVersion) {

        // Clear all cached data
        Cache.clear();

        // Save new version
        this.setLocal(remoteVersion);

        // 🔥 Notify all components to refetch!
        cacheEvents.notify("all");

        return true;
      }

      return false;
    } catch (err) {
      console.error("Cache version check failed:", err);
      return false;
    } finally {
      isChecking = false;
    }
  },

  /**
   * Start periodic version checking
   */
  startPolling() {
    if (checkInterval) {
      return;
    }


    // Check immediately on start
    this.checkAndInvalidate();

    // Then check periodically
    checkInterval = setInterval(() => {
      this.checkAndInvalidate();
    }, CONFIG.VERSION_CHECK_INTERVAL);
  },

  /**
   * Stop periodic checking
   */
  stopPolling() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  },

  /**
   * Force refresh (manual invalidation)
   */
  async forceRefresh() {
    console.log("🔥 Force refreshing cache...");
    Cache.clear();
    cacheEvents.notify("all");

    // Fetch and update version
    const remoteVersion = await this.fetchRemote();
    if (remoteVersion) {
      this.setLocal(remoteVersion);
    }
  },

  /**
   * Check if polling is active
   */
  isPolling() {
    return checkInterval !== null;
  },
};
