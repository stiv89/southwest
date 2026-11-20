import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { simulationApiPlugin } from "./vite-plugin-simulation.mjs";

export default defineConfig({
  plugins: [react(), simulationApiPlugin()],
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ["**/*.{jpg,jpeg,png,gif,webp}"],
    },
  },
  preview: {
    host: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
  },
});
