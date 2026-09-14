import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Har build paytida yangi timestamp — i18n cache bypass uchun
    __BUILD_TIME__: JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          mantine: [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
            "@mantine/form",
          ],
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          icons: [
            "@tabler/icons-react",
          ],
          i18n: [
            "i18next",
            "react-i18next",
          ],
          tauri: [
            "@tauri-apps/api",
          ],
        },
      },
    },
  },
  esbuild: {
    drop: process.env.TAURI_ENV_DEBUG ? [] : ["console", "debugger"],
    legalComments: "none",
  },
});
