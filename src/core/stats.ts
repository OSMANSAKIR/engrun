/* İstatistik: bölüm başarıları, tahmini puan, zayıf etiketler, seri ve joker ilerlemesi. */
import { JOKERS, type Joker, type JokerId } from "../config/jokers";
import { SEC, SECTIONS, type Section } from "../config/sections";
import { DAY, dayKey } from "../lib/time";
import type { Attempt } from "../types";
import { allAttempts } from "./attempts";
import { examSections, REAL } from "./goal";
import { Store } from "./store";

export interface SecStat {
  n: number; ok: number;
  times: number[];           // sn; deneme dışı cevaplar
  recent: boolean[];
  acc: number | null;        // tüm zamanlar
  racc: number | null;       // son 20 cevap
  rn: number;
  avgT: number | null;
}

export function secStats(atts: readonly Attempt[]): Record<Section, SecStat> {
  const m = {} as Record<Section, SecStat>;
  for (const s of SECTIONS) m[s] = { n: 0, ok: 0, times: [], recent: [], acc: null, racc: null, rn: 0, avgT: null };
  for (const a of atts) {
    const x: SecStat | undefined = m[a.section]; if (!x) continue;
    x.n++; if (a.correct) x.ok++;
    if (a.timeMs && a.mode !== "exam") x.times.push(a.timeMs / 1000);
    x.recent.push(a.correct);
  }
  for (const s of SECTIONS) {
    const x = m[s]; const r = x.recent.slice(-20);
    x.acc = x.n ? x.ok / x.n : null;
    x.racc = r.length ? r.filter(Boolean).length / r.length : null;
    x.rn = r.length;
    x.avgT = x.times.length ? x.times.reduce((p, c) => p + c, 0) / x.times.length : null;
  }
  return m;
}

export interface Prediction { score: number | null; correct?: number; missing: number }

// Tahmini puan: her bölümün son 20 cevaptaki başarısı × sınavdaki soru sayısı × 1,25.
// Verisi olmayan bölümler için bilinen bölümlerin ağırlıklı ortalaması kullanılır.
export function predicted(atts: readonly Attempt[]): Prediction {
  const st = secStats(atts);
  const secs = examSections();
  const known = secs.filter(s => st[s].racc != null);
  if (!known.length) return { score: null, missing: secs.length };
  let tot = 0, totN = 0;
  for (const s of known) { tot += st[s].racc! * st[s].rn; totN += st[s].rn; }
  const avg = tot / totN;
  let correct = 0;
  for (const s of secs) correct += (st[s].racc ?? avg) * REAL(s);
  return { score: Math.round(correct * 1.25), correct: Math.round(correct), missing: secs.length - known.length };
}

export interface WeakTag { tag: string; n: number; acc: number }

/** En zayıf k etiket (son 20 cevaba göre; en az minN cevap, %100 olanlar hariç). */
export function weakTags(atts: readonly Attempt[], k = 3, minN = 2): WeakTag[] {
  const m: Record<string, boolean[]> = {};
  for (const a of atts) for (const t of a.tags || []) (m[t] ??= []).push(a.correct);
  return Object.entries(m).map(([tag, arr]) => { const r = arr.slice(-20); return { tag, n: r.length, acc: r.filter(Boolean).length / r.length }; })
    .filter(x => x.n >= minN && x.acc < 1).sort((a, b) => a.acc - b.acc || b.n - a.n).slice(0, k);
}

/** Üst üste çalışılan gün sayısı; bugün henüz çözülmediyse dünden geriye sayar. */
export function streakDays(now = Date.now()): { n: number; today: boolean } {
  const days = new Set(Object.values(Store.attempts).map(a => dayKey(a.ts)));
  let n = 0, t = now;
  if (!days.has(dayKey(t))) t -= DAY;
  while (days.has(dayKey(t))) { n++; t -= DAY; }
  return { n, today: days.has(dayKey(now)) };
}

export interface JokerState extends Joker { have: number; unlocked: boolean }

export function jokerProgress(): JokerState[] {
  const p: Record<JokerId, number> = { conj_eye: 0, tense_master: 0, translator: 0, fast_reader: 0 };
  for (const a of allAttempts()) {
    if (!a.correct) continue;
    const tags = a.tags || [];
    if (tags.some(t => t.startsWith("conj."))) p.conj_eye++;
    if (tags.some(t => t.startsWith("grammar."))) p.tense_master++;
    if (a.section === "trans_en_tr" || a.section === "trans_tr_en") p.translator++;
    if (a.section === "reading" && a.timeMs && a.timeMs <= SEC.reading.par * 1000) p.fast_reader++;
  }
  return JOKERS.map(j => ({ ...j, have: p[j.id], unlocked: p[j.id] >= j.need }));
}

/** Gün gün tahmini puan (son 12 gün). */
export function predictedHistory(): { label: string; score: number }[] {
  const atts = allAttempts();
  const pts: { label: string; score: number }[] = [];
  const days = [...new Set(atts.map(a => dayKey(a.ts)))].sort();
  for (const d of days) {
    const end = new Date(d + "T23:59:59").getTime();
    const p = predicted(atts.filter(a => a.ts <= end));
    if (p.score != null) pts.push({ label: d.slice(8) + "." + d.slice(5, 7), score: p.score });
  }
  return pts.slice(-12);
}
