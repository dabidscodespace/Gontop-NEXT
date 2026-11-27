// server.js
import express     from "express";
import compression from "compression";
import fs          from "fs";
import path        from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const PORT      = process.env.PORT || 3000;

app.use(compression());

// ═══════════════════════════════════════
//  Read Vite build output
// ═══════════════════════════════════════
const template = fs.readFileSync(
  path.resolve(__dirname, "dist/index.html"),
  "utf-8",
);

// ═══════════════════════════════════════
//  Config
// ═══════════════════════════════════════
const BACKEND         = "https://dash.gontop.app";
const BASE_URL        = `${BACKEND}/wp-json`;
const STATIC_JSON_URL = `${BACKEND}/wp-content/uploads/api-cache`;
const SITE_URL        = "https://gontop.app";
const SITE_NAME       = "GONTOP";
const DEFAULT_IMAGE   = `${SITE_URL}/og-image-new.png`;
const DEFAULT_FAV     = `${SITE_URL}/logo-2.png`;

const FIELDS = {
  productDetail:
    "id,name,slug,price,regular_price,sale_price,min_price,max_price," +
    "price_html,price_range,description,short_description,images,attributes," +
    "variations,type,stock_status,stock_quantity,categories,product_badges," +
    "game_notification,sku,average_rating,rating_count",
  category:    "id,name,slug,count,image,parent,description",
  productList: "id,name,slug,price,images,type,categories,stock_status,stock_quantity,date_modified",
};

const POPULAR_GAMES = [
  "mobile-legends", "mlbb",
  "pubg", "pubg-mobile", "pubg-uc",
  "free-fire", "freefire", "ff",
  "clash-of-clans", "coc",
  "valorant", "vp",
  "genshin", "genshin-impact",
  "honkai", "star-rail",
  "wuthering-waves",
  "call-of-duty", "cod",
  "blood-strike",
  "roblox", "robux",
  "google-play",
  "steam",
  "netflix",
];

// ═══════════════════════════════════════
//  Cache Layer
// ═══════════════════════════════════════
const cache     = new Map();
const CACHE_TTL = 10 * 60 * 1000;

async function fetchWithCache(url, cacheKey) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(cacheKey, { data, time: Date.now() });
    return data;
  } catch (e) {
    console.error(`[Cache Miss] ${cacheKey}:`, e.message);
    return cached?.data || null;
  }
}

// ═══════════════════════════════════════
//  API Helpers
// ═══════════════════════════════════════
async function fetchProduct(slug) {
  // Try static JSON cache first
  try {
    const staticData = await fetchWithCache(
      `${STATIC_JSON_URL}/product-${slug}.json`,
      `static-product:${slug}`,
    );
    if (staticData) return staticData;
  } catch (e) { /* fallback */ }

  // Fallback to API
  try {
    const data = await fetchWithCache(
      `${BASE_URL}/api/v1/wc/products?slug=${slug}&fields=${FIELDS.productDetail}`,
      `product:${slug}`,
    );
    if (Array.isArray(data)) return data[0]          || null;
    if (data?.products)      return data.products[0] || null;
    if (data?.id)            return data;
    return null;
  } catch (e) {
    console.error(`[Product Fetch Failed] ${slug}:`, e.message);
    return null;
  }
}

async function fetchCategory(slug) {
  try {
    const data = await fetchWithCache(
      `${BASE_URL}/api/v1/wc/categories?slug=${slug}&fields=${FIELDS.category}`,
      `category:${slug}`,
    );
    if (Array.isArray(data)) return data[0]            || null;
    if (data?.categories)    return data.categories[0] || null;
    return null;
  } catch (e) { return null; }
}

async function fetchAllProducts() {
  try {
    const staticData = await fetchWithCache(
      `${STATIC_JSON_URL}/all-products.json`,
      "static-all-products",
    );
    if (staticData) {
      return Array.isArray(staticData) ? staticData : staticData.products || [];
    }
  } catch (e) { /* fallback */ }

  try {
    const data = await fetchWithCache(
      `${BASE_URL}/api/v1/wc/products?per_page=100&fields=${FIELDS.productList}`,
      "all-products",
    );
    if (Array.isArray(data)) return data;
    if (data?.products)      return data.products;
    return [];
  } catch (e) { return []; }
}

