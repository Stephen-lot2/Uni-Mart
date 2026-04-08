import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "robots.txt"],
      manifest: {
        name: "CampusMart - Campus Marketplace",
        short_name: "CampusMart",
        description: "Campus Marketplace for students to buy and sell",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/favicon.png", sizes: "192x192", type: "image/png" },
          { src: "/favicon.png", sizes: "512x512", type: "image/png" },
          { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Pre-cache all built assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
        // Don't let the SW cache bust on every deploy for large chunks
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          // Supabase REST API — stale-while-revalidate so UI shows instantly
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-rest",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase auth — always network first
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-auth", networkTimeoutSeconds: 5 },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Images (base64 data URLs are inline, external images cached)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    // Inline small assets directly into JS to save round trips
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Fine-grained chunk splitting — each chunk cached independently
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
            if (id.includes("@tanstack/react-query")) return "query-vendor";
            if (id.includes("framer-motion")) return "framer";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  // Pre-bundle deps so first dev load is instant
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "framer-motion",
      "lucide-react",
      "zustand",
      "sonner",
    ],
  },
}));
