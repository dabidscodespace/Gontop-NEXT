// src/api/axios.js

import axios from "axios";
import { toast } from "react-toastify";
import { CONFIG, ENDPOINTS } from "./config";

export const authEvents = {
  onUnauthorized: null,
};

let isHandlingExpiration = false;

// 🔥 No-cache headers
const defaultHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
};

const addAuthHeader = (config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

// 🔥 Add timestamp to prevent browser caching
const addCacheBuster = (config) => {
  config.params = {
    ...config.params,
    _t: Date.now(),
  };
  return config;
};

const handleUnauthorized = () => {
  if (isHandlingExpiration) return;
  isHandlingExpiration = true;

  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");

  toast.error("Session expired. Please log in again.", {
    toastId: "session-expired",
  });

  if (authEvents.onUnauthorized) {
    authEvents.onUnauthorized();
  } else {
    setTimeout(() => {
      isHandlingExpiration = false;
      window.location.href = "/login?expired=true";
    }, 1500);
  }
};

// Main API (authenticated)
const api = axios.create({
  baseURL: ENDPOINTS.API,
  timeout: CONFIG.TIMEOUT,
  headers: defaultHeaders,
});

api.interceptors.request.use(addAuthHeader);
api.interceptors.request.use(addCacheBuster);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      handleUnauthorized();
      return Promise.reject(new Error("Session expired. Please log in again."));
    }
    return Promise.reject(error);
  },
);

export default api;

// Public API (no auth required)
export const publicApi = axios.create({
  baseURL: ENDPOINTS.API,
  timeout: CONFIG.TIMEOUT,
  headers: defaultHeaders,
});

publicApi.interceptors.request.use(addCacheBuster);
publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const shouldRetry =
      !config._retry &&
      (error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        error.response?.status >= 500);

    if (shouldRetry) {
      config._retry = true;
      await new Promise((r) => setTimeout(r, 1000));
      return publicApi(config);
    }
    return Promise.reject(error);
  },
);

// License API
export const licenseApi = axios.create({
  baseURL: ENDPOINTS.LICENSE,
  timeout: CONFIG.TIMEOUT,
  headers: defaultHeaders,
});

licenseApi.interceptors.request.use(addAuthHeader);
licenseApi.interceptors.request.use(addCacheBuster);
licenseApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      handleUnauthorized();
      return Promise.reject(new Error("Session expired. Please log in again."));
    }
    return Promise.reject(error);
  },
);
