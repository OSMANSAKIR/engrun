/* Koşu puanı = Çip × Çarpan. Ekrandan bağımsız, saf hesaplar (testlerde doğrudan denenir). */
import type { JokerId } from "../config/jokers";
import { SEC, type Section } from "../config/sections";
import type { Question } from "../types";

/** Her ardışık doğru çarpana +0,25 ekler, en fazla ×3. */
export const multOf = (combo: number): number => Math.min(3, 1 + 0.25 * combo);

/** Joker etkisiyle çip çarpanı (×1 ya da ×2). */
export function chipMul(q: Pick<Question, "section" | "tags">, jokers: readonly JokerId[]): number {
  const t = q.tags || [];
  if (jokers.includes("conj_eye") && t.some(x => x.startsWith("conj."))) return 2;
  if (jokers.includes("tense_master") && t.some(x => x.startsWith("grammar."))) return 2;
  if (jokers.includes("translator") && (q.section === "trans_en_tr" || q.section === "trans_tr_en")) return 2;
  return 1;
}

/** Soru başına par süre (sn); Hızlı Okur jokeri okuma bölümlerine +30 sn verir. */
export function parOf(q: Pick<Question, "section">, jokers: readonly JokerId[]): number {
  let p = SEC[q.section].par;
  if (jokers.includes("fast_reader") && ["reading", "para_completion", "cloze"].includes(q.section)) p += 30;
  return p;
}

export interface CorrectBonus {
  underPar: boolean;     // par süre altında cevap: +0,5
  elimHit: boolean;      // eleme kartıyla karartılan 2 şık da yanlıştı: +0,5
  sure: boolean;         // "Eminim" deyip doğru: ×1,5
}

export function scoreCorrect(chips: number, combo: number, b: CorrectBonus): { m: number; pts: number; bonus: string[] } {
  let m = multOf(combo);
  const bonus: string[] = [];
  if (b.underPar) { m += .5; bonus.push("par +0,5"); }
  if (b.elimHit) { m += .5; bonus.push("eleme +0,5"); }
  if (b.sure) { m *= 1.5; bonus.push("eminim ×1,5"); }
  return { m, pts: Math.round(chips * m), bonus };
}

/** Kapının hedefi: soruların hepsi ×1 çarpanla doğru olsa alınacak puanın %80'i. */
export const gateTarget = (section: Section, n: number): number => Math.round(SEC[section].chips * n * 0.8);
