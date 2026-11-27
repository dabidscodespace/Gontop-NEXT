// src/api/services/orders.js
import uddoktaPayService from "../../services/uddoktaPayService";
import api, { publicApi } from "../axios";
import { FIELDS } from "../config";
import { fetchSafe } from "../utils/helpers";
import { Storage } from "../utils/storage";
import { calculateDiscount } from "./coupons";
import { clearWalletCache, getWalletBalance } from "./wallet";

/* -------------------------------------------------------
 * CACHE
 * ----------------------------------------------------- */
const productImageCache = new Map();

/* -------------------------------------------------------
 * HELPERS
 * ----------------------------------------------------- */
const formatLabel = (key) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const fetchProductImage = async (productId) => {
  if (productImageCache.has(productId)) return productImageCache.get(productId);

  try {
    const res = await publicApi.get(`/products/${productId}`, {
      params: { _fields: "id,images" },
    });
    const imageUrl = res.data?.images?.[0]?.src || null;
    productImageCache.set(productId, imageUrl);
    return imageUrl;
  } catch {
    productImageCache.set(productId, null);
    return null;
  }
};

const enrichOrdersWithImages = async (orders) => {
  const productIds = [
    ...new Set(orders.flatMap((o) => o.line_items.map((i) => i.product_id))),
  ];
  await Promise.all(productIds.map(fetchProductImage));
  return orders.map((order) => ({
    ...order,
    line_items: order.line_items.map((item) => ({
      ...item,
      image: productImageCache.get(item.product_id) || null,
    })),
  }));
};

const calculateOrderTotal = (product, quantity, coupon = null) => {
  const price = parseFloat(product.price) || 0;
  const qty = parseInt(quantity) || 1;
  let total = price * qty;

  if (coupon) {
    total -= calculateDiscount(coupon, total);
  }

  return Math.max(0, total);
};

/* -------------------------------------------------------
 * BUILD WAPF META
 * ----------------------------------------------------- */
const buildWapfMeta = (gameData) => {
  if (!gameData?.fields) return null;
  const fieldLabels = gameData.fieldLabels || {};
  const fields = {};
  const settings = {};

  Object.entries(gameData.fields).forEach(([id, val]) => {
    if (!val) return;
    const label = fieldLabels[id] || formatLabel(id);
    fields[id] = {
      id,
      type: "text",
      label,
      value: String(val),
      values: [{ label: String(val), price: 0, price_type: "none" }],
    };
    settings[label] = [{ field: id, hide: false }];
  });

  if (gameData.playerName) {
    fields.player_name = {
      id: "player_name",
      type: "text",
      label: "Player Name",
      value: gameData.playerName,
      values: [{ label: gameData.playerName, price: 0, price_type: "none" }],
    };
    settings["Player Name"] = [{ field: "player_name", hide: false }];
  }

  return Object.keys(fields).length ? { fields, settings } : null;
};

/* -------------------------------------------------------
 * BUILD ORDER PAYLOAD
 * ----------------------------------------------------- */
const buildOrderPayload = (
  orderInfo,
  product,
  customer,
  gameData,
  paymentType,
  initialStatus,
) => {
  const price = parseFloat(product.price) || 0;
  const qty = parseInt(orderInfo.quantity) || 1;
  let lineTotal = price * qty;

  if (orderInfo.coupon) {
    lineTotal -= calculateDiscount(orderInfo.coupon, lineTotal);
  }

  const lineItem = {
    product_id: product.id,
    variation_id: product.variation_id || 0,
    quantity: qty,
    subtotal: String(price * qty),
    total: String(lineTotal),
    meta_data: [],
  };

  const wapf = buildWapfMeta(gameData);
  if (wapf) {
    lineItem.meta_data.push({ key: "_wapf_meta", value: wapf });
    Object.values(wapf.fields).forEach((f) => {
      if (f.label && f.value) {
        lineItem.meta_data.push({ key: f.label, value: f.value });
      }
    });
  }

  const meta = [];
  const walletAmount = parseFloat(orderInfo.wallet_applied) || 0;
  const gatewayAmount = lineTotal - walletAmount;

  meta.push(
    { key: "_has_game_fields", value: gameData?.hasFields ? "yes" : "no" },
    {
      key: "_game_fields_complete",
      value: gameData?.isComplete ? "yes" : "no",
    },
  );

  // Payment type specific meta
  if (paymentType === "wallet") {
    meta.push(
      { key: "payment_type", value: "wallet_only" },
      { key: "_wallet_amount", value: lineTotal },
    );
  } else if (paymentType === "hybrid") {
    meta.push(
      { key: "payment_type", value: "hybrid" },
      { key: "_pending_wallet_amount", value: walletAmount },
      { key: "_pending_gateway_amount", value: gatewayAmount },
    );
  } else {
    meta.push(
      { key: "payment_type", value: "gateway_only" },
      { key: "_pending_gateway_amount", value: lineTotal },
    );
  }

  // Payment method
  let paymentMethod, paymentMethodTitle;

  if (paymentType === "wallet") {
    paymentMethod = "terawallet";
    paymentMethodTitle = "Wallet Payment";
  } else if (paymentType === "hybrid") {
    paymentMethod = "uddoktapay";
    paymentMethodTitle = `${orderInfo.payment_method_title || "UddoktaPay"} + Wallet`;
  } else {
    paymentMethod = "uddoktapay";
    paymentMethodTitle = orderInfo.payment_method_title || "UddoktaPay";
  }

  return {
    customer_id: customer.customer_id || 0,
    payment_method: paymentMethod,
    payment_method_title: paymentMethodTitle,
    set_paid: false,
    status: initialStatus,
    billing: {
      first_name: orderInfo.name || customer.first_name || "",
      last_name: customer.last_name || "",
      email: orderInfo.email || customer.email || "",
      phone: orderInfo.phone || "",
    },
    line_items: [lineItem],
    meta_data: meta,
    ...(orderInfo.coupon?.code && {
      coupon_lines: [{ code: orderInfo.coupon.code }],
    }),
  };
};

