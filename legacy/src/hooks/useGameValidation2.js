import md5 from "md5";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_RULES } from "../utils/gameRules";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const RMT_API = isLocalhost
  ? "/api/gamecheck"
  : "https://dash.rmtgameshop.com/game/checkid";

const getJakartaDateToken = () => {
  const now = new Date();
  const jakartaOffset = 7 * 60;
  const localTime = now.getTime();
  const localOffset = now.getTimezoneOffset() * 60000;
  const jakartaTime = new Date(localTime + localOffset + jakartaOffset * 60000);
  const yyyy = jakartaTime.getFullYear();
  const mm = String(jakartaTime.getMonth() + 1).padStart(2, "0");
  const dd = String(jakartaTime.getDate()).padStart(2, "0");
  return md5(`${yyyy}-${mm}-${dd}RMT`);
};

// Region code to full name mapping
const REGION_NAMES = {
  bd: "Bangladesh",
  id: "Indonesia",
  ph: "Philippines",
  my: "Malaysia",
  sg: "Singapore",
  br: "Brazil",
  vn: "Vietnam",
  th: "Thailand",
  tw: "Taiwan",
  hk: "Hong Kong",
  mo: "Macau",
  in: "India",
  jp: "Japan",
  kr: "Korea",
  us: "United States",
  eu: "Europe",
  ru: "Russia",
  au: "Australia",
  mm: "Myanmar",
  kh: "Cambodia",
  la: "Laos",
  np: "Nepal",
  pk: "Pakistan",
  lk: "Sri Lanka",
  cn: "China",
  global: "Global",
};

const getRegionName = (code) => {
  if (!code) return "Unknown";
  const normalized = String(code).toLowerCase().trim();
  return REGION_NAMES[normalized] || code.toUpperCase();
};

const PRODUCT_REGIONS = {
  160: "Bangladesh",
  11363: "Indonesia",
  1249: "Philippines",
  982: "Malaysia/Singapore",
};

export const useGameValidation2 = (productId) => {
  const [status, setStatus] = useState({
    checking: false,
    username: null,
    region: null,
    error: null,
    isValid: false,
    unavailableVariations: [],
  });

  const debounceRef = useRef(null);

  const validate = useCallback(
    (formData = {}) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const rule = GAME_RULES[String(productId)];
      if (!rule) return;

      const entries = Object.entries(formData).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      const values = entries.map(([, f]) => f.value?.trim());

      if (values.some((v) => !v)) return;

      const rawId = values[0] || "";
      const zone = values[1] || null;

      debounceRef.current = setTimeout(async () => {
        setStatus({
          checking: true,
          username: null,
          region: null,
          error: null,
          isValid: false,
          unavailableVariations: [],
        });

        try {
          const bodyPayload = rule.body(...values);

          const response = await fetch(RMT_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Token": getJakartaDateToken(),
            },
            body: JSON.stringify(bodyPayload),
          });

          if (!response.ok) throw new Error("API request failed");
          const data = await response.json();

          const variationId = formData.variation_id?.value;
          const parsed = rule.parse(data, variationId, zone, rawId);

          if (parsed.error === "blockedRegion") {
            const userRegion = getRegionName(parsed.region);
            const productRegion = PRODUCT_REGIONS[productId] || "this region";

            setStatus({
              checking: false,
              username: null,
              region: parsed.region,
              error: `Your account is from ${userRegion}. This product is for ${productRegion} only.`,
              isValid: false,
              unavailableVariations: [],
            });
            return;
          }

          if (parsed.error) {
            setStatus({
              checking: false,
              username: null,
              region: null,
              error: "Player ID input is invalid ❌",
              isValid: false,
              unavailableVariations: [],
            });
            return;
          }

          setStatus({
            checking: false,
            username: parsed.username,
            region: parsed.region,
            error: null,
            isValid: true,
            unavailableVariations: parsed.unavailableVariations || [],
          });
        } catch (err) {
          setStatus({
            checking: false,
            username: null,
            region: null,
            error: "User ID / Player ID Not Found ❌",
            isValid: false,
            unavailableVariations: [],
          });
        }
      }, 800);
    },
    [productId],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const { checking, username, region, error, isValid, unavailableVariations } =
    status;
  const hasValidation = Boolean(GAME_RULES[String(productId)]);

  return {
    checking,
    username,
    region,
    error,
    isValid,
    validate,
    hasValidation,
    unavailableVariations,
  };
};

export default useGameValidation2;