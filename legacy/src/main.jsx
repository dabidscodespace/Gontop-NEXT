// src/main.jsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import { CONFIG } from "./api/config.js";
import { CacheVersion } from "./api/utils/cacheVersion.js";
import "./index.css";

// ✅ Disable browser scroll restoration
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// ✅ Scroll to top on page load/reload
window.scrollTo(0, 0);

// 🔥 Start cache version polling
CacheVersion.startPolling();

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={CONFIG.GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <ShopProvider>
        <App />
      </ShopProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);