/// <reference types="vitest/config" />
import { cpSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// Sorular ve sözlük çalışma anında fetch ile okunur, yani Vite'ın modül grafiğinde değiller.
// Bu eklenti manifest'te listelenen dosyaları ve lisansları derlemeye olduğu gibi kopyalar.
// data/private/ hiçbir zaman kopyalanmaz: manifest'te yer almaz.
function copyRuntimeFiles(): Plugin {
  let outDir = "dist";
  return {
    name: "engrun:copy-runtime-files",
    apply: "build",
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    writeBundle() {
      const man = JSON.parse(readFileSync("data/manifest.json", "utf8")) as { booklets?: { file: string }[]; generated?: (string | { file: string })[] };
      const files = [
        "LICENSE", "data/manifest.json", "data/dict.json", "data/LICENSE.md",
        ...(man.booklets ?? []).map(b => b.file),
        ...(man.generated ?? []).map(g => typeof g === "string" ? g : g.file),
        ...readdirSync("fonts").filter(f => f.startsWith("OFL")).map(f => "fonts/" + f)
      ];
      for (const f of files) {
        if (f.includes("private/")) throw new Error("Kişisel dosya yayına giremez: " + f);
        mkdirSync(dirname(join(outDir, f)), { recursive: true });
        cpSync(f, join(outDir, f));
      }
    }
  };
}

export default defineConfig({
  base: "./",                       // GitHub Pages alt klasörü, claude.ai ve yerel kopya için göreli yollar
  plugins: [copyRuntimeFiles()],
  build: { target: "es2022", modulePreload: { polyfill: false } },
  server: { port: 5173, watch: { ignored: ["**/work/**", "**/data/private/**"] } },
  optimizeDeps: { entries: ["index.html"] },
  test: { include: ["tests/**/*.test.ts"], environment: "node" }
});
