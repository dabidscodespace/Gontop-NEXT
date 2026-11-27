/* -------------------------------------------------------
 * GAME_RULES — React‑style translation of your WP checker
 * ----------------------------------------------------- */
export const GAME_RULES = {
  /* =============================== MLBB (Bangladesh) =============================== */
  24: {
    body: (id, server) => ({ game: "MLBB-BD", id, server }),
    parse: (data, variationId, zone, rawId) => {
      const regionRaw = data?.data?.region || "";
      const region = regionRaw.toLowerCase();
      const blocked = ["id", "sg", "my", "ph"];

      if (blocked.includes(region)) {
        return { error: "blockedRegion", region: regionRaw };
      }

      // First Purchase Dias (disabled if already purchased - checked via API)
      const firstPurchaseMap = {
        678: "50+50",
        679: "150+150",
        680: "250+250",
        681: "500+500",
      };

      // 3 Dias variation ID
      const THREE_DIAS_VARIATION_ID = 37568;

      let unavailableVariations = [];

      // Check First Purchase Dias availability from API response
      if (Array.isArray(data?.data?.item)) {
        for (const [varId, itemName] of Object.entries(firstPurchaseMap)) {
          const found = data.data.item.find((it) => it.item === itemName);
          if (found && found.status === false) {
            unavailableVariations.push(Number(varId));
          }
        }
      }

      // Disable 3 Dias if UID starts with "20"
      const uid = String(rawId || "");
      if (uid.startsWith("20")) {
        unavailableVariations.push(THREE_DIAS_VARIATION_ID);
      }

      return data.code === 200
        ? {
            username: data.data.nickname,
            region: regionRaw,
            unavailableVariations,
          }
        : { error: "invalid" };
    },
  },

  /* =============================== MLBB (Indonesia) =============================== */
  11363: {
    body: (id, server) => ({ game: "MLBB", id, server }),
    parse: (data) => {
      const regionRaw = data?.data?.region || "";
      const region = regionRaw.toLowerCase();

      if (region !== "id") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return data.code === 200
        ? { username: data.data.nickname, region: regionRaw }
        : { error: "invalid" };
    },
  },

  /* =============================== MLBB (Philippines) =============================== */
  1249: {
    body: (id, server) => ({ game: "MLBB", id, server }),
    parse: (data) => {
      const regionRaw = data?.data?.region || "";
      const region = regionRaw.toLowerCase();

      if (region !== "ph") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return data.code === 200
        ? { username: data.data.nickname, region: regionRaw }
        : { error: "invalid" };
    },
  },

  /* =============================== MLBB (Malaysia / Singapore) =============================== */
  982: {
    body: (id, server) => ({ game: "MLBB", id, server }),
    parse: (data) => {
      const regionRaw = data?.data?.region || "";
      const region = regionRaw.toLowerCase();

      if (region !== "my" && region !== "sg") {
        return { error: "blockedRegion", region: regionRaw };
      }

      return data.code === 200
        ? { username: data.data.nickname, region: regionRaw }
        : { error: "invalid" };
    },
  },

  /* =============================== Free Fire =============================== */
  1217: {
    body: (id) => ({ game: "free-fire", id }),
    parse: (data) =>
      data.success
        ? { username: data.data.nickname, region: "BD" }
        : { error: "invalid" },
  },

  /* =============================== Marvel Rivals =============================== */
  1203: {
    body: (id) => ({ game: "MR", id }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: data.data.region }
        : { error: "invalid" },
  },

  /* =============================== Blood Strike =============================== */
  1145: {
    body: (id) => ({ game: "BS", id }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: data.data.region }
        : { error: "invalid" },
  },

  /* =============================== MCGG =============================== */
  22741: {
    body: (id, server) => ({ game: "MCGG", id, server }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: "GLOBAL" }
        : { error: "invalid" },
  },

  /* =============================== Zenless Zone Zero =============================== */
  846: {
    body: (id, zone) => {
      const serverMap = {
        fnrye: "prod_gf_jp",
        k8es8: "prod_gf_us",
        "6uy1q": "prod_gf_eu",
        "4mrsw": "prod_gf_sg",
      };
      return { id, server: serverMap[zone], game: "ZZZ" };
    },
    parse: (data, _, zone) => {
      const nameMap = {
        fnrye: "Asia",
        k8es8: "America",
        "6uy1q": "Europe",
        "4mrsw": "TW/HK/MO",
      };
      return data.code === 200
        ? { username: data.data.nickname, region: nameMap[zone] || "Unknown" }
        : { error: "invalid" };
    },
  },

  /* =============================== Honkai Star Rail =============================== */
  824: {
    body: (id, zone) => {
      const serverMap = {
        fnrye: "prod_official_asia",
        k8es8: "prod_official_usa",
        "6uy1q": "prod_official_eur",
        "4mrsw": "prod_official_cht",
      };
      return { id, server: serverMap[zone], game: "HSR" };
    },
    parse: (data, _, zone) => {
      const nameMap = {
        fnrye: "Asia",
        k8es8: "America",
        "6uy1q": "Europe",
        "4mrsw": "TW/HK/MO",
      };
      return data.code === 200
        ? { username: data.data.nickname, region: nameMap[zone] || "Unknown" }
        : { error: "invalid" };
    },
  },

  /* =============================== Delta Force =============================== */
  17820: {
    body: (id) => ({ game: "DFS", id }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: data.data.region }
        : { error: "invalid" },
  },

  /* =============================== Punishing Gray Raven =============================== */
  1023: {
    body: (id, zone) => {
      const serverMap = {
        "3qrai": "5000",
        idkg4: "5002",
        "3kwk4": "5001",
      };
      return { id, server: serverMap[zone], game: "PGR" };
    },
    parse: (data, _, zone) => {
      const nameMap = {
        "3qrai": "Asia",
        idkg4: "America",
        "3kwk4": "Europe",
      };
      return data.code === 200
        ? { username: data.data.nickname, region: nameMap[zone] || "Unknown" }
        : { error: "invalid" };
    },
  },

  /* =============================== Honor of Kings =============================== */
  911: {
    body: (id) => ({ game: "HOK", id }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: data.data.region }
        : { error: "invalid" },
  },

  /* =============================== PUBG Mobile =============================== */
  10580: {
    body: (id) => ({ game: "PUBGM", id }),
    parse: (data) =>
      data.code === 200
        ? { username: data.data.nickname, region: data.data.region }
        : { error: "invalid" },
  },
};

export default GAME_RULES;
