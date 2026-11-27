// src/services/uddoktaPayService.js
import { Storage } from "../api/utils/storage";

const IS_DEV = import.meta.env.DEV;
const BACKEND_URL = "https://dash.gontop.app";
const API_URL = `${IS_DEV ? "" : BACKEND_URL}/wp-json/uddoktapay/v1`;

const getHeaders = () => {
  const token = Storage.getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const postApi = async (endpoint, body = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });

    const result = await response.json();
    result._httpStatus = response.status;
    result._ok = response.ok;

    return result;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      message: error.message || "Network request failed",
      _httpStatus: 0,
      _ok: false,
    };
  }
};

export const getPaymentStatusFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    invoiceId: params.get("invoice_id"),
    status: params.get("status"),
    cancelled:
      params.get("cancelled") === "1" || params.get("status") === "cancelled",
    failed: params.get("status") === "failed",
    reason: params.get("reason"),
  };
};

const postApiStrict = async (endpoint, body = {}) => {
  const result = await postApi(endpoint, body);
  if (!result.success) {
    throw new Error(result.message || "Request failed");
  }
  return result;
};

const uddoktaPayService = {
  async initPayment({
    order_id,
    wallet_amount = 0,
    gateway_amount,
    payment_method = "Mobile Banking",
  }) {
    if (!order_id) throw new Error("Order ID is required");
    if (!gateway_amount || gateway_amount < 10)
      throw new Error("Minimum gateway amount is ৳10");

    return postApiStrict("/init-payment", {
      order_id,
      wallet_amount: parseFloat(wallet_amount) || 0,
      gateway_amount: parseFloat(gateway_amount),
      payment_method,
    });
  },

  async verifyPayment(invoiceId, urlStatus = null) {
    if (!invoiceId) throw new Error("Invoice ID is required");

    // If we already know it's cancelled from URL, still verify but expect cancelled
    const result = await postApi("/verify-payment", { invoice_id: invoiceId });

    return {
      success: result.success,
      status: result.status || "UNKNOWN",
      message: result.message,
      order_id: result.order_id,
      order_status: result.order_status,
      wallet_deducted: result.wallet_deducted || 0,
      gateway_paid: result.gateway_paid || 0,
      transaction_id: result.transaction_id,
      sender_number: result.sender_number,
      can_retry: result.can_retry || false,
      retry_url: result.retry_url,
      already_processed:
        result.already_verified || result.already_processed || false,
    };
  },

  async checkStatus({ order_id, invoice_id }) {
    if (!order_id && !invoice_id)
      throw new Error("Order ID or Invoice ID required");

    const result = await postApi("/check-status", {
      order_id: order_id || undefined,
      invoice_id: invoice_id || undefined,
    });

    return {
      success: result.success,
      order_id: result.order_id,
      order_status: result.order_status,
      payment_status: result.payment_status,
      invoice_id: result.invoice_id,
      needs_verification: result.needs_verification || false,
      can_retry: result.can_retry || false,
      is_complete: result.is_complete || false,
    };
  },

  async retryPayment(orderId) {
    if (!orderId) throw new Error("Order ID is required");
    return postApiStrict("/retry-payment", { order_id: orderId });
  },

  async cancelPayment(orderId) {
    if (!orderId) throw new Error("Order ID is required");
    return postApiStrict("/cancel-payment", { order_id: orderId });
  },

  async initWalletTopup(amount, paymentMethod = "Mobile Banking") {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 10)
      throw new Error("Minimum top-up is ৳10");

    return postApiStrict("/init-wallet-topup", {
      amount: parsedAmount,
      payment_method: paymentMethod,
    });
  },

  async verifyWalletPayment(invoiceId) {
    if (!invoiceId) throw new Error("Invoice ID is required");

    const result = await postApi("/verify-wallet-payment", {
      invoice_id: invoiceId,
    });

    return {
      success: result.success,
      status: result.status || "UNKNOWN",
      amount: result.amount || 0,
      balance: result.balance || 0,
      transaction_id: result.transaction_id,
      already_credited: result.already_credited || false,
      can_retry: result.can_retry || false,
    };
  },
};

export default uddoktaPayService;
