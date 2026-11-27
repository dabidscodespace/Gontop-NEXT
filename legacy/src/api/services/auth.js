// src/api/services/auth.js

import axios from "axios";
import api from "../axios";
import { ENDPOINTS } from "../config";
import { Cache } from "../utils/cache";
import { Storage } from "../utils/storage";
import { clearWalletCache, getWalletBalance } from "./wallet";

// ==================== GOOGLE LOGIN ====================

export const loginWithGoogle = async (credential) => {
  const response = await axios.post(ENDPOINTS.GOOGLE_AUTH, { credential });
  const data = response.data;

  if (!data.success || !data.token) {
    throw new Error(data.message || "Login failed");
  }

  // Store token
  Storage.setToken(data.token);

  // Prepare user data
  const userData = {
    token: data.token,
    email: data.user_email,
    customer_id: data.customer_id,
    display_name: data.user_display_name || data.first_name,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    date_created: data.date_created,
    picture: data.picture || null,
  };

  // Store user data
  Storage.setCustomer(userData);

  // Prefetch wallet balance
  if (data.user_email) {
    getWalletBalance(data.user_email).catch(() => {});
  }

  return userData;
};

// ==================== PROFILE UPDATE ====================

export const updateCustomerProfile = async (customerId, profileData) => {
  const response = await api.put(`/customers/${customerId}`, {
    first_name: profileData.display_name,
    last_name: profileData.last_name,
    billing: {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
    },
  });

  const updatedData = {
    display_name: response.data.first_name || "",
    first_name: response.data.billing?.first_name || "",
    last_name: response.data.last_name || "",
    phone: response.data.billing?.phone || "",
  };

  // Update stored customer data
  const currentCustomer = Storage.getCustomer();
  Storage.setCustomer({ ...currentCustomer, ...updatedData });

  return updatedData;
};

// ==================== LOGOUT ====================

export const logoutUser = () => {
  const customer = Storage.getCustomer();
  if (customer?.email) {
    clearWalletCache(customer.email);
  }
  Storage.clear();
  Cache.clear();
};

// ==================== CHECK AUTH ====================

export const isAuthenticated = () => {
  const token = Storage.getToken();
  return !!token;
};

// ==================== GET STORED CUSTOMER ====================

export const getStoredCustomer = () => Storage.getCustomer();