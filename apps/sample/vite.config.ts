import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "webview-navigation-engine": path.resolve(
        __dirname,
        "../../packages/webview-navigation-engine/src/index.ts"
      ),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    exclude: ["webview-navigation-engine"],
  },
});
