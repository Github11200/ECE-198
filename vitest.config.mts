import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: { alias: [
    { find: /^react(\/.*)?$/, replacement: resolve("frontend/node_modules/react") + "$1" },
    { find: /^react-dom(\/.*)?$/, replacement: resolve("frontend/node_modules/react-dom") + "$1" },
    { find: /^convex\/(.*)$/, replacement: resolve("node_modules/convex/dist/esm") + "/$1/index.js" },
    { find: "@", replacement: resolve("frontend/src") },
  ] },
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node", env: { TZ: "America/Toronto" } },
});
