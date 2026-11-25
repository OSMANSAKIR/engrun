/* Kelime işleme ve anlam bulma: önce sorunun kendi kelime notu, sonra sitenin sözlüğü, sonra diğer soruların notları. */
import type { Question, VocabNote } from "../types";
import { POOL } from "./pool";

export const WORD_RE = /\p{L}[\p{L}'’-]*\p{L}|\p{L}/gu;
/** Türkçe karakter yoksa İngilizce sayılır (çeviri sorularındaki Türkçe metinler işaretlenmez). */
export const isEn = (t: string): boolean => !/[çğıöşüÇĞİÖŞÜ]/.test(t);
export const wordKey = (w: string): string => w.toLowerCase().replace(/’/g, "'").replace(/'s$/, "").replace(/^-+|-+$/g, "");

/** "to curtail (sth)" → "curtail"; tek kelime değilse null. */
export const normEn = (s: string): string | null => {
  const e = String(s).toLowerCase().replace(/\(.*?\)/g, "").trim().replace(/^to /, "");
  return /^[a-z][a-z'-]*$/.test(e) ? e : null;
};

/** Basit kök adayları: studies → study, stopped → stop, making → make ... */
export function lemmaCands(k: string): string[] {
  const c = [k]; const add = (x: string) => { if (x.length > 2 && !c.includes(x)) c.push(x); };
  if (k.endsWith("ies")) add(k.slice(0, -3) + "y");
  if (k.endsWith("es")) add(k.slice(0, -2));
  if (k.endsWith("s") && !k.endsWith("ss")) add(k.slice(0, -1));
  if (k.endsWith("ied")) add(k.slice(0, -3) + "y");
  if (k.endsWith("ed")) { add(k.slice(0, -2)); add(k.slice(0, -1)); if (/(.)\1ed$/.test(k)) add(k.slice(0, -3)); }
  if (k.endsWith("ing")) { add(k.slice(0, -3)); add(k.slice(0, -3) + "e"); if (/(.)\1ing$/.test(k)) add(k.slice(0, -4)); }
  if (k.endsWith("ily")) add(k.slice(0, -3) + "y");
  if (k.endsWith("ly")) add(k.slice(0, -2));
  return c;
}

// Sorulardaki kelime notlarından küçük bir sözlük (ilk karşılaşılan anlam).
let notes: Map<string, VocabNote> | null = null;
function noteDict(): Map<string, VocabNote> {
  if (notes) return notes;
  const m = new Map<string, VocabNote>();
  for (const q of POOL.values()) for (const v of q.vocab || []) {
    if (!v || !v.en || !v.tr) continue;
    for (const part of String(v.en).split("/")) { const e = normEn(part); if (e && !m.has(e)) m.set(e, { en: v.en, tr: v.tr }); }
  }
  return (notes = m);
}

// Sitenin kendi sözlüğü (data/dict.json): sorulardaki her kelime biçimi → sözlük biçimi → Türkçe anlam.
export interface Dict { lemmas: Record<string, string>; forms?: Record<string, string> }
let DICT: Dict | null = null, dictP: Promise<Dict | null> | null = null;

export function loadDict(): Promise<Dict | null> {
  return dictP ??= fetch("data/dict.json").then(r => r.ok ? r.json() as Promise<Partial<Dict>> : null)
    .then(d => (DICT = d && d.lemmas ? d as Dict : null)).catch(() => null);
}

export function dictLookup(key: string, dict: Dict | null = DICT): VocabNote | null {
  if (!dict) return null;
  for (const c of lemmaCands(key)) {
    const l = dict.forms?.[c] || (dict.lemmas[c] ? c : null);
    const tr = l ? dict.lemmas[l] : undefined;
    if (l && tr) return { en: l, tr };
  }
  return null;
}

export function localMeaning(key: string, q?: Question): VocabNote | null {
  const cands = lemmaCands(key);
  for (const v of q?.vocab || []) { const e = v && normEn(v.en || ""); if (e && cands.includes(e)) return { en: v.en, tr: v.tr }; }
  const d = dictLookup(key); if (d) return d;
  for (const c of cands) { const n = noteDict().get(c); if (n) return n; }
  return null;
}
