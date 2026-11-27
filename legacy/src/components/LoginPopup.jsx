import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { X } from "lucide-react";
import { loginWithGoogle } from "../api/services/auth";
import { useShop } from "../context/ShopContext";
import { useLocation } from "react-router-dom";

const LoginPopup = () => {
  const { isAuthenticated, login, isLoginPopupOpen, closeLoginPopup } = useShop();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const shouldShowPopup =
    !isAuthenticated && isLoginPopupOpen && !isHomePage;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // If user is on homepage, make sure popup is closed
  useEffect(() => {
    if (isHomePage && isLoginPopupOpen) {
      closeLoginPopup();
    }
  }, [isHomePage, isLoginPopupOpen, closeLoginPopup]);

  // block background scroll only when popup is actually shown
  useEffect(() => {
    document.body.style.overflow = shouldShowPopup ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [shouldShowPopup]);

  // enter animation timing
  useEffect(() => {
    if (shouldShowPopup) {
      const show = setTimeout(() => setVisible(true), 20);
      const slide = setTimeout(() => setMounted(true), 40);

      return () => {
        clearTimeout(show);
        clearTimeout(slide);
      };
    } else {
      setVisible(false);
      setMounted(false);
    }
  }, [shouldShowPopup]);

  const handleClose = () => {
    setMounted(false);
    setVisible(false);
    setTimeout(() => {
      closeLoginPopup();
    }, 250);
  };

  const handleSuccess = async (cred) => {
    setLoading(true);
    setError("");

    try {
      const data = await loginWithGoogle(cred.credential);
      login(data);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShowPopup) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm transition-all duration-300 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        className={`fixed z-[999]
          bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100
          w-[340px] md:w-[380px] transition-all duration-300 ease-out
          md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          left-1/2 -translate-x-1/2 bottom-0 md:bottom-auto
          ${mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
        `}
      >
        <div className="p-6 relative">
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>

          {/* Title */}
          <h2 className="text-lg font-semibold mb-1 text-center">
            Sign in to <span className="text-orange-500">GONTOP</span>
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Sign in to manage orders and get bonuses
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-md text-center mb-4">
              {error}
            </div>
          )}

          {/* Google Login */}
          <div className="flex justify-center">
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                <span className="text-gray-500 text-sm">Signing in...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError("Sign-in failed")}
                theme="outline"
                shape="pill"
                text="signin_with"
                size="large"
                width="300"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPopup;