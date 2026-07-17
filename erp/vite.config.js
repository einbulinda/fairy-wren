import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "fairy-logo-only.png", "fairy-wren-logo-removebg.png"],
      manifest: {
        name: "Fairy Wren ERP",
        short_name: "FW ERP",
        description: "Fairy Wren Point of Sale & ERP System",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "fairy-logo-only.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "fairy-logo-only.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "fairy-logo-only.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Pre-cache the full app shell (JS, CSS, HTML, fonts, images)
        // Raise limit to 4 MB to accommodate the main bundle
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Exclude the large PDF.js worker from the SW precache
        globIgnores: ["**/pdf.worker*"],
        runtimeCaching: [
          {
            // API calls: network-first, fall back to cache for up to 5 min
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "fw-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 5 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // External API (e.g. VITE_SERVER_URL on a different origin): NetworkFirst
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "fw-remote-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 5 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  server: {
    host: true,
    port: 5174,
  },
});
