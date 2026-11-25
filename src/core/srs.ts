/* Aralıklı tekrar (Leitner): yanlış → kutu 0 (aynı oturumda ~10 soru sonra), sonra 1, 3, 6 gün; kutu 4 = öğrenildi.
   "Eminim" deyip yanılınan sorular kırmızıdır ve destede önce gelir (hiperdüzeltme etkisi). */
import type { Confidence } from "../config/sections";
import { DAY, startOfDay } from "../lib/time";
import type { Question, SrsQuestion } from "../types";
import { SESSION } from "./attempts";
import { POOL } from "./pool";
import { Store } from "./store";

export const BOX_DAYS = [0, 1, 3, 6];
const VOCAB_PREFIX = "v:";        // kelime kartları aynı koleksiyonda "v:<kelime>" anahtarıyla durur

export const srsGet = (qid: string): SrsQuestion | null => (Store.srs[qid] as SrsQuestion | undefined) || null;

export function srsIsDue(e: SrsQuestion | null, now = Date.now()): boolean {
  if (!e || e.box >= 4) return false;
  if (e.box === 0) return e.sess !== SESSION.id || SESSION.count >= (e.reAfter || 0);
  return now >= (e.due || 0);
}

export function srsAfterAnswer(q: Question, correct: boolean, confidence: Confidence | null): void {
  const now = Date.now(), cur = srsGet(q.id);
  let e: SrsQuestion;
  if (!correct) e = { ...(cur || {}), kind: "q", qid: q.id, box: 0, due: now, reAfter: SESSION.count + 10, sess: SESSION.id, red: !!cur?.red || confidence === "sure", wrong: (cur?.wrong || 0) + 1, last: now };
  else if (confidence === "guess") e = { ...(cur || {}), kind: "q", qid: q.id, box: 0, due: now, reAfter: SESSION.count + 10, sess: SESSION.id, red: !!cur?.red, last: now };
  else if (cur && cur.box < 4) {
    if (!srsIsDue(cur, now) && cur.box > 0) return;          // vadesi gelmeden doğru bilmek kutuyu atlatmaz
    const nb = cur.box + 1;
    e = { ...cur, box: nb, due: nb >= 4 ? null : startOfDay(now) + BOX_DAYS[nb]! * DAY, red: nb >= 2 ? false : !!cur.red, last: now };
  } else if (!cur && confidence === "unsure") e = { kind: "q", qid: q.id, box: 1, due: startOfDay(now) + DAY, red: false, last: now };
  else return;
  delete e.src;
  Store.put("srs", q.id, e);
}

function questionEntries(): SrsQuestion[] {
  const out: SrsQuestion[] = [];
  for (const k of Object.keys(Store.srs)) {
    if (k.startsWith(VOCAB_PREFIX)) continue;
    const e = srsGet(k);
    if (e && POOL.has(e.qid)) out.push(e);
  }
  return out;
}

/** Vadesi gelen sorular: önce kırmızılar, sonra düşük kutular, sonra en eski vade. */
export function dueQuestions(): SrsQuestion[] {
  return questionEntries().filter(e => srsIsDue(e))
    .sort((a, b) => (Number(b.red) - Number(a.red)) || (a.box - b.box) || ((a.due || 0) - (b.due || 0)));
}

export function srsBoxes(): { c: number[]; red: number } {
  const c = [0, 0, 0, 0, 0]; let red = 0;
  for (const e of questionEntries()) { c[Math.min(4, e.box)]!++; if (e.red && e.box < 4) red++; }
  return { c, red };
}
