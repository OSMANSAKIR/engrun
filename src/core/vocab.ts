/* Kelime kartları: işaretlenen kelimeler + sorulardaki kelime notları; 4 şıklı Türkçe karşılık seçimi. */
import { safeId } from "../lib/format";
import { shuffle } from "../lib/random";
import { POOL } from "./pool";
import { Store } from "./store";

export interface VocabWord { key: string; en: string; tr: string; qids: string[]; mine?: boolean; ctx?: string; word?: string }

let idx: Map<string, VocabWord> | null = null, idxRev = -1, idxPool = -1;

/** Kart dizini; işaretli kelimeler ya da soru havuzu değişince yeniden kurulur. */
export function vocabIndex(): Map<string, VocabWord> {
  if (idx && idxRev === Store.wordsRev && idxPool === POOL.size) return idx;
  const m = new Map<string, VocabWord>();
  for (const d of Object.values(Store.words)) {   // senin işaretlediklerin
    if (!d.tr || !(d.qids || []).length) continue;
    const en = d.en || d.word; const key = safeId(en);
    if (!m.has(key)) m.set(key, { key, en, tr: d.tr, qids: d.qids.slice(), mine: true, ctx: d.ctx, word: d.word });
  }
  for (const q of POOL.values()) for (const v of q.vocab || []) {
    if (!v || !v.en || !v.tr) continue;
    const key = safeId(v.en);
    let w = m.get(key);
    if (!w) { w = { key, en: v.en, tr: v.tr, qids: [] }; m.set(key, w); }
    w.qids.push(q.id);
  }
  idxRev = Store.wordsRev; idxPool = POOL.size;
  return (idx = m);
}

export const vocabSrsKey = (key: string): string => "v:" + key;

export function vocabDeckInfo(now = Date.now()): { due: number; fresh: number; total: number; mine: number } {
  const words = vocabIndex();
  let due = 0, fresh = 0, mine = 0;
  for (const w of words.values()) {
    if (w.mine) mine++;
    const e = Store.srs[vocabSrsKey(w.key)];
    if (e) { if (e.box < 4 && now >= (e.due || 0)) due++; } else fresh++;
  }
  return { due, fresh: Math.min(fresh, 20), total: words.size, mine };
}

// Çeldiriciler: diğer kelimelerin Türkçe karşılıkları. Fiile fiil ("-mak/-mek"), diğerine diğer;
// uzunluğu yakın olanlar ve doğru cevapla kelime paylaşmayanlar seçilir.
const TR_STOP = new Set(["etmek", "olmak", "yapmak", "olan", "olarak", "için", "gibi", "kılmak", "edilmek", "bulunmak", "vermek", "getirmek", "haline", "şekilde", "biçimde"]);
const trFirst = (t: string) => String(t).split(/[,;/(]/)[0]!.trim().toLowerCase();
export const trKind = (t: string): "v" | "o" => /m[ae]k$/.test(trFirst(t)) ? "v" : "o";
const trToks = (t: string) => String(t).toLowerCase().split(/[^\p{L}]+/u).filter(x => x.length > 3 && !TR_STOP.has(x));

export interface Choice { tr: string; ok: boolean }

export function vocabChoices(w: VocabWord, pool: Iterable<VocabWord> = vocabIndex().values()): Choice[] {
  const kind = trKind(w.tr); const own = new Set(trToks(w.tr));
  const cand = shuffle([...pool].filter(x => x.key !== w.key && x.tr && x.en.toLowerCase() !== w.en.toLowerCase() && !trToks(x.tr).some(t => own.has(t))));
  const same = cand.filter(x => trKind(x.tr) === kind).slice(0, 30).sort((a, b) => Math.abs(a.tr.length - w.tr.length) - Math.abs(b.tr.length - w.tr.length));
  const picked: string[] = []; const seen = new Set([w.tr.toLowerCase()]);
  for (const x of [...same, ...cand]) { const k = x.tr.toLowerCase(); if (seen.has(k)) continue; seen.add(k); picked.push(x.tr); if (picked.length === 3) break; }
  return shuffle([{ tr: w.tr, ok: true }, ...picked.map(tr => ({ tr, ok: false }))]);
}
