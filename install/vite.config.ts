import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "dist");

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    target: "node22",
    minify: false,
    ssr: true,
    rollupOptions: {
      input: {
        "xft-skill-install": resolve(__dirname, "src", "index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "_shared/[name]-[hash].js",
        format: "es",
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
