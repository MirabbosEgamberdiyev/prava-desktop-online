import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // ⚡ Kichikroq bundle, tezroq parse, kamroq RAM
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core alohida chunk — barcha sahifalar uchun bir marta yuklanadi
          "react-vendor": ["react", "react-dom"],
          // i18n alohida — kichik va kamdan-kam o'zgaradi
          "i18n": ["i18next", "react-i18next"],
          // Tabler icons alohida — bir marta yuklanadi
          "icons":  ["@tabler/icons-react"],
          // Tauri API alohida
          "tauri":  ["@tauri-apps/api", "@tauri-apps/plugin-opener", "@tauri-apps/plugin-shell"],
        },
      },
    },
  },
  esbuild: {
    // Production build'da console.log va debugger'lar olib tashlanadi
    drop: process.env.TAURI_ENV_DEBUG ? [] : ["console", "debugger"],
    legalComments: "none",
  },
}));
