// context/ShopContext.jsx

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { authEvents } from "../api/axios";
import { Storage } from "../api/utils/storage";
import { logoutUser as logoutService } from "../api/services/auth";

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ═══════════════════════════════════════════════════════════
  // AUTH STATE
  // ═══════════════════════════════════════════════════════════

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ═══════════════════════════════════════════════════════════
  // LOGIN POPUP STATE
  // ═══════════════════════════════════════════════════════════

  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  const openLoginPopup = useCallback(() => {
    if (!isAuthenticated) {
      setIsLoginPopupOpen(true);
    }
  }, [isAuthenticated]);

  const closeLoginPopup = useCallback(() => {
    setIsLoginPopupOpen(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // AUTO SHOW LOGIN POPUP ON ROUTE CHANGE
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const timer = setTimeout(() => {
        setIsLoginPopupOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isAuthenticated, loading]);

  // ═══════════════════════════════════════════════════════════
  // AUTH FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const login = useCallback((userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setIsLoginPopupOpen(false);
    toast.success(`Welcome, ${userData.display_name || userData.email}!`);
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setIsAuthenticated(false);
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/");
  }, [navigate]);

  const forceLogout = useCallback(() => {
    logoutService();
    setIsAuthenticated(false);
    setUser(null);
    toast.error("Session expired. Please login again.");
  }, []);

  const updateUser = useCallback((updatedData) => {
    const newUserData = { ...user, ...updatedData };
    Storage.setCustomer(newUserData);
    setUser(newUserData);
  }, [user]);

  // ═══════════════════════════════════════════════════════════
  // INITIALIZE ON LOAD
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const initAuth = () => {
      try {
        const token = Storage.getToken();
        const userData = Storage.getCustomer();

        if (token && userData?.email) {
          setIsAuthenticated(true);
          setUser(userData);
        }
      } catch (error) {
        console.error("Error restoring auth:", error);
        Storage.clear();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // REGISTER AUTH EVENT HANDLER
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    authEvents.onUnauthorized = forceLogout;
    return () => {
      authEvents.onUnauthorized = null;
    };
  }, [forceLogout]);

  // ═══════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════

  const value = {
    // Auth
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    forceLogout,
    updateUser,
    navigate,
    // Login Popup
    isLoginPopupOpen,
    openLoginPopup,
    closeLoginPopup,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return context;
};