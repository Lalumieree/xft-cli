import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillSourceRoot = resolve(__dirname, "src", "skills", "xft-openapi-caller");
const outNpmDir = resolve(__dirname, "dist", "npm");
const outSkillDir = resolve(__dirname, "dist", "skill", "xft-openapi-caller");

function copySkillAssets(): Plugin {
  return {
    name: "copy-skill-assets",
    closeBundle() {
      rmSync(outSkillDir, { recursive: true, force: true });
      mkdirSync(outNpmDir, { recursive: true });
      mkdirSync(outSkillDir, { recursive: true });
      for (const dirName of ["agents", "best_practice"]) {
        const from = resolve(skillSourceRoot, dirName);
        if (existsSync(from)) {
          cpSync(from, resolve(outNpmDir, dirName), { recursive: true });
          cpSync(from, resolve(outSkillDir, dirName), { recursive: true });
        }
      }
      const skillMd = readFileSync(resolve(skillSourceRoot, "SKILL.md"), "utf-8");
      writeFileSync(resolve(outSkillDir, "SKILL.md"), skillMd, "utf-8");
    },
  };
}

export default defineConfig({
  ssr: {
    noExternal: ["marked", "sm-crypto"],
  },
  build: {
    outDir: outNpmDir,
    emptyOutDir: true,
    target: "node22",
    minify: false,
    ssr: true,
    rollupOptions: {
      input: {
        commands: resolve(__dirname, "src", "commands.ts"),
        "xft-cli": resolve(__dirname, "src", "index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "_shared/[name]-[hash].js",
        format: "es",
        banner: "#!/usr/bin/env node",
      },
    },
  },
  plugins: [copySkillAssets()],
});
