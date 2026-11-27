import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../api/config";

const VALIDATION_API = `${CONFIG.BASE_URL}/rmt/v1/validate`;

export const useGameValidationWp = (productId) => {
  const [status, setStatus] = useState({
    checking: false,
    username: null,
    region: null,
    error: null,
    isValid: false,
    unavailableVariations: [],
    regionRestrictedVariations: [],
  });

  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const validate = useCallback(
    (formData = {}) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      const entries = Object.entries(formData).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      // Check if all fields have values
      const allFilled = entries.every(([, f]) => {
        const val = f.rawValue || f.value;
        return val && val.toString().trim() !== "";
      });

      if (!allFilled) return;

      const userId = entries[0]?.[1]?.rawValue || entries[0]?.[1]?.value || "";
      const serverId =
        entries[1]?.[1]?.rawValue || entries[1]?.[1]?.value || null;

      debounceRef.current = setTimeout(async () => {
        abortControllerRef.current = new AbortController();

        setStatus({
          checking: true,
          username: null,
          region: null,
          error: null,
          isValid: false,
          unavailableVariations: [],
          regionRestrictedVariations: [],
        });

        try {
          const requestBody = {
            product_id: productId,
            user_id: userId?.trim(),
            server_id: serverId?.trim?.() || serverId || null,
          };

          const response = await fetch(VALIDATION_API, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) throw new Error("API request failed");

          const data = await response.json();

          if (!data.success) {
            setStatus({
              checking: false,
              username: null,
              region: data.user_region || null,
              error: data.error || "Validation failed",
              isValid: false,
              unavailableVariations: [],
              regionRestrictedVariations: [],
              blockedRegion: data.blocked_region || false,
            });
            return;
          }

          if (data.has_validation === false) {
            setStatus({
              checking: false,
              username: null,
              region: null,
              error: null,
              isValid: true,
              unavailableVariations: [],
              regionRestrictedVariations: [],
            });
            return;
          }

          setStatus({
            checking: false,
            username: data.username,
            region: data.region,
            error: null,
            isValid: true,
            unavailableVariations: data.unavailable_variations || [],
            regionRestrictedVariations: data.region_restricted_variations || [],
          });
        } catch (err) {
          if (err.name === "AbortError") return;

          console.error("[useGameValidationWp] Error:", err);

          setStatus({
            checking: false,
            username: null,
            region: null,
            error: "User ID / Player ID Not Found ❌",
            isValid: false,
            unavailableVariations: [],
            regionRestrictedVariations: [],
          });
        }
      }, 800);
    },
    [productId],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    ...status,
    validate,
    hasValidation: true,
  };
};

export default useGameValidationWp;
