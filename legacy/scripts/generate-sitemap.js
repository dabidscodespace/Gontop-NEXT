// scripts/generate-sitemap.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = "https://gontop.app";
const WP_API = "https://dash.gontop.app/wp-json/api/v1/wc";

const POPULAR_GAMES = [
  "mobile-legends",
  "mlbb",
  "pubg",
  "pubg-mobile",
  "pubg-uc",
  "free-fire",
  "freefire",
  "ff",
  "clash-of-clans",
  "coc",
  "valorant",
  "genshin",
  "genshin-impact",
  "honkai",
  "star-rail",
  "wuthering-waves",
  "call-of-duty",
  "cod",
  "blood-strike",
  "roblox",
  "google-play",
  "steam",
  "netflix",
];

async function fetchAllProducts() {
  const products = [];
  let page = 1;

  console.log("📦 Fetching products...");

  while (true) {
    try {
      const url = `${WP_API}/products?per_page=100&page=${page}&fields=id,slug,name,date_modified`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) break;
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      products.push(...data);
      console.log(`   ✓ Page ${page}: ${data.length} products`);
      page++;
      if (page > 50) break;
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
      break;
    }
  }

  return products;
}

async function fetchAllCategories() {
  const categories = [];
  let page = 1;

  console.log("📁 Fetching categories...");

  while (true) {
    try {
      const url = `${WP_API}/categories?per_page=100&page=${page}&fields=id,slug,name`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) break;
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      categories.push(...data);
      console.log(`   ✓ Page ${page}: ${data.length} categories`);
      page++;
      if (page > 20) break;
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
      break;
    }
  }

  return categories;
}

async function generateSitemap() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("🚀 GONTOP - SITEMAP GENERATOR");
  console.log("═══════════════════════════════════════════════\n");

  const TODAY = new Date().toISOString().split("T")[0];

  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/about", priority: "0.6", changefreq: "monthly" },
  ];

  const [products, categories] = await Promise.all([
    fetchAllProducts(),
    fetchAllCategories(),
  ]);

  const categoryPages = categories
    .filter((c) => c.slug)
    .map((c) => ({
      path: `/category/${c.slug}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: TODAY,
    }));

  const productPages = products
    .filter((p) => p.slug)
    .map((p) => {
      const slug = p.slug.toLowerCase();
      const name = (p.name || "").toLowerCase();

      const isPopular = POPULAR_GAMES.some(
        (g) => slug.includes(g) || name.includes(g),
      );

      const lastmod = p.date_modified
        ? new Date(p.date_modified).toISOString().split("T")[0]
        : TODAY;

      return {
        path: `/product/${p.slug}`,
        name: p.name,
        priority: isPopular ? "0.9" : "0.8",
        changefreq: "weekly",
        lastmod,
        isPopular,
      };
    });

  const allPages = [
    ...staticPages.map((p) => ({ ...p, lastmod: TODAY })),
    ...categoryPages,
    ...productPages,
  ];

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    allPages
      .map(
        (p) =>
          `  <url>\n` +
          `    <loc>${SITE_URL}${p.path}</loc>\n` +
          `    <lastmod>${p.lastmod}</lastmod>\n` +
          `    <changefreq>${p.changefreq}</changefreq>\n` +
          `    <priority>${p.priority}</priority>\n` +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>`;

  const publicDir = path.resolve(__dirname, "../public");
  const outputPath = path.join(publicDir, "sitemap.xml");

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outputPath, sitemap);

  const popularCount = productPages.filter((p) => p.isPopular).length;
  const regularCount = productPages.length - popularCount;

  console.log("\n═══════════════════════════════════════════════");
  console.log("✅ SITEMAP GENERATED!");
  console.log("═══════════════════════════════════════════════");
  console.log(`   📄 Static:     ${staticPages.length}`);
  console.log(`   📁 Categories: ${categoryPages.length}`);
  console.log(`   🔥 Popular:    ${popularCount}  (priority 0.9)`);
  console.log(`   📦 Regular:    ${regularCount}  (priority 0.8)`);
  console.log(`   📊 Total:      ${allPages.length}`);
  console.log(`\n   📁 Saved → ${outputPath}`);
  console.log(`   🌐 Live  → ${SITE_URL}/sitemap.xml`);
  console.log("═══════════════════════════════════════════════\n");
}

generateSitemap().catch((err) => {
  console.error("\n❌ FAILED:", err.message);
  process.exit(1);
});