/* -------------------------------------------------------
 * SAVE CHECKOUT DATA (for order summary page)
 * ----------------------------------------------------- */
const saveCheckoutData = (data) => {
  try {
    localStorage.setItem("checkout_data", JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save checkout data:", e);
  }
};

/* -------------------------------------------------------
 * WALLET-ONLY ORDER (Instant → Processing)
 * ----------------------------------------------------- */
export const createWalletOrder = async (
  orderInfo,
  product,
  gameData = null,
) => {
  const customer = Storage.getCustomer();
  if (!customer.email) {
    throw new Error("Please login to use wallet");
  }

  const total = calculateOrderTotal(
    product,
    orderInfo.quantity,
    orderInfo.coupon,
  );

  // Check wallet balance
  const walletBalance = await getWalletBalance();
  const availableBalance = walletBalance?.balance || 0;

  if (availableBalance < total) {
    throw new Error(
      `Insufficient wallet balance. Available: ৳${availableBalance.toFixed(2)}, Required: ৳${total.toFixed(2)}`,
    );
  }

  // Create order directly as PROCESSING
  const payload = buildOrderPayload(
    { ...orderInfo, wallet_applied: total },
    product,
    customer,
    gameData,
    "wallet",
    "processing",
  );

  try {
    const order = await fetchSafe(() => api.post("/orders", payload));

    if (!order?.id) {
      throw new Error("Order creation failed");
    }

    // Save checkout data for summary page
    saveCheckoutData({
      product,
      selectedPackages: [
        { variation: product, quantity: orderInfo.quantity || 1 },
      ],
      gameData,
      subtotal: total,
      discount: orderInfo.coupon
        ? calculateDiscount(orderInfo.coupon, total)
        : 0,
      totalAmount: total,
      coupon: orderInfo.coupon,
      wallet: { applied: total, remaining: 0, isFullPayment: true },
    });

    // Save order info
    localStorage.setItem("last_order_id", order.id);
    localStorage.setItem("last_payment_type", "wallet");

    clearWalletCache();

    return {
      success: true,
      order,
      payment_method: "wallet",
      instant: true,
    };
  } catch (err) {
    console.error("❌ Wallet order error:", err);
    throw err;
  }
};

/* -------------------------------------------------------
 * GATEWAY-ONLY ORDER (Pending → Gateway → Processing)
 * ----------------------------------------------------- */
export const createGatewayOrder = async (
  orderInfo,
  product,
  gameData = null,
) => {
  const customer = Storage.getCustomer();
  if (!customer.email) {
    throw new Error("Please login to continue");
  }

  const total = calculateOrderTotal(
    product,
    orderInfo.quantity,
    orderInfo.coupon,
  );

  if (total < 10) {
    throw new Error("Minimum order amount is ৳10");
  }

  // Create order as PENDING
  const payload = buildOrderPayload(
    orderInfo,
    product,
    customer,
    gameData,
    "gateway",
    "pending",
  );

  try {
    const order = await fetchSafe(() => api.post("/orders", payload));

    if (!order?.id) {
      throw new Error("Order creation failed");
    }

    // Save checkout data
    saveCheckoutData({
      product,
      selectedPackages: [
        { variation: product, quantity: orderInfo.quantity || 1 },
      ],
      gameData,
      subtotal: total,
      discount: orderInfo.coupon
        ? calculateDiscount(orderInfo.coupon, total)
        : 0,
      totalAmount: total,
      coupon: orderInfo.coupon,
      wallet: { applied: 0, remaining: total, isFullPayment: false },
    });

    // Initialize payment
    const paymentResponse = await uddoktaPayService.initPayment({
      order_id: order.id,
      wallet_amount: 0,
      gateway_amount: total,
      payment_method: orderInfo.payment_method_title || "Mobile Banking",
    });

    // Save invoice info
    localStorage.setItem("last_order_id", order.id);
    localStorage.setItem("last_invoice_id", paymentResponse.invoice_id);
    localStorage.setItem("last_payment_type", "gateway");
    localStorage.setItem("last_gateway_amount", total);

    return {
      success: true,
      order,
      payment_url: paymentResponse.payment_url,
      invoice_id: paymentResponse.invoice_id,
      instant: false,
    };
  } catch (err) {
    console.error("❌ Gateway order error:", err);
    throw err;
  }
};

/* -------------------------------------------------------
 * HYBRID ORDER (Pending → Gateway → Wallet + Processing)
 * ----------------------------------------------------- */
export const createHybridOrder = async (
  orderInfo,
  product,
  gameData = null,
) => {
  const customer = Storage.getCustomer();
  if (!customer.email) {
    throw new Error("Please login to continue");
  }

  const total = calculateOrderTotal(
    product,
    orderInfo.quantity,
    orderInfo.coupon,
  );
  const walletAmount = parseFloat(orderInfo.wallet_applied) || 0;
  const gatewayAmount = total - walletAmount;

  // Validations
  if (walletAmount <= 0) {
    throw new Error("Wallet amount must be > 0 for hybrid payment");
  }

  if (gatewayAmount < 10) {
    throw new Error(
      "Gateway amount must be at least ৳10. Use full wallet instead.",
    );
  }

  // Check wallet balance
  const walletBalance = await getWalletBalance();
  const availableBalance = walletBalance?.balance || 0;

  if (availableBalance < walletAmount) {
    throw new Error(
      `Insufficient wallet. Available: ৳${availableBalance.toFixed(2)}, Required: ৳${walletAmount.toFixed(2)}`,
    );
  }

  // Create order as PENDING
  const payload = buildOrderPayload(
    orderInfo,
    product,
    customer,
    gameData,
    "hybrid",
    "pending",
  );

  try {
    const order = await fetchSafe(() => api.post("/orders", payload));

    if (!order?.id) {
      throw new Error("Order creation failed");
    }

    // Save checkout data
    saveCheckoutData({
      product,
      selectedPackages: [
        { variation: product, quantity: orderInfo.quantity || 1 },
      ],
      gameData,
      subtotal: total,
      discount: orderInfo.coupon
        ? calculateDiscount(orderInfo.coupon, total)
        : 0,
      totalAmount: total,
      coupon: orderInfo.coupon,
      wallet: {
        applied: walletAmount,
        remaining: gatewayAmount,
        isFullPayment: false,
      },
    });

    // Initialize payment
    const paymentResponse = await uddoktaPayService.initPayment({
      order_id: order.id,
      wallet_amount: walletAmount,
      gateway_amount: gatewayAmount,
      payment_method: orderInfo.payment_method_title || "Mobile Banking",
    });

    // Save payment info
    localStorage.setItem("last_order_id", order.id);
    localStorage.setItem("last_invoice_id", paymentResponse.invoice_id);
    localStorage.setItem("last_payment_type", "hybrid");
    localStorage.setItem("last_wallet_amount", walletAmount);
    localStorage.setItem("last_gateway_amount", gatewayAmount);

    return {
      success: true,
      order,
      payment_url: paymentResponse.payment_url,
      invoice_id: paymentResponse.invoice_id,
      wallet_amount: walletAmount,
      gateway_amount: gatewayAmount,
      instant: false,
    };
  } catch (err) {
    console.error("❌ Hybrid order error:", err);
    throw err;
  }
};

/* -------------------------------------------------------
 * UNIFIED CHECKOUT (Auto-detects payment type)
 * ----------------------------------------------------- */
export const startCheckout = async (orderInfo, product, gameData = null) => {
  const total = calculateOrderTotal(
    product,
    orderInfo.quantity,
    orderInfo.coupon,
  );
  const walletAmount = parseFloat(orderInfo.wallet_applied) || 0;

  // WALLET-ONLY
  if (walletAmount >= total) {
    console.log("→ Wallet payment (instant)");
    return await createWalletOrder(
      { ...orderInfo, wallet_applied: total },
      product,
      gameData,
    );
  }

  // HYBRID
  if (walletAmount > 0) {
    console.log("→ Hybrid payment");
    const result = await createHybridOrder(orderInfo, product, gameData);
    if (result.payment_url) {
      window.location.href = result.payment_url;
    }
    return result;
  }

  // GATEWAY-ONLY
  console.log("→ Gateway payment");
  const result = await createGatewayOrder(orderInfo, product, gameData);
  if (result.payment_url) {
    window.location.href = result.payment_url;
  }
  return result;
};

/* -------------------------------------------------------
 * VERIFY PAYMENT
 * ----------------------------------------------------- */
export const verifyPayment = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }

  const result = await uddoktaPayService.verifyPayment(invoiceId);

  if (result.success && result.status === "COMPLETED") {
    clearWalletCache();
  }

  return result;
};

