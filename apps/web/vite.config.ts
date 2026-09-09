import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "KUTANA POS",
        short_name: "KUTANA",
        // Full role-named token palette lands in PR5. Manifest colors here
        // are the raw brand colors, not design-system tokens.
        theme_color: "#1D3124",
        background_color: "#F5F0E1",
        display: "standalone",
        icons: [],
      },
    }),
  ],
});
