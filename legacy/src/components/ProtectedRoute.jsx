// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useShop } from "../context/ShopContext";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading, openLoginPopup } = useShop();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Open login popup and redirect to home
    openLoginPopup();
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;