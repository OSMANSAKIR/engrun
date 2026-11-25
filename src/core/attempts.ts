/* Cevap kayıtları: her çözülen soru bir Attempt olur; istatistik ve tekrar hep buradan beslenir. */
import type { Confidence, Letter } from "../config/sections";
import { uid } from "../lib/format";
import type { Attempt, AttemptMode, Question } from "../types";
import { POOL } from "./pool";
import { dataVersion, Store } from "./store";

// Bu sekmenin oturumu: kutu 0'daki sorular "~10 soru sonra" bu sayaca göre geri gelir.
export const SESSION = { id: uid(), count: 0 };

let cache: Attempt[] | null = null, cacheVer = -1;

/** Havuzda hâlâ bulunan sorulara ait kayıtlar, zamana göre sıralı (önbellekli). */
export function allAttempts(): Attempt[] {
  if (cacheVer === dataVersion() && cache) return cache;
  const list: Attempt[] = [];
  for (const a of Object.values(Store.attempts)) if (POOL.has(a.qid)) list.push(a);
  list.sort((a, b) => a.ts - b.ts);
  cache = list; cacheVer = dataVersion();
  return list;
}

export function recordAttempt(q: Question, chosen: Letter | null, confidence: Confidence | null, timeMs: number, mode: AttemptMode): Attempt {
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  const a: Attempt = { qid: q.id, booklet: q.booklet, section: q.section, tags: q.tags || [], chosen: chosen || null, correct: chosen === q.answer, confidence: confidence || null, timeMs: Math.round(timeMs || 0), mode, ts: Date.now() };
  Store.put("attempts", id, a);
  SESSION.count++;
  return a;
}

export function lastAttempt(qid: string): Attempt | null {
  const l = allAttempts();
  for (let i = l.length - 1; i >= 0; i--) if (l[i]!.qid === qid) return l[i]!;
  return null;
}
