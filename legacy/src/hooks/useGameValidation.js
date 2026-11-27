// src/hooks/useGameValidation.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateGameAccount } from "../api/gameInputs";

// Matchers so the hook knows which field is userId/serverId
const FIELD_MATCHERS = {
  userId: ["user id", "player id", "uid", "game id", "id", "account id", "user"],
  serverId: ["zone id", "server id", "server", "zone", "region id"],
};

const findFieldByLabel = (fields, type) => {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return null;
  const matchers = FIELD_MATCHERS[type] || [];
  for (const f of fields) {
    const label = (f.label || "").toLowerCase();
    if (matchers.find((m) => label.includes(m))) return f.id;
  }
  if (type === "userId") return fields[0]?.id || null;
  if (type === "serverId" && fields.length > 1) return fields[1]?.id || null;
  return null;
};

export const useGameValidation = (productId, fields = []) => {
  const [state, setState] = useState({
    checking: false,
    username: null,
    region: null,
    error: null,
    isValid: false,
    blockedRegion: false,
    unavailableVariations: [],
    data: null,
    hasValidation: false,
  });

  const debounceRef = useRef(null);
  const userIdField = findFieldByLabel(fields, "userId");
  const serverIdField = findFieldByLabel(fields, "serverId");

  // FIX: Memoize fieldMapping so reference is stable
  const fieldMapping = useMemo(
    () => ({ userId: userIdField, serverId: serverIdField }),
    [userIdField, serverIdField]
  );

  const validate = useCallback(
    (formData) => {
      if (!productId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      setState((s) => ({ ...s, checking: true, error: null }));

      debounceRef.current = setTimeout(async () => {
        try {
          const getVal = (id) => {
            if (!id || !formData[id]) return "";
            const v = formData[id];
            if (typeof v === "string") return v.trim();
            if (typeof v === "object" && v.value) return v.value.trim();
            return "";
          };

          const userId = getVal(fieldMapping.userId);
          const zoneId = getVal(fieldMapping.serverId);
          if (!userId) return;

          const data = await validateGameAccount(productId, userId, zoneId);

          if (!data.has_validation) {
            setState({
              checking: false,
              isValid: true,
              username: null,
              region: null,
              hasValidation: false,
            });
            return;
          }

          if (!data.is_valid) {
            setState({
              checking: false,
              isValid: false,
              error: data.error || "Validation failed",
              username: null,
              region: data.region,
              blockedRegion: data.blocked_region || false,
              hasValidation: true,
            });
            return;
          }

          setState({
            checking: false,
            isValid: true,
            error: null,
            username: data.username,
            region: data.region,
            blockedRegion: false,
            unavailableVariations: data.unavailable_variations || [],
            data: data.data,
            hasValidation: true,
          });
        } catch (err) {
          console.error("[useGameValidation] Error:", err);
          setState({
            checking: false,
            isValid: false,
            error: "Validation failed. Please try again.",
          });
        }
      }, 600);
    },
    [productId, fieldMapping]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { ...state, validate, fieldMapping };
};

export default useGameValidation;