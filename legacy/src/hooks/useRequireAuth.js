// src/hooks/useRequireAuth.js

import { useEffect } from "react";
import { useShop } from "../context/ShopContext";

export const useRequireAuth = (redirectTo = "/") => {
  const { isAuthenticated, loading, navigate, openLoginPopup } = useShop();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      openLoginPopup();
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, openLoginPopup, redirectTo]);

  return { isAuthenticated, loading };
};