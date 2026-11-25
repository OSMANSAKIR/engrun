import type { ExamId } from "../src/config/exams";
import type { Section } from "../src/config/sections";
import { PASSAGES, POOL } from "../src/core/pool";
import { bump, DEFAULT_SETTINGS, Store } from "../src/core/store";
import type { Attempt, Question } from "../src/types";

/** Her testten önce: boş havuz, boş kayıtlar, varsayılan ayarlar. */
export function reset(): void {
  POOL.clear(); PASSAGES.clear();
  Store.attempts = {}; Store.srs = {}; Store.runs = {}; Store.gen = {}; Store.words = {};
  Store.settings = { ...DEFAULT_SETTINGS };
  bump();
}

export function makeQ(id: string, section: Section, extra: Partial<Question> = {}): Question {
  const q: Question = { id, section, stem: "The ---- is here.", options: { A: "a", B: "b", C: "c", D: "d", E: "e" }, answer: "A", tags: [], ...extra };
  POOL.set(id, q);
  return q;
}

export function setGoal(target: number | null, exam: ExamId = "yds", extra: Partial<NonNullable<typeof Store.settings.goal>> = {}): void {
  Store.settings = { ...Store.settings, goal: { exam, field: null, date: null, label: exam, target, minutes: 60, start: "2026-01-01", ...extra } };
}

let n = 0;
/** Bir bölüme `ok` doğru, `bad` yanlış cevap ekler (ts artan sırayla). */
export function answer(section: Section, ok: number, bad: number, ts = Date.now() - 86_400_000 * 2): void {
  for (let i = 0; i < ok + bad; i++) {
    const id = `${section}-${++n}`;
    makeQ(id, section);
    const a: Attempt = { qid: id, section, tags: [], chosen: i < ok ? "A" : "B", correct: i < ok, confidence: "sure", timeMs: 30_000, mode: "practice", ts: ts + n };
    Store.attempts[id] = a;
  }
  bump();
}
