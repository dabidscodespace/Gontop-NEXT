// src/config/gameValidation.js

// Field matchers - match by label (case-insensitive)
const FIELD_MATCHERS = {
  userId: ["user id", "player id", "uid", "game id", "id", "account id", "user"],
  serverId: ["zone id", "server id", "server", "zone", "region id"],
};

/**
 * Find field ID by matching label
 */
export const findFieldByLabel = (fields, fieldType) => {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return null;
  }

  const matchers = FIELD_MATCHERS[fieldType] || [];

  for (const field of fields) {
    const label = (field.label || "").toLowerCase().trim();
    if (matchers.some((matcher) => label.includes(matcher))) {
      return field.id;
    }
  }

  // Fallback: first field = userId, second field = serverId
  if (fieldType === "userId" && fields.length > 0) {
    return fields[0].id;
  }
  if (fieldType === "serverId" && fields.length > 1) {
    return fields[1].id;
  }

  return null;
};

// ===========================================
// GAME RULES - Using game-id-checker.vercel.app API format
// ===========================================
export const GAME_RULES = {
  // 🇧🇩 MLBB Bangladesh (Product ID: 24)
  24: {
    game: "cek-region-mlbb-m", // API endpoint path
    requiresServer: true,
    blockedRegions: ["id", "sg", "my", "ph"],
    parse: (data, variationId, zone, rawId) => {
      if (data.code !== 200 || !data.data?.username) {
        return { error: "invalid" };
      }

      const regionRaw = data?.data?.region || data?.data?.country || "";
      const region = regionRaw.toLowerCase();

      if (["id", "sg", "my", "ph"].includes(region)) {
        return { error: "blockedRegion", region: regionRaw };
      }

      // First Purchase Dias check
      const firstPurchaseMap = {
        678: "50+50",
        679: "150+150",
        680: "250+250",
        681: "500+500",
      };

      const THREE_DIAS_VARIATION_ID = 37568;
      let unavailableVariations = [];

      if (Array.isArray(data?.data?.item)) {
        for (const [varId, itemName] of Object.entries(firstPurchaseMap)) {
          const found = data.data.item.find((it) => it.item === itemName);
          if (found && found.status === false) {
            unavailableVariations.push(Number(varId));
          }
        }
      }

      const uid = String(rawId || "");
      if (uid.startsWith("20")) {
        unavailableVariations.push(THREE_DIAS_VARIATION_ID);
      }

      return {
        username: data.data.username,
        region: regionRaw,
        unavailableVariations,
      };
    },
  },

  // 🇧🇩 MLBB Bangladesh (Product ID: 160)
  160: {
    game: "cek-region-mlbb-m",
    requiresServer: true,
    blockedRegions: ["id", "sg", "my", "ph"],
    parse: (data, variationId, zone, rawId) => {
      if (data.code !== 200 || !data.data?.username) {
        return { error: "invalid" };
      }

      const regionRaw = data?.data?.region || data?.data?.country || "";
      const region = regionRaw.toLowerCase();

      if (["id", "sg", "my", "ph"].includes(region)) {
        return { error: "blockedRegion", region: regionRaw };
      }

      const firstPurchaseMap = {
        678: "50+50",
        679: "150+150",
        680: "250+250",
        681: "500+500",
      };

      const THREE_DIAS_VARIATION_ID = 37568;
      let unavailableVariations = [];

      if (Array.isArray(data?.data?.item)) {
        for (const [varId, itemName] of Object.entries(firstPurchaseMap)) {
          const found = data.data.item.find((it) => it.item === itemName);
          if (found && found.status === false) {
            unavailableVariations.push(Number(varId));
          }
        }
      }

      const uid = String(rawId || "");
      if (uid.startsWith("20")) {
        unavailableVariations.push(THREE_DIAS_VARIATION_ID);
      }

      return {
        username: data.data.username,
        region: regionRaw,
        unavailableVariations,
      };
    },
  },

  // 🇮🇩 MLBB Indonesia
  11363: {
    game: "check-region-mlbb",
    requiresServer: true,
    allowedRegions: ["id"],
    parse: (data) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };

      const regionRaw = data?.data?.region || "";
      if (regionRaw.toLowerCase() !== "id") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return { username: data.data.username, region: regionRaw };
    },
  },

  // 🇵🇭 MLBB Philippines
  1249: {
    game: "check-region-mlbb",
    requiresServer: true,
    allowedRegions: ["ph"],
    parse: (data) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };

      const regionRaw = data?.data?.region || "";
      if (regionRaw.toLowerCase() !== "ph") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return { username: data.data.username, region: regionRaw };
    },
  },

  // 🇲🇾 MLBB Malaysia/Singapore
  982: {
    game: "check-region-mlbb",
    requiresServer: true,
    allowedRegions: ["my", "sg"],
    parse: (data) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };

      const regionRaw = data?.data?.region || "";
      const region = regionRaw.toLowerCase();

      if (region !== "my" && region !== "sg") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return { username: data.data.username, region: regionRaw };
    },
  },

  // 🔥 Free Fire
  1217: {
    game: "free-fire",
    requiresServer: false,
    parse: (data) => {
      if (!data.success || !data.data?.nickname) return { error: "invalid" };
      return { username: data.data.nickname, region: "BD" };
    },
  },

  // 🎮 Marvel Rivals
  1203: {
    game: "marvel-rivals",
    requiresServer: false,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: data.data.region }
        : { error: "invalid" },
  },

  // 🩸 Blood Strike
  1145: {
    game: "blood-strike",
    requiresServer: true,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: data.data.zone || data.data.region }
        : { error: "invalid" },
  },

  // ♟️ Magic Chess Go Go
  22741: {
    game: "magic-chess-go-go",
    requiresServer: true,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: "GLOBAL" }
        : { error: "invalid" },
  },

  // 🌀 Zenless Zone Zero
  846: {
    game: "zzz",
    requiresServer: true,
    serverMapping: {
      fnrye: { code: "Asia_0", name: "Asia" },
      k8es8: { code: "America_1", name: "America" },
      "6uy1q": { code: "Europe_2", name: "Europe" },
      "4mrsw": { code: "TW,HK,MO_3", name: "TW/HK/MO" },
    },
    parse: (data, _, zone) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };
      const nameMap = {
        fnrye: "Asia",
        k8es8: "America",
        "6uy1q": "Europe",
        "4mrsw": "TW/HK/MO",
      };
      return { username: data.data.username, region: nameMap[zone] || "Unknown" };
    },
  },

  // ⭐ Honkai Star Rail
  824: {
    game: "honkai",
    requiresServer: true,
    serverMapping: {
      fnrye: { code: "prod_official_asia", name: "Asia" },
      k8es8: { code: "prod_official_usa", name: "America" },
      "6uy1q": { code: "prod_official_eur", name: "Europe" },
      "4mrsw": { code: "prod_official_cht", name: "TW/HK/MO" },
    },
    parse: (data, _, zone) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };
      const nameMap = {
        fnrye: "Asia",
        k8es8: "America",
        "6uy1q": "Europe",
        "4mrsw": "TW/HK/MO",
      };
      return { username: data.data.username, region: nameMap[zone] || "Unknown" };
    },
  },

  // ⚔️ Genshin Impact
  802: {
    game: "genshin-impact",
    requiresServer: true,
    serverMapping: {
      fnrye: { code: "os_asia", name: "Asia" },
      k8es8: { code: "os_usa", name: "America" },
      "6uy1q": { code: "os_euro", name: "Europe" },
      "4mrsw": { code: "os_cht", name: "TW/HK/MO" },
    },
    parse: (data, _, zone) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };
      const nameMap = {
        fnrye: "Asia",
        k8es8: "America",
        "6uy1q": "Europe",
        "4mrsw": "TW/HK/MO",
      };
      return { username: data.data.username, region: nameMap[zone] || "Unknown" };
    },
  },

  // 🎯 Delta Force
  17820: {
    game: "delta-force",
    requiresServer: false,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: data.data.region }
        : { error: "invalid" },
  },

  // 🤖 Punishing Gray Raven
  1023: {
    game: "punishing-gray-raven",
    requiresServer: true,
    serverMapping: {
      "3qrai": { code: "5000", name: "Asia Pacific" },
      "3kwk4": { code: "5001", name: "Europe" },
      idkg4: { code: "5002", name: "North America" },
    },
    parse: (data, _, zone) => {
      if (data.code !== 200 || !data.data?.username) return { error: "invalid" };
      const nameMap = {
        "3qrai": "Asia Pacific",
        "3kwk4": "Europe",
        idkg4: "North America",
      };
      return { username: data.data.username, region: nameMap[zone] || "Unknown" };
    },
  },

  // 👑 Honor of Kings
  911: {
    game: "honor-of-kings-vc",
    requiresServer: false,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: data.data.country || "Global" }
        : { error: "invalid" },
  },

  // 🎮 PUBG Mobile
  10580: {
    game: "pubg-mobile-global-vc",
    requiresServer: false,
    parse: (data) =>
      data.code === 200 && data.data?.username
        ? { username: data.data.username, region: data.data.country || "Global" }
        : { error: "invalid" },
  },
};

/**
 * Get validation config for a product
 */
export const getGameRule = (productId) => GAME_RULES[productId] || null;

export default GAME_RULES;