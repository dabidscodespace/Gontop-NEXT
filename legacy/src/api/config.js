// src/api/config.js

const isDev = import.meta.env.DEV;
const BACKEND = "https://dash.gontop.app";
const WP_BASE = isDev ? "" : BACKEND;

export const CONFIG = {
  BASE_URL: `${WP_BASE}/wp-json`,
  SITE_URL: WP_BASE,
  TIMEOUT: 15000,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,

  // ✅ Cache settings - OPTIMIZED
  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes (was 5)
  CACHE_PREFIX: "wc-",

  // ✅ Version check - OPTIMIZED (30 seconds is too frequent!)
  VERSION_CHECK_INTERVAL: 3 * 60 * 1000, // 3 minutes

  DEFAULT_CURRENCY: "BDT",

  // ✅ Static JSON URL for pre-generated data
  STATIC_JSON_URL: `${BACKEND}/wp-content/uploads/api-cache`,
};

export const ENDPOINTS = {
  JWT: `${CONFIG.BASE_URL}/jwt-auth/v1/token`,
  API: `${CONFIG.BASE_URL}/api/v1/wc`,
  LICENSE: `${CONFIG.BASE_URL}/api/v1/lc`,
  PAYMENT: `${CONFIG.BASE_URL}/uddoktapay/v1`,
  GOOGLE_AUTH: `${CONFIG.BASE_URL}/custom/v1/google-login`,
  CACHE_VERSION: `${CONFIG.BASE_URL}/gontop/v1/cache-version`,
  REVIEWS: `${CONFIG.BASE_URL}/wc/v3/products/reviews`,
  PRODUCT_FIELDS: `${CONFIG.BASE_URL}/api/v1/product-fields`,
};

export const FIELDS = {
  category: "id,name,slug,count,image,parent",

  productList:
    "id,name,slug,price,images,type,categories,stock_status,stock_quantity,average_rating,rating_count,short_description",

  productDetail:
    "id,name,slug,price,regular_price,description,short_description,images,attributes,variations,type,stock_status,stock_quantity,categories,product_badges,game_notification,average_rating,rating_count",

  productCategory:
    "id,name,slug,type,price,regular_price,images,attributes,stock_status,stock_quantity,average_rating,rating_count,short_description",

  variation:
    "id,price,regular_price,attributes,image,sku,stock_status,stock_quantity,description",

  order:
    "id,status,date_created,total,line_items,billing,order_notes,refunds,refund_total,refund_reason,transaction_id,discount_total,payment_method_title,meta_data,customer_note",
};

export const HOMEPAGE_CATEGORIES = {
  FEATURED_CATEGORY_ID: 113,
  POPULAR_CATEGORY_ID: 53, // modal category card
  POPULAR_GRID_CATEGORY_ID: 34, // grid products
};
