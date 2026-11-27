import api from "../axios";
import { CONFIG } from "../config";
import { Cache } from "../utils/cache";
import { Storage } from "../utils/storage";

// ==============================
// 🔴 WALLET DISABLED FLAG
// ==============================
const WALLET_DISABLED = false; // Set to false to enable wallet

// ------------------------------
//  Get wallet balance
// ------------------------------
export const getWalletBalance = async (email, forceRefresh = false) => {
  // 🔴 Return zero balance if disabled
  if (WALLET_DISABLED) {
    return { balance: 0, currency: CONFIG.DEFAULT_CURRENCY, disabled: true };
  }

  const userEmail = email || Storage.getCustomer().email;
  if (!userEmail) return null;

  const cacheKey = Cache.key("wallet-balance", userEmail);

  if (!forceRefresh) {
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
  } else {
    Cache.remove(cacheKey);
  }

  try {
    const { data } = await api.get("/wallet/balance", {
      params: { email: userEmail },
    });

    const result = {
      balance: parseFloat(data.balance || data || 0),
      currency: data.currency || CONFIG.DEFAULT_CURRENCY,
    };

    Cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      "[Wallet] Balance fetch error:",
      error.response?.data || error.message,
    );
    return null;
  }
};

// ------------------------------
//  Get wallet transactions
// ------------------------------
export const getWalletTransactions = async (
  email,
  perPage = 50,
  forceRefresh = false,
) => {
  // 🔴 Return empty if disabled
  if (WALLET_DISABLED) {
    return [];
  }

  const userEmail = email || Storage.getCustomer().email;
  if (!userEmail) return [];

  const cacheKey = Cache.key("wallet-transactions", userEmail);

  if (!forceRefresh) {
    const cached = Cache.get(cacheKey);
    if (cached && Array.isArray(cached)) return cached;
  } else {
    Cache.remove(cacheKey);
  }

  try {
    const { data } = await api.get("/wallet", {
      params: { email: userEmail, per_page: perPage },
    });

    const transactions = Array.isArray(data) ? data : [];
    Cache.set(cacheKey, transactions);
    return transactions;
  } catch (error) {
    console.error(
      "[Wallet] Transactions fetch error:",
      error.response?.data || error.message,
    );
    return [];
  }
};

// ------------------------------
//  Get all wallet data
// ------------------------------
export const getWalletData = async (email, forceRefresh = false) => {
  // 🔴 Return empty data if disabled
  if (WALLET_DISABLED) {
    return { 
      balance: 0, 
      currency: CONFIG.DEFAULT_CURRENCY, 
      transactions: [],
      disabled: true 
    };
  }

  const userEmail = email || Storage.getCustomer().email;
  if (!userEmail) {
    return { balance: 0, currency: CONFIG.DEFAULT_CURRENCY, transactions: [] };
  }

  try {
    const [balanceData, transactions] = await Promise.all([
      getWalletBalance(userEmail, forceRefresh),
      getWalletTransactions(userEmail, 100, forceRefresh),
    ]);

    return {
      balance: balanceData?.balance || 0,
      currency: balanceData?.currency || CONFIG.DEFAULT_CURRENCY,
      transactions: Array.isArray(transactions) ? transactions : [],
    };
  } catch (error) {
    console.error(
      "[Wallet] Combined data fetch error:",
      error.response?.data || error.message,
    );
    return { balance: 0, currency: CONFIG.DEFAULT_CURRENCY, transactions: [] };
  }
};

// ------------------------------
//  Helpers
// ------------------------------
export const getFreshWalletData = (email) => getWalletData(email, true);

export const checkWalletBalance = async (amount, email) => {
  // 🔴 Always return false if disabled
  if (WALLET_DISABLED) {
    return false;
  }

  try {
    const wallet = await getWalletBalance(email, true);
    return wallet ? wallet.balance >= amount : false;
  } catch (error) {
    console.error(
      "[Wallet] Balance check error:",
      error.response?.data || error.message,
    );
    return false;
  }
};

export const clearWalletCache = (email) => {
  if (WALLET_DISABLED) return;
  
  const userEmail = email || Storage.getCustomer().email;
  if (userEmail) {
    Cache.remove(Cache.key("wallet-balance", userEmail));
    Cache.remove(Cache.key("wallet-transactions", userEmail));
  }
};

export const refreshWallet = async (email) => {
  if (WALLET_DISABLED) {
    return { balance: 0, currency: CONFIG.DEFAULT_CURRENCY, transactions: [], disabled: true };
  }
  
  clearWalletCache(email);
  return getWalletData(email, true);
};

// 🔴 Export disabled status for UI checks
export const isWalletDisabled = () => WALLET_DISABLED;