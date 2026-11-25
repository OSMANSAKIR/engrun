/* Veri: manifest → kitapçıklar → soru havuzu. */
import { isLetter, isSection, LETTERS } from "../config/sections";
import type { Booklet, GenDoc, Passage, Question } from "../types";
import { bump, Store } from "./store";

export const POOL = new Map<string, Question>();      // qid → soru
export const PASSAGES = new Map<string, Passage>();   // pid → paragraf
export const BOOKLETS: Booklet[] = [];

interface ManifestEntry { id?: string; file: string; title?: string }
interface Manifest { booklets?: ManifestEntry[]; generated?: (string | ManifestEntry)[] }
interface LoadEntry extends ManifestEntry { kind: Booklet["kind"] }
interface BookletFile { id?: string; title?: string; passages?: Passage[]; questions?: unknown[] }

export async function loadData(): Promise<void> {
  let man: Manifest = { booklets: [], generated: [] };
  try { man = await fetch("data/manifest.json", { cache: "no-cache" }).then(r => r.json() as Promise<Manifest>); }
  catch (e) { console.warn("manifest okunamadı", e); }
  const entries: LoadEntry[] = [
    ...(man.booklets || []).map(b => ({ ...b, kind: "booklet" as const })),
    ...(man.generated || []).map(g => typeof g === "string" ? { file: g, kind: "generated" as const } : { ...g, kind: "generated" as const })
  ];
  const res = await Promise.allSettled(entries.map(e => fetch(e.file, { cache: "no-cache" }).then(r => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<unknown>;
  })));
  res.forEach((r, i) => {
    const entry = entries[i]!;
    if (r.status === "fulfilled") addBooklet(r.value, entry); else console.warn("Kitapçık yüklenemedi:", entry.file);
  });
  for (const g of Object.values(Store.gen)) addGenerated(g);
  bump();
}

/** Eksik ya da bozuk soru havuza girmez: 5 dolu şık, geçerli bölüm ve cevap şart. */
export function validQ(q: unknown): q is Question {
  if (!q || typeof q !== "object") return false;
  const x = q as Partial<Question> & { missing?: boolean };
  return !x.missing && !!x.id && isSection(x.section) && !!x.options
    && LETTERS.every(L => String(x.options?.[L] ?? "").trim()) && isLetter(x.answer);
}

export function addBooklet(raw: unknown, entry: LoadEntry): void {
  const d: BookletFile = Array.isArray(raw) ? { questions: raw } : (raw as BookletFile) || {};
  const bid = d.id || entry.id || entry.file;
  const b: Booklet = { id: bid, title: entry.title || d.title || bid, kind: entry.kind, count: 0 };
  for (const p of d.passages || []) PASSAGES.set(p.id, { ...p, booklet: bid });
  for (const q of d.questions || []) {
    if (!validQ(q)) continue;
    const qq: Question = { ...q, booklet: q.booklet || bid, origin: entry.kind };
    if (qq.passage && !PASSAGES.has(qq.passage)) qq.passage = null;
    POOL.set(q.id, qq); b.count++;
  }
  if (b.count) BOOKLETS.push(b);
}

export function addGenerated(g: Pick<GenDoc, "q" | "passage"> | null | undefined): void {
  if (!g || !g.q || !validQ(g.q)) return;
  if (g.passage) PASSAGES.set(g.passage.id, g.passage);
  POOL.set(g.q.id, { ...g.q, booklet: "claude", origin: "claude" });
}

/** Soru havuzda yoksa undefined. */
export const findQ = (id: string): Question | undefined => POOL.get(id);

/** Havuzda olduğu bilinen soru (deneme listesi, paragraf soruları...). */
export function Q(id: string): Question {
  const q = POOL.get(id);
  if (!q) throw new Error("Soru bulunamadı: " + id);
  return q;
}

/** Bir paragrafa bağlı soruların kimlikleri, numara sırasıyla. */
export function passageQids(pid: string): string[] {
  return [...POOL.values()].filter(q => q.passage === pid).sort((a, b) => (a.n || 0) - (b.n || 0)).map(q => q.id);
}
