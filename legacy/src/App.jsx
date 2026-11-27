// src/App.jsx

import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

// 🔥 Cache Version Manager
import { CacheVersion } from "./api/utils/cacheVersion";

// Context
import { useShop } from "./context/ShopContext";

// Components
import Footer from "./components/Footer";
import LoginPopup from "./components/LoginPopup";
import MobileNav from "./components/MobileNav";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Product from "./pages/Product";

// Checkout & Payment Pages
import OrderSummary from "./pages/OrderSummary";
import PaymentCancelled from "./pages/PaymentCancelled";

// Wallet Pages
import About from "./pages/About";
import WalletCancelled from "./pages/WalletCancelled";
import WalletOrderSummary from "./pages/WalletOrderSummary";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const HIDDEN_ROUTES = {
  navbar: [
    "/checkout",
    "/login",
    "/register",
    "/about",
    "/wallet/success",
    "/wallet/cancelled",
  ],
  mobileNav: [
    "/product",
    "/checkout",
    "/payment",
    "/login",
    "/register",
    "/wallet/success",
    "/wallet/cancelled",
  ],
  footer: [
    "/product",
    "/checkout",
    "/payment",
    "/about",
    "/wallet/success",
    "/wallet/cancelled",
    "/orders",
    "/account",
  ],
};

const App = () => {
  const { pathname } = useLocation();
  const { isLoginPopupOpen, closeLoginPopup, login } = useShop();

  // 🔥 Start cache version polling when app loads
  useEffect(() => {
    CacheVersion.startPolling();

    return () => {
      CacheVersion.stopPolling();
    };
  }, []);

  const showNavbar = !HIDDEN_ROUTES.navbar.some((path) =>
    pathname.startsWith(path),
  );

  const showMobileNav = !HIDDEN_ROUTES.mobileNav.some((path) =>
    pathname.startsWith(path),
  );

  const showFooter = !HIDDEN_ROUTES.footer.some((path) =>
    pathname.startsWith(path),
  );

  const containerClass = showMobileNav ? "pb-24 md:pb-0" : "";

  return (
    <div className={containerClass}>
      {/* Global Login Popup */}
      {isLoginPopupOpen && (
        <LoginPopup onClose={closeLoginPopup} onSuccess={login} />
      )}

      {showNavbar && <Navbar />}

      {showMobileNav && (
        <div className="block md:hidden">
          <MobileNav />
        </div>
      )}

      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/product/:slug" element={<Product />} />

        {/* ==================== PROTECTED ROUTES ==================== */}

        {/* Account/Settings */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        {/* Wallet */}
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />

        {/* Checkout Success */}
        <Route
          path="/checkout/success"
          element={
            <ProtectedRoute>
              <OrderSummary />
            </ProtectedRoute>
          }
        />

        {/* Checkout Cancelled */}
        <Route
          path="/checkout/cancelled"
          element={
            <ProtectedRoute>
              <PaymentCancelled />
            </ProtectedRoute>
          }
        />

        {/* Wallet Success */}
        <Route
          path="/wallet/success"
          element={
            <ProtectedRoute>
              <WalletOrderSummary />
            </ProtectedRoute>
          }
        />

        {/* Wallet Cancelled */}
        <Route
          path="/wallet/cancelled"
          element={
            <ProtectedRoute>
              <WalletCancelled />
            </ProtectedRoute>
          }
        />

        {/* 404 - Not Found (Optional) */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {showFooter && <Footer />}
    </div>
  );
};

export default App;
