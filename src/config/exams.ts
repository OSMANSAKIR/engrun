import type { Section } from "./sections";

export type ExamId = "yds" | "eyds" | "yokdil";
export type FieldId = "sosyal" | "saglik" | "fen";
export type SectionCounts = Record<Section, number>;

export interface ExamType {
  name: string;
  desc: string;
  real: SectionCounts;                   // bölüm başına gerçek soru sayısı
  fields?: Record<FieldId, string>;
}

// Sınav biçimleri: bölüm başına gerçek soru sayısı. Hepsi 80 soru, 180 dk, soru başı 1,25 puan.
// YÖKDİL'in ilk 20 sorusu kelime+gramer karışık; ÖSYM ayrım vermediği için yarı yarıya saydık.
// YÖKDİL'de diyalog ve yakın anlam bölümü yok.
export const YDS_REAL: SectionCounts = { vocab: 6, grammar: 10, cloze: 10, sentence: 10, trans_en_tr: 3, trans_tr_en: 3, reading: 20, dialogue: 5, restatement: 4, para_completion: 4, irrelevant: 5 };

export const EXAM_TYPES: Record<ExamId, ExamType> = {
  yds:    { name: "YDS",    desc: "Kâğıt sınav, yılda 2 kez", real: YDS_REAL },
  eyds:   { name: "e-YDS",  desc: "Bilgisayarda, yılda ~8 oturum; soru tipleri YDS ile aynı", real: YDS_REAL },
  yokdil: { name: "YÖKDİL", desc: "Akademik; metinler alanına göre (Fen, Sağlık, Sosyal)",
            real: { vocab: 10, grammar: 10, cloze: 10, sentence: 11, trans_en_tr: 6, trans_tr_en: 6, reading: 15, dialogue: 0, restatement: 0, para_completion: 6, irrelevant: 6 },
            fields: { sosyal: "Sosyal Bilimler", saglik: "Sağlık Bilimleri", fen: "Fen Bilimleri" } }
};

export interface CalendarEntry { exam: ExamId; label: string; date: string; field?: FieldId }

// ÖSYM takvimi (2026 ve 2027, İngilizce oturumlar). Takvim değişebilir; başvurudan önce osym.gov.tr'den kontrol edilmeli.
export const EXAM_CALENDAR: readonly CalendarEntry[] = [
  { exam: "eyds",   label: "e-YDS 2026/12",            date: "2026-12-19" },
  { exam: "eyds",   label: "e-YDS 2027/1",             date: "2027-01-16" },
  { exam: "eyds",   label: "e-YDS 2027/2",             date: "2027-02-06" },
  { exam: "yokdil", label: "YÖKDİL 2027/1",            date: "2027-02-28" },
  { exam: "yds",    label: "YDS 2027/1",               date: "2027-03-28" },
  { exam: "eyds",   label: "e-YDS 2027/4",             date: "2027-04-24" },
  { exam: "yokdil", label: "e-YÖKDİL 2027 · Sosyal",   date: "2027-05-29", field: "sosyal" },
  { exam: "yokdil", label: "e-YÖKDİL 2027 · Sağlık",   date: "2027-05-30", field: "saglik" },
  { exam: "yokdil", label: "e-YÖKDİL 2027 · Fen",      date: "2027-06-05", field: "fen" },
  { exam: "eyds",   label: "e-YDS 2027/6",             date: "2027-06-26" },
  { exam: "yokdil", label: "YÖKDİL 2027/2",            date: "2027-07-25" },
  { exam: "eyds",   label: "e-YDS 2027/9",             date: "2027-08-21" },
  { exam: "eyds",   label: "e-YDS 2027/10",            date: "2027-09-25" },
  { exam: "eyds",   label: "e-YDS 2027/11",            date: "2027-10-16" },
  { exam: "yds",    label: "YDS 2027/2",               date: "2027-11-21" },
  { exam: "eyds",   label: "e-YDS 2027/12",            date: "2027-12-18" }
];

export const TARGET_CHIPS = [50, 60, 70, 80, 90];
export const DAILY_MIN = [30, 60, 90, 120];

export type ExamKind = "full" | "half" | "placement";
export const EXAM_NAME: Record<ExamKind, string> = { full: "Tam deneme", half: "Yarım deneme", placement: "Seviye testi" };
export const EXAM_MIN: Record<ExamKind, number> = { full: 180, half: 90, placement: 65 };
export const isExamKind = (x: unknown): x is ExamKind => typeof x === "string" && Object.hasOwn(EXAM_NAME, x);
