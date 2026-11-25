/* Soru seçimi: paragraflı sorular birlikte (birim) seçilir; önce hiç çözülmemişler, sonra yanlışlar, sonra doğrular. */
import type { ExamKind } from "../config/exams";
import { YDS_REAL } from "../config/exams";
import { SECTIONS, type Section } from "../config/sections";
import { shuffle } from "../lib/random";
import type { Question } from "../types";
import { lastAttempt } from "./attempts";
import { EXAM_DIST, examType, G } from "./goal";
import { PASSAGES, POOL, Q } from "./pool";
import { gateTarget } from "./scoring";

export interface Unit { qids: string[]; p?: string; rank: number }

/** 0: hiç çözülmedi, 1: son cevap yanlış, 2: son cevap doğru. */
export function rankOf(qid: string): number {
  const la = lastAttempt(qid);
  if (!la) return 0;
  return la.correct ? 2 : 1;
}

export function buildUnits(qs: readonly Question[]): Unit[] {
  const units: Unit[] = []; const byP = new Map<string, Unit>();
  for (const q of qs) {
    if (q.passage) {
      let u = byP.get(q.passage);
      if (!u) { u = { qids: [], p: q.passage, rank: 0 }; byP.set(q.passage, u); units.push(u); }
      u.qids.push(q.id);
    } else units.push({ qids: [q.id], rank: 0 });
  }
  for (const u of units) { u.qids.sort((a, b) => (Q(a).n || 0) - (Q(b).n || 0)); u.rank = Math.min(...u.qids.map(rankOf)); }
  // YÖKDİL'de seçilen alanın (fen/sağlık/sosyal) paragrafları, aynı öncelik grubunda öne alınır.
  const g = G(); const f = g && g.exam === "yokdil" ? g.field : null;
  const mine = (u: Unit) => !!f && ((u.p && PASSAGES.get(u.p)?.field) || Q(u.qids[0]!).field) === f;
  return [0, 1, 2].flatMap(r => { const l = shuffle(units.filter(u => u.rank === r)); return f ? [...l.filter(mine), ...l.filter(u => !mine(u))] : l; });
}

/** Birimlerden en az n soru (birim bölünmez); en fazla maxUnits birim. */
export function takeUnits(units: readonly Unit[], n: number, maxUnits = 99): string[] {
  const out: string[] = []; let used = 0;
  for (const u of units) { if (out.length >= n || used >= maxUnits) break; out.push(...u.qids); used++; }
  return out;
}

export interface Gate { section: Section; qids: string[]; i: number; target: number; score: number; correct: number; total: number }

/** Koşu kapısı: okuma 2 paragraf (≥4 soru), cloze 1 paragraf (≤6 soru), diğerleri 5 soru. Claude üretimleri girmez. */
export function buildGate(section: Section): Gate {
  const qs = [...POOL.values()].filter(q => q.section === section && !String(q.id).startsWith("gen-"));
  const units = buildUnits(qs);
  let qids: string[];
  if (section === "reading") qids = takeUnits(units, 4, 2);
  else if (section === "cloze") qids = takeUnits(units, 4, 1).slice(0, 6);
  else qids = takeUnits(units, 5);
  return { section, qids, i: 0, target: gateTarget(section, qids.length), score: 0, correct: 0, total: 0 };
}

/** Deneme soruları: bölüm dağılımına göre; tam YDS denemesinde tek kitapçık seçildiyse kitapçık sırası korunur. */
export function pickExamQuestions(kind: ExamKind, src: string | null): { qids: string[]; want: number } {
  const dist = EXAM_DIST[kind];
  const want = Object.values(dist).reduce((a, b) => a + b, 0);
  let pool = [...POOL.values()].filter(q => q.origin !== "claude");
  if (src && src.startsWith("b:")) {
    pool = pool.filter(q => q.booklet === src.slice(2));
    if (kind === "full" && pool.length >= 80 && examType().real === YDS_REAL)
      return { qids: pool.sort((a, b) => (a.n || 0) - (b.n || 0)).map(q => q.id), want };
  }
  const qids: string[] = [];
  for (const s of SECTIONS) {
    const need = dist[s]; if (!need) continue;
    const got: string[] = [];
    for (const u of buildUnits(pool.filter(q => q.section === s))) { if (got.length >= need) break; got.push(...u.qids.slice(0, need - got.length)); }
    qids.push(...got);
  }
  return { qids, want };
}
