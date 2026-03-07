import { defineConfig } from "vite";
import googleAppsScript from "rollup-plugin-google-apps-script";

export default defineConfig({
  plugins: [googleAppsScript()],
  build: {
    rollupOptions: {
      input: "src/main.ts",
      output: {
        dir: "dist",
        entryFileNames: "code.js",
      },
    },
  },
});