/* -------------------------------------------------------
 * CHECK PAYMENT STATUS
 * ----------------------------------------------------- */
export const checkPaymentStatus = async (orderId, invoiceId = null) => {
  return await uddoktaPayService.checkStatus({
    order_id: orderId,
    invoice_id: invoiceId,
  });
};

/* -------------------------------------------------------
 * RETRY PAYMENT
 * ----------------------------------------------------- */
export const retryPayment = async (orderId, paymentDetails) => {
  if (!orderId) throw new Error("Order ID is required");

  // Reset order for retry
  await uddoktaPayService.retryPayment(orderId);

  // Init new payment
  const paymentResponse = await uddoktaPayService.initPayment({
    order_id: orderId,
    wallet_amount: paymentDetails.wallet_amount || 0,
    gateway_amount: paymentDetails.gateway_amount,
    payment_method: paymentDetails.payment_method || "Mobile Banking",
  });

  // Update stored invoice
  localStorage.setItem("last_invoice_id", paymentResponse.invoice_id);

  return {
    success: true,
    payment_url: paymentResponse.payment_url,
    invoice_id: paymentResponse.invoice_id,
  };
};

/* -------------------------------------------------------
 * CANCEL ORDER
 * ----------------------------------------------------- */
export const cancelOrder = async (orderId) => {
  return await uddoktaPayService.cancelPayment(orderId);
};

