import { CONFIG, ENDPOINTS } from "../config";
import { Cache } from "./cache";
import { cacheEvents } from "./cacheEvents";

const VERSION_KEY = "rmt-cache-version";
const LAST_CHECK_KEY = "rmt-last-check";

let isChecking = false;
let pollInterval = null;

export const CacheVersion = {
  getLocal() {
    return localStorage.getItem(VERSION_KEY);
  },

  setLocal(version) {
    localStorage.setItem(VERSION_KEY, String(version));
  },

  getLastCheck() {
    return parseInt(localStorage.getItem(LAST_CHECK_KEY) || "0", 10);
  },

  setLastCheck() {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  },

  shouldCheck() {
    return Date.now() - this.getLastCheck() >= CONFIG.VERSION_CHECK_INTERVAL;
  },

  async fetchRemote() {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${ENDPOINTS.CACHE_VERSION}?_=${Date.now()}`, {
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.setLastCheck();
      return String(data.version);
    } catch (err) {
      console.warn("Version check failed:", err.message);
      return null;
    }
  },

  async checkAndInvalidate() {
    if (isChecking || !this.shouldCheck()) return false;

    isChecking = true;

    try {
      const remoteVersion = await this.fetchRemote();
      if (!remoteVersion) return false;

      const localVersion = this.getLocal();

      if (!localVersion) {
        this.setLocal(remoteVersion);
        return false;
      }

      if (localVersion !== remoteVersion) {
        Cache.clear();
        this.setLocal(remoteVersion);
        setTimeout(() => cacheEvents.notify("all"), 100);
        return true;
      }

      return false;
    } finally {
      isChecking = false;
    }
  },

  startPolling() {

    if (this.shouldCheck()) {
      this.checkAndInvalidate();
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && this.shouldCheck()) {
        this.checkAndInvalidate();
      }
    };

    pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && this.shouldCheck()) {
        this.checkAndInvalidate();
      }
    }, CONFIG.VERSION_CHECK_INTERVAL);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    this._cleanup = () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  },

  stopPolling() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
  },

  async forceRefresh() {
    Cache.clear();
    cacheEvents.notify("all");
    const version = await this.fetchRemote();
    if (version) this.setLocal(version);
  },
};