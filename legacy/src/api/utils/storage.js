// src/api/utils/storage.js
export const Storage = {
  getCustomer() {
    try {
      return JSON.parse(localStorage.getItem("user_data") || "{}");
    } catch (e) {
      return {};
    }
  },

  setCustomer(data) {
    localStorage.setItem("user_data", JSON.stringify(data));
  },

  getToken() {
    return localStorage.getItem("auth_token");
  },

  setToken(token) {
    localStorage.setItem("auth_token", token);
  },

  clear() {
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_token");
  },
};
