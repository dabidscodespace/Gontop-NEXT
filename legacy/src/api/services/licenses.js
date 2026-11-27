// src/api/services/licenses.js
import { licenseApi } from "../axios";
import { Storage } from "../utils/storage";
import { getCustomerOrders } from "./orders";

export const getCustomerLicenses = async () => {
  try {
    const customer = Storage.getCustomer();
    const email = customer?.email;
    if (!email) return [];

    const orders = await getCustomerOrders(100);
    if (!orders?.length) return [];

    const orderIds = orders
      .filter((o) => ["completed", "processing"].includes(o.status))
      .map((o) => o.id);

    if (!orderIds.length) return [];

    // Use proxy - no credentials needed
    const { data } = await licenseApi.get("/licenses", {
      params: { per_page: 500 },
    });

    const allLicenses = data?.data || data || [];

    const customerLicenses = allLicenses.filter((license) => {
      const licenseOrderId = parseInt(license.orderId || license.order_id);
      return orderIds.includes(licenseOrderId);
    });

    return customerLicenses.map((license) => {
      const orderId = parseInt(license.orderId || license.order_id);
      const order = orders.find((o) => o.id === orderId);
      const productId = parseInt(license.productId || license.product_id);

      let productName = "Product #" + productId;
      if (order?.line_items) {
        const item = order.line_items.find(
          (i) => i.product_id === productId || i.variation_id === productId,
        );
        if (item) productName = item.name;
      }

      return {
        id: license.id,
        licenseKey:
          license.licenseKey ||
          license.decryptedLicenseKey ||
          license.license_key,
        orderId,
        productId,
        productName,
        status: "delivered",
        createdAt: license.createdAt || license.created_at,
        orderDate: order?.date_created,
      };
    });
  } catch (error) {
    console.error("[Licenses] Fetch error:", error);
    return [];
  }
};