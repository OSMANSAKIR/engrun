/* Kabuk: ekranlar arası geçiş, üst çubuk ve data-act düğmelerinin eylemleri. */
import { Sound } from "../audio/sound";
import { isExamKind } from "../config/exams";
import { isSection, type Letter, type Section } from "../config/sections";
import { allAttempts } from "../core/attempts";
import { POOL } from "../core/pool";
import { predicted, weakTags } from "../core/stats";
import { S, Store } from "../core/store";
import { startOfDay } from "../lib/time";
import { $, $$, toast } from "./dom";
import { EXAM, startExam } from "./exam";
import { openGoal } from "./goal-modal";
import { PLAY, startInspect, startPractice, startReview, startRun } from "./play";
import { screenExam } from "./screens/exam";
import { screenPractice } from "./screens/practice";
import { screenReview } from "./screens/review";
import { screenRun } from "./screens/run";
import { screenStats } from "./screens/stats";
import { screenToday } from "./screens/today";
import { showAllStrategy } from "./strategy";
import { startVocab } from "./vocab-cards";

const SCREENS = { today: screenToday, run: screenRun, review: screenReview, practice: screenPractice, exam: screenExam, stats: screenStats };
export type Screen = keyof typeof SCREENS;
const isScreen = (x: unknown): x is Screen => typeof x === "string" && Object.hasOwn(SCREENS, x);

export const UI: { screen: Screen; runStart: Section; prSec: Section | null; prTag: string | null; prCount: number; examSrc: string } =
  { screen: "today", runStart: "vocab", prSec: null, prTag: null, prCount: 10, examSrc: "fresh" };

export const main = document.getElementById("main") as HTMLElement;

/** Oyun ya da deneme sırasında alt gezinme gizlenir. */
export const setPlaying = (on: boolean): void => { document.body.classList.toggle("playing", on); };

export function go(screen: string): void {
  if (PLAY.active || EXAM.active || !isScreen(screen)) return;
  UI.screen = screen; setPlaying(false);
  $$(".nav button").forEach(b => b.setAttribute("aria-current", b.dataset.go === screen ? "page" : "false"));
  Sound.examMute = false; if (Sound.ready) { Sound.setTrack("lobby"); Sound.sync(); }
  render(); window.scrollTo(0, 0);
}

export function render(): void {
  updateTop();
  main.innerHTML = `<div class="wrap stack">${(SCREENS[UI.screen] || screenToday)()}</div>`;
  bindActions(main);
}

export function updateTop(): void {
  const p = predicted(allAttempts());
  $("#predTop").textContent = p.score == null ? "—" : String(p.score);
}

export function bindActions(root: ParentNode): void {
  $$("[data-act]", root).forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); doAction(el.dataset.act || ""); }));
}

// data-act="eylem:değer" biçimindeki düğmeler.
function doAction(a: string): void {
  const [k, v] = a.split(":");
  switch (k) {
    case "go": return go(v || "today");
    case "run": UI.runStart = isSection(v) ? v : "vocab"; return void startRun(UI.runStart);
    case "practice":
      if (v === "weak") { const w = weakTags(allAttempts(), 2).map(x => x.tag); return startPractice({ tags: w.length ? w : null, count: 15 }); }
      return startPractice({ section: isSection(v) ? v : null, count: 10 });
    case "review": return startReview();
    case "vocab": return startVocab();
    case "exam": return startExam(isExamKind(v) ? v : "half", UI.examSrc);
    case "stats": return go("stats");
    case "strategy": return showAllStrategy();
    case "goal": return openGoal(false);
    case "todaywrong": {
      const t0 = startOfDay();
      const wr = Object.values(Store.attempts).filter(x => x.ts >= t0 && !x.correct && POOL.has(x.qid));
      if (!wr.length) return toast("Bugün henüz yanlışın yok.");
      const seen = new Set<string>(); const items: { qid: string; chosen: Letter | null }[] = [];
      for (const x of wr.reverse()) if (!seen.has(x.qid)) { seen.add(x.qid); items.push({ qid: x.qid, chosen: x.chosen }); }
      return startInspect(items, "Bugünün hataları");
    }
  }
}

export function applyTheme(): void {
  const t = S().theme;
  if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}
