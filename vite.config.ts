import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/knowledge-storage/",
  plugins: [react(), yaml(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
