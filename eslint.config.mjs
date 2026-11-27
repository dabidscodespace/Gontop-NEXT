import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Images are admin-provided URLs served from the app or external hosts.
      // Rendering them directly avoids routing every image through the Next
      // optimizer on a small VPS.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "legacy/**", "db/migrations/**"]),
]);
