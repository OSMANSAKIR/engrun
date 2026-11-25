// Yayındaki soru dosyaları uygulamanın beklediği biçimde mi? (Python'daki tools/validate.py daha ayrıntılı denetler.)
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TAG_TR } from "../src/config/tags";
import { addBooklet, POOL, validQ } from "../src/core/pool";

interface Manifest { booklets: { id: string; file: string; title: string }[]; generated: { file: string; title: string }[] }
const man = JSON.parse(readFileSync("data/manifest.json", "utf8")) as Manifest;
const files = [...man.booklets.map(b => b.file), ...man.generated.map(g => g.file)];
const read = (f: string) => JSON.parse(readFileSync(f, "utf8")) as { passages?: { id: string }[]; questions: { id: string; passage?: string | null; tags?: string[] }[] };

describe("yayındaki veri", () => {
  it("manifest kişisel klasöre işaret etmiyor", () => {
    for (const f of files) expect(f).not.toContain("private");
  });

  it.each(files)("%s: her soru geçerli, etiketler tanımlı, paragraflar mevcut", f => {
    const d = read(f);
    const pids = new Set((d.passages || []).map(p => p.id));
    expect(d.questions.length).toBeGreaterThan(0);
    for (const q of d.questions) {
      expect(validQ(q), q.id).toBe(true);
      for (const t of q.tags || []) expect(TAG_TR[t], `${q.id}: ${t}`).toBeDefined();
      if (q.passage) expect(pids.has(q.passage), `${q.id}: ${q.passage}`).toBe(true);
    }
  });

  it("soru kimlikleri bütün dosyalarda benzersiz", () => {
    POOL.clear();
    let total = 0;
    for (const f of files) { const d = read(f); total += d.questions.length; addBooklet(d, { file: f, kind: "booklet" }); }
    expect(POOL.size).toBe(total);
  });
});
