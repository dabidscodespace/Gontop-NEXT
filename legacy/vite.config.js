import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const PROXY_TARGET = "https://dash.gontop.app";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/wp-json": {
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },

    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
});
