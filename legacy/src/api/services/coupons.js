// src/api/services/coupons.js
import { publicApi } from "../axios";  // Changed: api → publicApi
import { Cache } from "../utils/cache";

export const getCouponByCode = async (code) => {
  if (!code) return null;

  const normalizedCode = code.toLowerCase().trim();
  const cacheKey = Cache.key("coupon", normalizedCode);
  const cached = Cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await publicApi.get("/coupons", {  // Changed
      params: { code: normalizedCode },
    });
    const coupon = response.data?.[0] || null;

    if (!coupon) return null;

    const isExpired =
      coupon.date_expires && new Date(coupon.date_expires) < new Date();
    if (isExpired) return null;

    Cache.set(cacheKey, coupon);
    return coupon;
  } catch (e) {
    console.error("Coupon fetch error:", e.message);
    return null;
  }
};

export const calculateDiscount = (coupon, total) => {
  if (!coupon || !total || total <= 0) return 0;

  const amount = parseFloat(coupon.amount) || 0;
  let discount = 0;

  switch (coupon.discount_type) {
    case "percent":
      discount = (total * amount) / 100;
      break;
    case "fixed_cart":
      discount = amount;
      break;
    default:
      discount = 0;
  }

  return Math.min(Math.max(0, discount), total);
};

// Backward compatibility
export const computeCouponDiscount = calculateDiscount;