// EXTRACT ORDER NOTES

export const extractNotesFromOrders = (orders) => {
  const notes = [];

  orders.forEach((order) => {
    if (!order.order_notes || !Array.isArray(order.order_notes)) return;

    order.order_notes.forEach((note, index) => {
      if (note.content) {
        notes.push({
          id: `${order.id}-${note.id || index}`,
          orderId: order.id,
          orderStatus: order.status,
          productName: order.line_items?.[0]?.name || "Product",
          productImage: order.line_items?.[0]?.image || null,
          content: note.content,
          createdAt: note.date,
        });
      }
    });
  });

  // Sort by date (newest first)
  return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/* -------------------------------------------------------
 * FETCH USER ORDERS
 * ----------------------------------------------------- */
export const getCustomerOrders = async (perPage = 100) => {
  const customer = Storage.getCustomer();
  if (!customer.customer_id && !customer.email) return [];

  const params = {
    per_page: perPage,
    orderby: "date",
    order: "desc",
    _fields: FIELDS.order,
  };

  try {
    let orders = [];

    if (customer.customer_id) {
      const res = await api.get("/orders", {
        params: { ...params, customer: customer.customer_id },
      });
      orders = res.data;
    }

    if (!orders.length && customer.email) {
      const res = await api.get("/orders", {
        params: { ...params, _fields: `${FIELDS.order},customer_id` },
      });
      const email = customer.email.toLowerCase();
      orders = res.data.filter(
        (o) =>
          o.customer_id === customer.customer_id ||
          o.billing?.email?.toLowerCase() === email,
      );
    }

    if (orders.length) {
      orders = await enrichOrdersWithImages(orders);
    }

    return orders;
  } catch (err) {
    console.error("Orders fetch error:", err.message);
    return [];
  }
};

/* -------------------------------------------------------
 * GET SINGLE ORDER
 * ----------------------------------------------------- */
export const getOrder = async (orderId) => {
  const res = await api.get(`/orders/${orderId}`);
  return res.data;
};

/* -------------------------------------------------------
 * CLEAR CHECKOUT DATA
 * ----------------------------------------------------- */
export const clearCheckoutData = () => {
  localStorage.removeItem("checkout_data");
  localStorage.removeItem("last_order_id");
  localStorage.removeItem("last_invoice_id");
  localStorage.removeItem("last_payment_type");
  localStorage.removeItem("last_wallet_amount");
  localStorage.removeItem("last_gateway_amount");
};

/* -------------------------------------------------------
 * LEGACY EXPORTS (for backward compatibility)
 * ----------------------------------------------------- */
export const createOrder = createGatewayOrder;
export const createOrderWithWallet = createWalletOrder;
export const startHybridCheckout = startCheckout;
