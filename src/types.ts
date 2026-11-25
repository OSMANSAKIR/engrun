// Uygulamanın veri modeli. Soru dosyalarının biçimi: tools/SCHEMA.md.
import type { ExamId, ExamKind, FieldId } from "./config/exams";
import type { JokerId } from "./config/jokers";
import type { Confidence, Letter, Section } from "./config/sections";

/* ---------- Sorular ---------- */

export interface Explain {
  short?: string;                              // tek cümlelik özet
  why?: string;                                // neden doğru
  others?: Partial<Record<Letter, string>>;    // her yanlış şık neden elenir
  clues?: string[];                            // metinde vurgulanacak ipucu ifadeler
  tip?: string;                                // taktik
}

export interface VocabNote { en: string; tr: string }

export type Origin = "booklet" | "generated" | "claude";

export interface Question {
  id: string;
  n?: number | null;                // kitapçıktaki soru numarası
  section: Section;
  passage?: string | null;          // paragraflı sorularda paragraf kimliği
  stem?: string;
  stemTr?: string;
  options: Record<Letter, string>;
  answer: Letter;
  tags?: string[];
  difficulty?: number;
  explain?: Explain;
  vocab?: VocabNote[];
  field?: FieldId;                  // YÖKDİL alanı
  booklet?: string;
  origin?: Origin;
  generatedFrom?: string;
}

export interface Passage {
  id: string;
  kind?: string;                    // "cloze" | "reading" | ...
  text: string;
  tr?: string;                      // Türkçe özet
  field?: FieldId;
  booklet?: string;
  questions?: number[];
}

export interface Booklet { id: string; title: string; kind: "booklet" | "generated"; count: number }

/* ---------- Kayıtlar (Store koleksiyonları) ---------- */

// Her kayıt, eşitleme için kimliğini ve son değişiklik zamanını taşır (Store.put doldurur).
export interface DocMeta { id?: string; u?: number }

export type PlayMode = "run" | "practice" | "review" | "inspect" | "vocab";
export type AttemptMode = Exclude<PlayMode, "vocab"> | "gen" | "exam";

export interface Attempt extends DocMeta {
  qid: string;
  booklet?: string;
  section: Section;
  tags: string[];
  chosen: Letter | null;
  correct: boolean;
  confidence: Confidence | null;
  timeMs: number;
  mode: AttemptMode;
  ts: number;
}

// Leitner kutuları: 0 = aynı oturumda tekrar, 1-3 = 1/3/6 gün sonra, 4 = öğrenildi.
interface SrsBase extends DocMeta { box: number; due: number | null; last: number }
export interface SrsQuestion extends SrsBase {
  kind: "q";
  qid: string;
  red: boolean;                     // "Eminim" deyip yanılınan: kırmızı deste
  reAfter?: number;                 // kutu 0: oturumdaki kaçıncı sorudan sonra
  sess?: string;
  wrong?: number;
  src?: unknown;                    // eski sürümden kalan alan, yazarken silinir
}
export interface SrsVocab extends SrsBase { kind: "v"; en: string; tr: string }
export type SrsEntry = SrsQuestion | SrsVocab;

export type RunEndReason = "complete" | "hearts" | "target" | "quit";
export interface RunRecord extends DocMeta {
  type: "run";
  ts: number;
  score: number;
  gates: number;
  passed: number;
  correct: number;
  total: number;
  reason: RunEndReason;
  start?: Section;
}
export interface ExamRecord extends DocMeta {
  type: "exam";
  kind: ExamKind;
  ts: number;
  total: number;
  correct: number;
  blank: number;
  score: number;
  by: Partial<Record<Section, [number, number]>>;   // bölüm → [doğru, toplam]
  usedMs: number;
}
export type HistoryRecord = RunRecord | ExamRecord;

// Claude'un ürettiği ve doğrulanan soru: diğer cihazlarda da görünsün diye saklanır.
export interface GenDoc extends DocMeta { q: Question; passage: Passage | null; src: string; ts: number }

// İşaretlenen bilinmeyen kelime.
export interface WordDoc extends DocMeta {
  key: string;
  word: string;
  en: string | null;
  tr: string | null;
  pos: string | null;
  src: string | null;               // anlamın kaynağı: "liste" | "claude"
  ctx: string;                      // geçtiği cümle
  qids: string[];                   // hangi sorularda işaretlendi
  ts: number;
  failed?: boolean;
}

/* ---------- Ayarlar ---------- */

export interface Goal {
  exam: ExamId;
  field: FieldId | null;
  date: string | null;              // "YYYY-AA-GG"
  label: string;
  target: number | null;            // hedef puan; kullanıcı seçmediyse null
  minutes: number;                  // günlük süre
  start: string;                    // planın başladığı gün
}

export type Medal = "gold" | "silver";

export interface Settings extends DocMeta {
  music: boolean;
  sfx: boolean;
  volume: number;
  theme: "auto" | "dark" | "light";
  vibrate: boolean;
  seenStrategy: Partial<Record<Section, boolean>>;
  badges: Partial<Record<Section, Medal>>;
  dayChecks: Record<string, boolean[]>;
  jokersSeen: JokerId[];
  goal?: Goal | null;
  goalAsked?: boolean;
  placementTs?: number;
  aiModel?: string;
}