async function fetchAllCategories() {
  try {
    const data = await fetchWithCache(
      `${BASE_URL}/api/v1/wc/categories?per_page=100&fields=${FIELDS.category}`,
      "all-categories",
    );
    if (Array.isArray(data)) return data;
    if (data?.categories)    return data.categories;
    return [];
  } catch (e) { return []; }
}

// ═══════════════════════════════════════
//  Price Extraction
// ═══════════════════════════════════════
function extractPrices(product) {
  let lowPrice      = "0";
  let highPrice     = "0";
  let hasVariations = false;

  const cleanPrice = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const str = String(val).replace(/[৳$,\s]/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  if (product.type === "variable") {
    hasVariations = true;
    const minP = cleanPrice(product.min_price);
    const maxP = cleanPrice(product.max_price);

    if (minP > 0 && maxP > 0) {
      lowPrice  = String(minP);
      highPrice = String(maxP);
    } else if (product.price_range) {
      const pr    = product.price_range;
      const prMin = cleanPrice(pr.min_price ?? pr.min ?? pr.from ?? pr.min_amount);
      const prMax = cleanPrice(pr.max_price ?? pr.max ?? pr.to   ?? pr.max_amount);
      if (prMin > 0) lowPrice  = String(prMin);
      if (prMax > 0) highPrice = String(prMax);
    } else if (lowPrice === "0" && product.price) {
      lowPrice = highPrice = String(cleanPrice(product.price));
      hasVariations = false;
    }
  } else {
    const price = cleanPrice(product.price);
    if (price > 0) lowPrice = highPrice = String(price);
  }

  return { lowPrice, highPrice, hasVariations };
}

// ═══════════════════════════════════════
//  HTML Meta Injector
// ═══════════════════════════════════════
function injectSEO(html, seo) {
  const {
    title, description, canonical,
    ogType, ogImage, schema,
    breadcrumbSchema, keywords, contentHtml,
  } = seo;

  const safe = (str) =>
    (str || "")
      .replace(/&/g,  "&amp;")
      .replace(/"/g,  "&quot;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;");

  const img = ogImage || DEFAULT_IMAGE;

  // Primary
  html = html.replace(/<title>[^<]*<\/title>/i,
    `<title>${safe(title)}</title>`);
  html = html.replace(/<meta[^>]*name="title"[^>]*>/gi,
    `<meta name="title" content="${safe(title)}" />`);
  html = html.replace(/<meta[^>]*name="description"[^>]*>/gi,
    `<meta name="description" content="${safe(description)}" />`);
  html = html.replace(/<meta[^>]*name="keywords"[^>]*>/gi,
    `<meta name="keywords" content="${safe(keywords || "")}" />`);
  html = html.replace(/<link[^>]*rel="canonical"[^>]*>/gi,
    `<link rel="canonical" href="${canonical}" />`);

  // Open Graph
  html = html.replace(/<meta[^>]*property="og:type"[^>]*>/gi,
    `<meta property="og:type" content="${ogType || "website"}" />`);
  html = html.replace(/<meta[^>]*property="og:url"[^>]*>/gi,
    `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta[^>]*property="og:title"[^>]*>/gi,
    `<meta property="og:title" content="${safe(title)}" />`);
  html = html.replace(/<meta[^>]*property="og:description"[^>]*>/gi,
    `<meta property="og:description" content="${safe(description)}" />`);
  html = html.replace(/<meta[^>]*property="og:image"[^>]*>/gi,
    `<meta property="og:image" content="${img}" />`);
  html = html.replace(/<meta[^>]*property="og:image:secure_url"[^>]*>/gi,
    `<meta property="og:image:secure_url" content="${img}" />`);
  html = html.replace(/<meta[^>]*property="og:site_name"[^>]*>/gi,
    `<meta property="og:site_name" content="${SITE_NAME}" />`);

  // Twitter
  html = html.replace(/<meta[^>]*name="twitter:card"[^>]*>/gi,
    `<meta name="twitter:card" content="summary_large_image" />`);
  html = html.replace(/<meta[^>]*name="twitter:url"[^>]*>/gi,
    `<meta name="twitter:url" content="${canonical}" />`);
  html = html.replace(/<meta[^>]*name="twitter:title"[^>]*>/gi,
    `<meta name="twitter:title" content="${safe(title)}" />`);
  html = html.replace(/<meta[^>]*name="twitter:description"[^>]*>/gi,
    `<meta name="twitter:description" content="${safe(description)}" />`);
  html = html.replace(/<meta[^>]*name="twitter:image"[^>]*>/gi,
    `<meta name="twitter:image" content="${img}" />`);

  // JSON-LD schemas
  let schemaScripts = "";
  if (schema)           schemaScripts += `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
  if (breadcrumbSchema) schemaScripts += `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>\n`;
  if (schemaScripts)    html = html.replace("</head>", `${schemaScripts}</head>`);

  // Hidden SSR content for crawlers
  if (contentHtml) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><div id="ssr-seo" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${contentHtml}</div></div>`,
    );
  }

  return html;
}

// ═══════════════════════════════════════
//  ROUTE: Homepage
// ═══════════════════════════════════════
app.get("/", async (req, res) => {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:        SITE_NAME,
    url:         SITE_URL,
    description:
      "GONTOP is Bangladesh's most trusted game top-up platform. " +
      "Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more " +
      "at the cheapest price. Instant delivery with bKash, Nagad & Rocket.",
    potentialAction: {
      "@type":       "SearchAction",
      target:        `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type":    "Organization",
    name:        SITE_NAME,
    url:         SITE_URL,
    logo:        DEFAULT_FAV,
    description: "Bangladesh's most trusted game top-up platform",
    address: {
      "@type":          "PostalAddress",
      addressCountry:   "BD",
      addressRegion:    "Dhaka",
    },
  };

  const homepageContent = `
    <div>
      <h1>GONTOP - Best Game Top-Up Store in Bangladesh</h1>
      <h2>Buy PUBG UC, MLBB Diamonds & Game Top-Ups at Best Price</h2>
      <p>
        GONTOP is Bangladesh's most trusted game top-up platform.
        Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds
        and more at the cheapest price.
        Instant delivery with bKash, Nagad & Rocket.
      </p>
      <h3>Popular Top-Ups</h3>
      <ul>
        <li><a href="/product/mobile-legends">Mobile Legends Diamonds Bangladesh</a></li>
        <li><a href="/product/pubg-mobile">PUBG UC Bangladesh</a></li>
        <li><a href="/product/free-fire">Free Fire Diamond Bangladesh</a></li>
        <li><a href="/product/clash-of-clans">Clash of Clans Gems Bangladesh</a></li>
        <li><a href="/product/valorant">Valorant VP Bangladesh</a></li>
        <li><a href="/product/genshin-impact">Genshin Impact Bangladesh</a></li>
      </ul>
      <h3>কেন GONTOP?</h3>
      <ul>
        <li>✅ বাংলাদেশে সবচেয়ে কম দাম</li>
        <li>✅ তাৎক্ষণিক ডেলিভারি</li>
        <li>✅ বিকাশ, নগদ, রকেট পেমেন্ট</li>
        <li>✅ ১০০% নিরাপদ ও বিশ্বস্ত</li>
      </ul>
    </div>
  `;

  let html = injectSEO(template, {
    title:
      `${SITE_NAME} - Best Game Top-Up Store in Bangladesh`,
    description:
      "GONTOP is Bangladesh's most trusted game top-up platform. " +
      "Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more " +
      "at the cheapest price. Instant delivery with bKash, Nagad & Rocket.",
    canonical:   SITE_URL,
    ogType:      "website",
    ogImage:     DEFAULT_IMAGE,
    keywords:
      "buy UC bangladesh, PUBG UC bd, MLBB diamonds bangladesh, " +
      "mobile legends top up, free fire diamonds bd, game top up bangladesh, " +
      "cheap UC, gontop, top up bd, bkash game top up, nagad game top up",
    schema:      websiteSchema,
    contentHtml: homepageContent,
  });

  html = html.replace(
    "</head>",
    `<script type="application/ld+json">${JSON.stringify(orgSchema)}</script>\n</head>`,
  );

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ═══════════════════════════════════════
//  ROUTE: Product Pages
// ═══════════════════════════════════════
app.get("/product/:slug", async (req, res) => {
  const { slug }  = req.params;
  const product   = await fetchProduct(slug);

  if (!product) {
    res.status(404).setHeader("Content-Type", "text/html");
    return res.send(template);
  }

  const cleanDesc =
    (product.description || product.short_description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 155) ||
    `Buy ${product.name} in Bangladesh at ${SITE_NAME}. ` +
    `Instant delivery via bKash, Nagad & Rocket.`;

  let image = DEFAULT_IMAGE;
  if (product.images?.length > 0) {
    image = product.images[0]?.src || product.images[0] || DEFAULT_IMAGE;
  }

  const catName = product.categories?.[0]?.name || "Games";
  const catSlug = product.categories?.[0]?.slug  || "";

  const { lowPrice, highPrice, hasVariations } = extractPrices(product);
  const inStock = product.stock_status !== "outofstock";

  let startingPriceText = "";
  if (lowPrice !== "0") {
    startingPriceText =
      hasVariations && lowPrice !== highPrice
        ? `Starting from ৳${lowPrice}`
        : `৳${lowPrice}`;
  }

  const seoTitle =
    `${SITE_NAME} - ${product.name} - Buy in Bangladesh`;

  const seoDesc = startingPriceText
    ? `${product.name} - ${startingPriceText}. ` +
      `${inStock ? "✓ In Stock" : "Out of Stock"}. ` +
      `Instant delivery via bKash, Nagad & Rocket in Bangladesh.`
    : `Buy ${product.name} at cheapest price in Bangladesh. ` +
      `Instant delivery via bKash, Nagad & Rocket.`;

  const keywords = [
    product.name,
    `${product.name} bangladesh`,
    `${product.name} top up`,
    `${product.name} bd`,
    `buy ${product.name}`,
    `${product.name} bkash`,
    catName,
    SITE_NAME,
  ].join(", ");

  // Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type":    "Product",
    name:        product.name,
    image:       product.images?.map((img) => img?.src || img).filter(Boolean) || [image],
    description: cleanDesc,
    sku:         product.sku || slug,
    mpn:         product.sku || slug,
    brand:       { "@type": "Brand", name: catName },
    offers:
      hasVariations && lowPrice !== highPrice
        ? {
            "@type":         "AggregateOffer",
            url:             `${SITE_URL}/product/${slug}`,
            priceCurrency:   "BDT",
            lowPrice,
            highPrice,
            offerCount:      product.variations?.length || 1,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                               .toISOString().split("T")[0],
            availability:    inStock
                               ? "https://schema.org/InStock"
                               : "https://schema.org/OutOfStock",
            itemCondition:   "https://schema.org/NewCondition",
            seller:          { "@type": "Organization", name: SITE_NAME },
          }
        : {
            "@type":         "Offer",
            url:             `${SITE_URL}/product/${slug}`,
            priceCurrency:   "BDT",
            price:           lowPrice,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                               .toISOString().split("T")[0],
            availability:    inStock
                               ? "https://schema.org/InStock"
                               : "https://schema.org/OutOfStock",
            itemCondition:   "https://schema.org/NewCondition",
            seller:          { "@type": "Organization", name: SITE_NAME },
          },
  };

  // Rating — only if valid
  const ratingValue = parseFloat(product.average_rating) || 0;
  const reviewCount = parseInt(product.rating_count)     || 0;
  if (ratingValue >= 1 && ratingValue <= 5 && reviewCount > 0) {
    productSchema.aggregateRating = {
      "@type":      "AggregateRating",
      ratingValue:  ratingValue.toFixed(1),
      bestRating:   "5",
      worstRating:  "1",
      reviewCount:  String(reviewCount),
    };
  }

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name:    `How to buy ${product.name} in Bangladesh?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            `Select your package on ${SITE_NAME}, enter your game ID, ` +
            `pay via bKash, Nagad or Rocket, and receive instantly.`,
        },
      },
      {
        "@type": "Question",
        name:    `What payment methods are available for ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:    "bKash, Nagad and Rocket are all supported.",
        },
      },
      {
        "@type": "Question",
        name:    `Is ${product.name} top-up safe on ${SITE_NAME}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes, all products are officially sourced. " +
            "Your account and transactions are 100% secure.",
        },
      },
    ],
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...(catSlug
        ? [{ "@type": "ListItem", position: 2, name: catName, item: `${SITE_URL}/category/${catSlug}` }]
        : []),
      {
        "@type":   "ListItem",
        position:  catSlug ? 3 : 2,
        name:      product.name,
        item:      `${SITE_URL}/product/${slug}`,
      },
    ],
  };

  const contentHtml = `
    <article>
      <h1>${product.name} - Buy in Bangladesh - ${SITE_NAME}</h1>
      ${startingPriceText ? `<p><strong>Price: ${startingPriceText}</strong></p>` : ""}
      <p>${cleanDesc}</p>
      <h2>${product.name} Top Up Bangladesh</h2>
      <p>
        Buy ${product.name} in Bangladesh at the cheapest price.
        Instant delivery via bKash, Nagad & Rocket.
        সেরা দামে ${product.name} কিনুন।
      </p>
    </article>
  `;

  let html = injectSEO(template, {
    title:            seoTitle,
    description:      seoDesc,
    canonical:        `${SITE_URL}/product/${slug}`,
    ogType:           "product",
    ogImage:          image,
    keywords,
    schema:           productSchema,
    breadcrumbSchema,
    contentHtml,
  });

  const priceMeta =
    `<meta property="product:price:amount"   content="${lowPrice}" />\n` +
    `<meta property="product:price:currency" content="BDT" />\n` +
    `<meta property="og:price:amount"        content="${lowPrice}" />\n` +
    `<meta property="og:price:currency"      content="BDT" />\n` +
    `<meta property="product:availability"   content="${inStock ? "in stock" : "out of stock"}" />\n`;

  html = html.replace("</head>", `${priceMeta}</head>`);
  html = html.replace(
    "</head>",
    `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>\n</head>`,
  );

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ═══════════════════════════════════════
//  ROUTE: Category Pages
// ═══════════════════════════════════════
app.get("/category/:slug", async (req, res) => {
  const { slug }  = req.params;
  const category  = await fetchCategory(slug);

  if (!category) {
    res.status(404).setHeader("Content-Type", "text/html");
    return res.send(template);
  }

  const desc =
    (category.description || "")
      .replace(/<[^>]*>/g, "")
      .trim() ||
    `Buy ${category.name} top-ups at cheapest price in Bangladesh. ` +
    `Instant delivery via bKash, Nagad & Rocket.`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",        item: SITE_URL },
      { "@type": "ListItem", position: 2, name: category.name, item: `${SITE_URL}/category/${slug}` },
    ],
  };

  const html = injectSEO(template, {
    title:           `${SITE_NAME} - ${category.name} - Game Top-Ups Bangladesh`,
    description:     `Buy ${category.name} at cheapest price in Bangladesh. ${desc.substring(0, 100)}`,
    canonical:       `${SITE_URL}/category/${slug}`,
    ogType:          "website",
    ogImage:         category.image?.src || DEFAULT_IMAGE,
    keywords:        `${category.name}, ${category.name} bangladesh, ${category.name} top up bd, gontop`,
    breadcrumbSchema,
    contentHtml:     `<h1>${category.name} - Game Top-Ups Bangladesh</h1><p>${desc}</p>`,
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ═══════════════════════════════════════
//  ROUTE: About Page
// ═══════════════════════════════════════
app.get("/about", async (req, res) => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",     item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About Us", item: `${SITE_URL}/about` },
    ],
  };

  const html = injectSEO(template, {
    title:       `${SITE_NAME} - About Us`,
    description:
      "GONTOP is Bangladesh's most trusted game top-up platform. " +
      "Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more. " +
      "Instant delivery with bKash, Nagad & Rocket.",
    canonical:       `${SITE_URL}/about`,
    ogType:          "website",
    ogImage:         DEFAULT_IMAGE,
    keywords:        "gontop about, game top up bangladesh, trusted game top up, gontop.app",
    breadcrumbSchema,
    contentHtml:
      `<h1>About ${SITE_NAME}</h1>` +
      `<p>Bangladesh's most trusted game top-up platform. ` +
      `Buy PUBG UC, MLBB Diamonds & more at cheapest price.</p>`,
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ═══════════════════════════════════════
//  ROUTE: Sitemap.xml
// ═══════════════════════════════════════
app.get("/sitemap.xml", async (req, res) => {
  const [products, categories] = await Promise.all([
    fetchAllProducts(),
    fetchAllCategories(),
  ]);

  const today = new Date().toISOString();

  const staticXml = [
    `  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
  ].join("\n");

  const categoryXml = (categories || [])
    .filter((c) => c.slug)
    .map(
      (c) =>
        `  <url>` +
        `<loc>${SITE_URL}/category/${c.slug}</loc>` +
        `<lastmod>${today}</lastmod>` +
        `<changefreq>weekly</changefreq>` +
        `<priority>0.7</priority>` +
        `</url>`,
    ).join("\n");

  const productXml = (products || [])
    .filter((p) => p.slug)
    .map((p) => {
      const slug      = (p.slug || "").toLowerCase();
      const name      = (p.name || "").toLowerCase();
      const isPopular = POPULAR_GAMES.some(
        (g) => slug.includes(g) || name.includes(g),
      );
      const lastmod   = p.date_modified
        ? new Date(p.date_modified).toISOString()
        : today;
      return (
        `  <url>` +
        `<loc>${SITE_URL}/product/${p.slug}</loc>` +
        `<lastmod>${lastmod}</lastmod>` +
        `<changefreq>weekly</changefreq>` +
        `<priority>${isPopular ? "0.9" : "0.8"}</priority>` +
        `</url>`
      );
    }).join("\n");

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [staticXml, categoryXml, productXml].filter(Boolean).join("\n") +
    `\n</urlset>`;

  res.header("Content-Type", "application/xml");
  res.header("Cache-Control", "public, max-age=3600");
  res.send(sitemap);
});

// ═══════════════════════════════════════
//  ROUTE: Robots.txt
// ═══════════════════════════════════════
app.get("/robots.txt", (req, res) => {
  res.header("Content-Type", "text/plain");
  res.send(
    `User-agent: *\n` +
    `Allow: /\n` +
    `Allow: /product/\n` +
    `Allow: /about\n` +
    `\n` +
    `Disallow: /account\n` +
    `Disallow: /orders\n` +
    `Disallow: /wallet\n` +
    `Disallow: /checkout/\n` +
    `\n` +
    `Sitemap: ${SITE_URL}/sitemap.xml\n`,
  );
});

// ═══════════════════════════════════════
//  API Proxy — WordPress
// ═══════════════════════════════════════
app.options(/^\/wp-json\/.*/, (req, res) => {
  res.setHeader("Access-Control-Allow-Origin",      req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods",     "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",     "Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age",           "86400");
  res.status(204).end();
});

app.all(/^\/wp-json\/(.*)/, async (req, res) => {
  try {
    const wpPath      = req.params[0] || "";
    const url         = new URL(`${BACKEND}/wp-json/${wpPath}`);
    const queryString = req.originalUrl.split("?")[1];

    if (queryString) {
      queryString.split("&").forEach((param) => {
        const [key, ...valueParts] = param.split("=");
        url.searchParams.set(
          decodeURIComponent(key),
          decodeURIComponent(valueParts.join("=") || ""),
        );
      });
    }

    const headers = {
      Host:              "dash.gontop.app",
      "X-Real-IP":       req.ip,
      "X-Forwarded-For": req.ip,
    };
    if (req.headers.authorization)   headers["Authorization"] = req.headers.authorization;
    if (req.headers["content-type"]) headers["Content-Type"]  = req.headers["content-type"];

    const fetchOptions = { method: req.method, headers };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (body.length > 0) fetchOptions.body = body;
    }

    const response    = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin",      req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(response.status);
    res.send(await response.text());
  } catch (error) {
    console.error("[WP Proxy Error]", error.message);
    res.status(502).json({ error: "Proxy error" });
  }
});

// ═══════════════════════════════════════
//  API Proxy — Game Check
// ═══════════════════════════════════════
app.options(/^\/api\/gamecheck\/.*/, (req, res) => {
  res.setHeader("Access-Control-Allow-Origin",      req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods",     "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",     "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(204).end();
});

app.all(/^\/api\/gamecheck\/(.*)/, async (req, res) => {
  try {
    const gamePath    = req.params[0] || "";
    const url         = new URL(`${BACKEND}/game/checkid/${gamePath}`);
    const queryString = req.originalUrl.split("?")[1];

    if (queryString) {
      queryString.split("&").forEach((param) => {
        const [key, ...valueParts] = param.split("=");
        url.searchParams.set(
          decodeURIComponent(key),
          decodeURIComponent(valueParts.join("=") || ""),
        );
      });
    }

    const headers = { Host: "dash.gontop.app" };
    if (req.headers["content-type"]) headers["Content-Type"]  = req.headers["content-type"];
    if (req.headers.authorization)   headers["Authorization"] = req.headers.authorization;

    const fetchOptions = { method: req.method, headers };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (body.length > 0) fetchOptions.body = body;
    }

    const response    = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin",      req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(response.status);
    res.send(await response.text());
  } catch (error) {
    console.error("[GameCheck Proxy Error]", error.message);
    res.status(502).json({ error: "Proxy error" });
  }
});

// ═══════════════════════════════════════
//  Static Files
// ═══════════════════════════════════════
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "dist/assets"), {
    maxAge:    "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js"))  res.setHeader("Content-Type", "application/javascript");
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
    },
  }),
);

app.use(
  express.static(path.resolve(__dirname, "dist"), {
    maxAge: "1h",
    index:  false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js"))  res.setHeader("Content-Type", "application/javascript");
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
    },
  }),
);

// ═══════════════════════════════════════
//  Catch-all → React SPA
// ═══════════════════════════════════════
app.use((req, res) => {
  if (
    req.originalUrl.match(
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|xml|txt|webp|avif)$/i,
    )
  ) {
    return res.status(404).send("File not found");
  }
  res.setHeader("Content-Type", "text/html");
  res.send(template);
});

// ═══════════════════════════════════════
//  Start Server
// ═══════════════════════════════════════
app.listen(PORT, () => {
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("🎮 GONTOP - SEO SERVER");
  console.log("═══════════════════════════════════════════════");
  console.log(`📍 Port    : ${PORT}`);
  console.log(`🔗 Backend : ${BACKEND}`);
  console.log(`🌐 Site    : ${SITE_URL}`);
  console.log("✅ SSR Meta Injection  — ON");
  console.log("✅ JSON-LD Schemas     — ON");
  console.log("✅ Dynamic Sitemap     — ON");
  console.log("✅ Dynamic Robots.txt  — ON");
  console.log("✅ WP API Proxy        — ON");
  console.log("✅ GameCheck Proxy     — ON");
  console.log("✅ Static File Serving — ON");
  console.log("═══════════════════════════════════════════════");
  console.log("");
});