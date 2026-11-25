/* Hedef sınav ve hedef puan: bölüm ağırlıkları, deneme dağılımları ve bölüm hedefleri buradan türetilir. */
import { EXAM_TYPES, type ExamType, type SectionCounts } from "../config/exams";
import { SECTIONS, SLOW_SECTIONS, type Section } from "../config/sections";
import { clamp } from "../lib/format";
import { DAY, parseDay, startOfDay } from "../lib/time";
import type { Goal } from "../types";
import { S } from "./store";

export const G = (): Goal | null => S().goal || null;
export const examType = (): ExamType => EXAM_TYPES[G()?.exam ?? "yds"] ?? EXAM_TYPES.yds;
/** Seçili sınavda bu bölümden kaç soru çıkıyor. */
export const REAL = (s: Section): number => examType().real[s] || 0;
export const examSections = (): Section[] => SECTIONS.filter(s => REAL(s) > 0);
/** Kullanıcı seçmediyse hedef yok. */
export const goalTarget = (): number | null => G()?.target || null;

// Hedef puandan bölüm başına hedef doğru oranı: yavaş gelişen bölümler (okuma vb.) 10 puan altta, diğerleri 5 puan üstte.
// Gerçek soru sayılarıyla tartılınca toplam hedefe denk gelir (70 → %75 ve %60; 50 → %55 ve %40; 90 → %95 ve %80).
export function secTarget(s: Section): number | null {
  const g = goalTarget();
  return g == null ? null : clamp(SLOW_SECTIONS.has(s) ? g - 10 : g + 5, 20, 98) / 100;
}

// 80 soru × 1,25 puan: hedef puan için gereken doğru sayısı.
export function targetNote(v: number | null): string {
  return v ? `${v} puan için 80 sorudan en az ${Math.ceil(v / 1.25)} doğru gerekir. Plan, hangi bölümlerde ne kadar çalışacağını bu hedefe göre ayarlar.`
    : "Kaç puan istiyorsan yaz ya da hızlı seçimden birine dokun. Plan bu hedefe göre şekillenir.";
}

export function daysLeft(): number | null {
  const g = G();
  return g && g.date ? Math.round((parseDay(g.date) - startOfDay()) / DAY) : null;
}

// Payları gerçek soru sayılarıyla orantılı dağıtır (en büyük kalan yöntemi); her bölüme en az `min` soru.
export function scaleDist(total: number, min = 0): Partial<SectionCounts> {
  const secs = examSections(), sum = secs.reduce((a, s) => a + REAL(s), 0);
  const out: Partial<SectionCounts> = {}; let used = 0;
  for (const s of secs) { const n = Math.max(min, Math.floor(REAL(s) * total / sum)); out[s] = n; used += n; }
  const rest = secs.map(s => [s, REAL(s) * total / sum - Math.floor(REAL(s) * total / sum)] as const).sort((a, b) => b[1] - a[1]);
  for (let i = 0; used < total && i < rest.length * 2; i++) { const s = rest[i % rest.length]![0]; out[s] = (out[s] || 0) + 1; used++; }
  return out;
}

export const EXAM_DIST = {
  get half(): Partial<SectionCounts> { return scaleDist(40); },
  get full(): Partial<SectionCounts> { return examType().real; },
  // Seviye testi: her bölümden en az 1 soru, gerçek sınav oranlarına yakın; 28 soru · 65 dk
  get placement(): Partial<SectionCounts> { return scaleDist(28, 1); }
};
