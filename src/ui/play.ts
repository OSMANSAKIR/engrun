/* Oyun motoru: Koşu, Antrenman, Tekrar ve İnceleme aynı soru ekranını paylaşır. */
import { Sound } from "../audio/sound";
import { JOKERS, type JokerId } from "../config/jokers";
import { LETTERS, SEC, SECTIONS, isLetter, type Confidence, type Letter, type Section } from "../config/sections";
import { tagName } from "../config/tags";
import { recordAttempt } from "../core/attempts";
import { findQ, PASSAGES, POOL, Q } from "../core/pool";
import { chipMul, multOf, parOf, scoreCorrect } from "../core/scoring";
import { buildGate, buildUnits, takeUnits, type Gate } from "../core/selection";
import { dueQuestions, srsAfterAnswer } from "../core/srs";
import { jokerProgress } from "../core/stats";
import { S, Store } from "../core/store";
import { esc, fmtNum, fmtSec, pct } from "../lib/format";
import { shuffle } from "../lib/random";
import type { AttemptMode, PlayMode, Question, RunEndReason } from "../types";
import { bindAi } from "./ai-panel";
import { confettiBurst } from "./confetti";
import { $, $$, $opt, closest, REDUCED, toast, typing, vibrate } from "./dom";
import { ICON } from "./icons";
import { applyMarks, lookupSoon, markBtnHtml } from "./marking";
import { modal, confirmBox } from "./modal";
import { confHtml, feedbackHtml, optionsHtml, passageHtml, prepText, qLabel, richText, scrollPassageToBlank, stemHtml } from "./question";
import { go, main, setPlaying, UI } from "./shell";
import { maybeStrategy, strategyHtml } from "./strategy";
import { VOC, vocabAnswer, vocabNext } from "./vocab-cards";

export interface PlayItem { qid: string; preset?: boolean; chosen?: Letter | null; red?: boolean; gen?: boolean; again?: boolean }
interface PlayResult { qid: string; chosen: Letter; correct: boolean; conf: Confidence }

export interface RunState {
  hearts: number; score: number; combo: number;
  gates: Section[]; gi: number; gate: Gate;
  elim: number;                     // kalan eleme kartı
  jokers: JokerId[];
  passed: number; correct: number; total: number; startTs: number;
}

interface PlayState {
  active: boolean; mode: PlayMode | null; items: PlayItem[]; idx: number; results: PlayResult[]; title: string; run: RunState | null;
  // şu anki soru
  q: Question | null; picked: Letter | null; answered: boolean; struck: Letter[]; striking: boolean; elimUsed: boolean;
  t0: number; clockT: ReturnType<typeof setInterval> | undefined;
}

const freshPlay = (): PlayState => ({ active: false, mode: null, items: [], idx: -1, results: [], title: "", run: null, q: null, picked: null, answered: false, struck: [], striking: false, elimUsed: false, t0: 0, clockT: undefined });
export const PLAY: PlayState = freshPlay();

const jokersNow = (): JokerId[] => PLAY.run ? PLAY.run.jokers : [];
const activeJokers = (): JokerId[] => jokerProgress().filter(j => j.unlocked).slice(0, 3).map(j => j.id);

function beginPlay(mode: PlayMode, items: PlayItem[], extra: { title?: string; run?: RunState } = {}): void {
  clearInterval(PLAY.clockT);
  Object.assign(PLAY, freshPlay(), { active: true, mode, items, title: extra.title || "", run: extra.run || null });
  setPlaying(true);
  Sound.examMute = false; Sound.sync();
}

/* ---------- Başlatıcılar ---------- */

export async function startRun(startSec: Section): Promise<void> {
  if (!POOL.size) return toast("Henüz soru yüklenmedi.");
  const from = Math.max(0, SECTIONS.indexOf(startSec));
  const gates = SECTIONS.slice(from).filter(s => [...POOL.values()].some(q => q.section === s));
  if (!gates.length) return toast("Bu bölümde soru yok.");
  const run: RunState = { hearts: 5, score: 0, combo: 0, gates, gi: 0, gate: buildGate(gates[0]!), elim: 2, jokers: activeJokers(), passed: 0, correct: 0, total: 0, startTs: Date.now() };
  beginPlay("run", [], { run });
  enterGate(run);
}

function enterGate(r: RunState): void {
  PLAY.items = r.gate.qids.map(qid => ({ qid })); PLAY.idx = -1;
  if (Sound.ready) Sound.setTrack(r.gate.section);
  renderGateIntro(r);
}

function renderGateIntro(r: RunState): void {
  const g = r.gate, sec = g.section;
  main.innerHTML = `${hudHtml()}<div class="wrap"><div class="reward">
    <p class="eyebrow">Kapı ${SECTIONS.indexOf(sec) + 1} / 11</p>
    <div class="ttl win">${esc(SEC[sec].short)}</div>
    <p class="muted">${g.qids.length} soru · hedef <b class="mono" style="color:var(--gold)">${g.target}</b> puan · par ${fmtSec(parOf({ section: sec }, r.jokers))} / soru</p>
    <div class="panel" style="text-align:left;width:100%">${strategyHtml(sec)}</div>
  </div></div>
  <div class="actionbar"><div class="wrap"><button class="btn primary" id="gateGo">Kapıya gir</button></div></div>`;
  bindHud();
  $("#gateGo").onclick = () => {
    const seen = S().seenStrategy || {};
    if (!seen[sec]) Store.setSettings({ seenStrategy: { ...seen, [sec]: true } });
    nextQ();
  };
}

export function startPractice({ section = null, tags = null, count }: { section?: Section | null; tags?: string[] | null; count: number }): void {
  let qs = [...POOL.values()];
  if (section) qs = qs.filter(q => q.section === section);
  if (tags && tags.length) qs = qs.filter(q => (q.tags || []).some(t => tags.includes(t)));
  if (!qs.length) return toast("Bu seçim için soru yok.");
  const qids = takeUnits(buildUnits(qs), count || 9999);
  const title = section ? SEC[section].short : tags && tags.length ? tags.map(tagName).join(", ") : "Karışık";
  beginPlay("practice", qids.map(qid => ({ qid })), { title: "Antrenman · " + title });
  if (Sound.ready) Sound.setTrack(section || "lobby");
  void (section ? maybeStrategy(section) : Promise.resolve()).then(nextQ);
}

export function startReview(): void {
  const due = dueQuestions().slice(0, 20);
  if (!due.length) return toast("Vadesi gelen tekrar sorusu yok.");
  // karışık pratik: bölümler karışsın ama kırmızılar önde
  const red = shuffle(due.filter(e => e.red)), rest = shuffle(due.filter(e => !e.red));
  beginPlay("review", [...red, ...rest].map(e => ({ qid: e.qid, red: e.red })), { title: "Tekrar Destesi" });
  if (Sound.ready) Sound.setTrack("lobby");
  nextQ();
}

/** Cevaplanmış soruları açıklamalarıyla gezme (hata incelemesi). */
export function startInspect(items: { qid: string; chosen: Letter | null }[], title: string): void {
  beginPlay("inspect", items.map(x => ({ ...x, preset: true })), { title });
  nextQ();
}

/** Claude'un ürettiği soruyu hemen sıradaki soru yapar. */
export function insertNext(qid: string): void {
  if (!PLAY.active) return;
  PLAY.items.splice(PLAY.idx + 1, 0, { qid, gen: true });
  if (PLAY.run) PLAY.run.gate.qids.splice(PLAY.idx + 1, 0, qid);
  nextQ();
}

/* ---------- Üst çubuk ---------- */

function hudHtml(): string {
  const r = PLAY.run;
  if (PLAY.mode === "run" && r) {
    const g = r.gate; const m = multOf(r.combo);
    return `<div class="hud"><div class="wrap">
      <div class="hud-top">
        <button class="iconbtn" id="quit" aria-label="Koşuyu bitir">${ICON.close}</button>
        <div class="hud-title"><div class="g">${esc(SEC[g.section].short)}</div><div class="s">Kapı ${SECTIONS.indexOf(g.section) + 1}/11 · soru ${Math.min(g.qids.length, Math.max(1, PLAY.idx + 1))}/${g.qids.length} · toplam <span class="mono">${r.score}</span></div></div>
        <span class="hearts" id="hearts" aria-label="${r.hearts} kalp">${[0, 1, 2, 3, 4].map(i => ICON.heart(i < r.hearts)).join("")}</span>
      </div>
      <div class="hud-score">
        <span class="cxm" aria-label="Çip çarpı çarpan"><span class="c" id="hudC">${SEC[g.section].chips}</span><span class="x">×</span><span class="m ${heat(m)}" id="hudM">${fmtNum(m)}</span></span>
        <div class="target"><div class="tl"><span>Puan <b class="mono" id="gScore">${g.score}</b></span><span>hedef <b class="mono">${g.target}</b></span></div><div class="tbar"><i id="gBar" style="width:${Math.min(100, pct(g.score, g.target))}%"></i></div></div>
        <div class="slots" aria-label="Joker slotları">${[0, 1, 2].map(i => { const j = JOKERS.find(x => x.id === r.jokers[i]); return `<span class="slot ${j ? "on" : ""}" title="${j ? esc(j.name + ": " + j.desc) : "Boş slot"}">${j ? esc(j.name.split(" ").map(w => w[0]).join("")) : ""}</span>`; }).join("")}</div>
      </div></div></div>`;
  }
  const done = PLAY.results.length, ok = PLAY.results.filter(x => x.correct).length;
  return `<div class="hud"><div class="wrap"><div class="hud-top">
    <button class="iconbtn" id="quit" aria-label="Bitir">${ICON.close}</button>
    <div class="hud-title"><div class="g">${esc(PLAY.title)}</div><div class="s">${Math.min(PLAY.items.length, PLAY.idx + 1)}/${PLAY.items.length}${PLAY.mode !== "inspect" ? ` · ${ok}/${done} doğru` : ""}</div></div>
  </div></div></div>`;
}
const heat = (m: number) => m >= 2.5 ? "blaze" : m >= 1.75 ? "hot" : "";

function bindHud(): void {
  const b = $opt("#quit"); if (!b) return;
  b.onclick = async () => {
    if (PLAY.mode === "inspect") return endPlay();
    if (await confirmBox(PLAY.mode === "run" ? "Koşuyu burada bitirmek istiyor musun? Puanın kaydedilir." : "Oturumu bitirmek istiyor musun?", "Bitir")) {
      if (PLAY.mode === "run") endRun("quit"); else endPlay();
    }
  };
}

function refreshHud(hurt: boolean): void {
  const r = PLAY.run; if (!r) return;
  const g = r.gate, m = multOf(r.combo);
  const hm = $opt("#hudM"); if (hm) { hm.textContent = fmtNum(m); hm.className = "m " + heat(m); }
  const gs = $opt("#gScore"); if (gs) gs.textContent = String(g.score);
  const gb = $opt("#gBar"); if (gb) gb.style.width = Math.min(100, pct(g.score, g.target)) + "%";
  const h = $opt("#hearts");
  if (h) { h.innerHTML = [0, 1, 2, 3, 4].map(i => ICON.heart(i < r.hearts)).join(""); if (hurt && !REDUCED) h.children[r.hearts]?.classList.add("heartbreak"); }
  const s = $opt(".hud-title .s"); if (s) s.innerHTML = `Kapı ${SECTIONS.indexOf(g.section) + 1}/11 · soru ${PLAY.idx + 1}/${g.qids.length} · toplam <span class="mono">${r.score}</span>`;
}

/* ---------- Soru akışı ---------- */

export function nextQ(): void {
  PLAY.idx++;
  const r = PLAY.run;
  if (PLAY.mode === "run" && r) {
    if (r.hearts <= 0) return endRun("hearts");
    if (PLAY.idx >= r.gate.qids.length) return endGate(r);
  } else if (PLAY.idx >= PLAY.items.length) return endPlay();
  renderQ();
}
function prevQ(): void { if (PLAY.idx > 0) { PLAY.idx--; renderQ(); } }

function renderQ(): void {
  const it = PLAY.items[PLAY.idx]; const q = it && findQ(it.qid);
  if (!it || !q) return nextQ();
  Object.assign(PLAY, { q, picked: null, answered: false, struck: [], striking: false, elimUsed: false });
  const inspect = !!it.preset;
  const clues = inspect ? q.explain?.clues : null;
  const par = parOf(q, jokersNow());
  const r = PLAY.mode === "run" ? PLAY.run : null;
  main.innerHTML = `${hudHtml()}<div class="wrap play">
    ${q.passage ? passageHtml(q, clues) : ""}
    <article class="qcard" id="qcard">
      <div class="qmeta"><span class="eyebrow">${esc(SEC[q.section].tr)}${q.n ? " · " + q.n : ""}${q.origin === "claude" ? " · Claude üretimi" : ""}${it.red ? ` · <span style="color:var(--bad)">kırmızı</span>` : ""}</span>${inspect ? "" : `<span class="clock mono" id="clock">0:00 / ${fmtSec(par)}</span>`}</div>
      <div class="stem" id="stem">${stemHtml(q, clues)}</div>
      <div class="opts" id="opts">${optionsHtml(q, inspect ? { done: true, chosen: it.chosen } : {})}</div>
      <div class="qtools">${markBtnHtml()}${!inspect && r ? `<button class="btn small" id="elimBtn" ${r.elim ? "" : "disabled"}>Eleme Kartı · ${r.elim}</button><span class="note" id="elimNote"></span>` : ""}<span class="note" id="markNote"></span></div>
    </article>
    <section class="fb" id="fb" ${inspect ? "" : "hidden"} style="scroll-margin-top:${PLAY.mode === "run" ? 130 : 80}px">${inspect ? feedbackHtml(q, it.chosen, { blank: !it.chosen }) : ""}</section>
  </div>
  <div class="actionbar"><div class="wrap">${inspect
    ? `<button class="btn" id="prev" ${PLAY.idx ? "" : "disabled"}>◀ Önceki</button><button class="btn primary" id="next">${PLAY.idx + 1 >= PLAY.items.length ? "Bitir" : "Sonraki ▶"}</button>`
    : `<button class="btn primary" id="next" disabled>Bir şık seç</button>`}</div></div>`;
  bindHud();
  applyMarks();
  scrollPassageToBlank();
  window.scrollTo(0, 0);
  $("#opts").addEventListener("click", onOptClick);
  $("#next").onclick = () => nextQ();
  const prev = $opt("#prev"); if (prev) prev.onclick = prevQ;
  if (inspect) { bindAi(q, it.chosen); lookupSoon(0); return; }
  const eb = $opt("#elimBtn"); if (eb) eb.onclick = toggleStrike;
  PLAY.t0 = performance.now();
  clearInterval(PLAY.clockT);
  PLAY.clockT = setInterval(() => {
    const c = $opt("#clock"); if (!c || PLAY.answered) return clearInterval(PLAY.clockT);
    const s = (performance.now() - PLAY.t0) / 1000;
    c.textContent = fmtSec(s) + " / " + fmtSec(par); c.classList.toggle("over", s > par);
  }, 1000);
}

// Eleme Kartı: cevaplamadan önce 2 şık karartılır; ikisi de yanlışsa doğru cevapta +0,5 çarpan.
function toggleStrike(): void {
  if (PLAY.answered || PLAY.elimUsed) return;
  PLAY.striking = !PLAY.striking;
  $$("#opts .opt").forEach(b => b.classList.toggle("striking", PLAY.striking));
  $("#elimNote").textContent = PLAY.striking ? "Karartmak istediğin 2 şıkka dokun." : "";
  $opt("#conf")?.remove(); PLAY.picked = null;
  $$("#opts .opt.picked").forEach(b => b.classList.remove("picked"));
}

function onOptClick(e: Event): void {
  const b = closest(e, "[data-opt]"); if (!b || PLAY.answered || b.getAttribute("aria-disabled") === "true") return;
  const L = b.dataset.opt; if (!isLetter(L)) return;
  const r = PLAY.run;
  if (PLAY.striking && r) {
    PLAY.struck.push(L); b.classList.add("struck"); b.setAttribute("aria-disabled", "true"); Sound.tick(PLAY.struck.length);
    if (PLAY.struck.length >= 2) {
      PLAY.striking = false; PLAY.elimUsed = true; r.elim--;
      $$("#opts .opt").forEach(x => x.classList.remove("striking"));
      const eb = $<HTMLButtonElement>("#elimBtn"); eb.disabled = true; eb.textContent = "Eleme Kartı · " + r.elim;
      $("#elimNote").textContent = "2 şık karartıldı. İkisi de yanlışsa +0,5 çarpan.";
    }
    return;
  }
  pick(L);
}

// Şık seçilince hemen altında güven sorusu açılır; cevap güven seçilince kesinleşir.
function pick(L: Letter): void {
  PLAY.picked = L;
  $$("#opts .opt").forEach(x => x.classList.toggle("picked", x.dataset.opt === L));
  let c = $opt("#conf");
  if (!c) {
    const t = document.createElement("div"); t.innerHTML = confHtml(); c = t.firstElementChild as HTMLElement;
    c.addEventListener("click", ev => { const k = closest(ev, "[data-conf]"); if (k) submit(k.dataset.conf as Confidence); });
  }
  $(`#opts [data-opt="${L}"]`).after(c);
  const nb = $<HTMLButtonElement>("#next"); nb.textContent = "Güvenini seç"; nb.disabled = true;
  if (c.getBoundingClientRect().bottom > innerHeight - 80) c.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
}

function submit(conf: Confidence): void {
  if (PLAY.answered || !PLAY.picked || !PLAY.q) return;
  const q = PLAY.q, it = PLAY.items[PLAY.idx]!, chosen = PLAY.picked;
  const ms = performance.now() - PLAY.t0;
  PLAY.answered = true; clearInterval(PLAY.clockT);
  $opt("#conf")?.remove();
  const mode: AttemptMode = it.gen ? "gen" : PLAY.mode as Exclude<PlayMode, "vocab">;
  const att = recordAttempt(q, chosen, conf, ms, mode);
  srsAfterAnswer(q, att.correct, conf);
  PLAY.results.push({ qid: q.id, chosen, correct: att.correct, conf });
  $("#opts").innerHTML = optionsHtml(q, { done: true, chosen, struck: PLAY.struck });
  $("#stem").innerHTML = stemHtml(q, q.explain?.clues);
  const psg = $opt("#psg");
  if (q.passage && psg) { const top = psg.scrollTop; $("#psg > div:last-child").innerHTML = richText(prepText(PASSAGES.get(q.passage)?.text, q.section), q.explain?.clues, q.n); psg.scrollTop = top; }
  const eb = $opt<HTMLButtonElement>("#elimBtn"); if (eb) eb.disabled = true;

  let scoreLine = "", extra = "";
  const ok = att.correct;
  const sec = ms / 1000, par = parOf(q, jokersNow());
  const r = PLAY.run;
  if (PLAY.mode === "run" && r) {
    const g = r.gate;
    g.total++; r.total++;
    if (ok) {
      const chips = SEC[q.section].chips * chipMul(q, r.jokers);
      const { m, pts, bonus } = scoreCorrect(chips, r.combo, { underPar: sec <= par, elimHit: PLAY.elimUsed && !PLAY.struck.includes(q.answer), sure: conf === "sure" });
      r.combo++; g.correct++; r.correct++; g.score += pts; r.score += pts;
      scoreLine = `${chips} çip × ${fmtNum(m)} = +${pts} puan`;
      extra = bonus.join(" · ");
      Sound.correct(r.combo); vibrate(30);
      scoreBurst(chips, m, pts);
    } else {
      r.combo = 0; r.hearts--;
      Sound.wrong(); setTimeout(() => Sound.heart(), 180); vibrate([60, 40, 60]);
      const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
      extra = conf === "sure" ? "Eminim deyip yanıldın → kırmızı desteye girdi" : "tekrar destesine eklendi";
    }
    refreshHud(!ok);
  } else if (ok) {
    Sound.correct(PLAY.results.slice(-5).filter(x => x.correct).length); vibrate(30);
    scoreLine = sec <= par ? `Par altında (${fmtSec(sec)})` : `Süre ${fmtSec(sec)} · par ${fmtSec(par)}`;
    if (conf === "guess") extra = "tahminle doğru, yakında tekrar sorulacak";
  } else {
    Sound.wrong(); vibrate([60, 40, 60]);
    extra = conf === "sure" ? "kırmızı desteye girdi" : "~10 soru sonra tekrar gelecek";
    // Aynı oturumda ~10 soru sonra bir kez daha sorulur (en fazla 2 kez).
    if (PLAY.items.filter(x => x.qid === q.id).length < 2) PLAY.items.splice(Math.min(PLAY.items.length, PLAY.idx + 11), 0, { qid: q.id, again: true });
  }
  const fb = $("#fb");
  fb.innerHTML = feedbackHtml(q, chosen, { scoreLine, extra });
  fb.hidden = false;
  bindAi(q, chosen);
  applyMarks(); lookupSoon(0);
  const nb = $<HTMLButtonElement>("#next"); nb.disabled = false;
  nb.textContent = r && PLAY.mode === "run" ? (r.hearts <= 0 ? "Koşu bitti · özet" : PLAY.idx + 1 >= r.gate.qids.length ? "Kapı sonucu ▶" : "Devam ▶") : (PLAY.idx + 1 >= PLAY.items.length ? "Bitir ▶" : "Devam ▶");
  nb.focus({ preventScroll: true });
  setTimeout(() => fb.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }), ok && PLAY.mode === "run" && !REDUCED ? 900 : 60);
  checkUnlocks();
}

// "12 × 1,75 = 21" puan patlaması; sayaç tık sesiyle sayar, sonunda ekran sarsılır.
function scoreBurst(chips: number, m: number, pts: number): void {
  const el = document.createElement("div"); el.className = "burst" + (REDUCED ? "" : " pop");
  el.innerHTML = `<span class="c">${chips}</span><span class="x">×</span><span class="m">${fmtNum(m)}</span><span class="x">=</span><span class="t" id="burstT">${REDUCED ? pts : 0}</span>`;
  document.body.appendChild(el);
  if (!REDUCED) {
    const steps = 8; let i = 0;
    const t = setInterval(() => {
      i++; const bt = $opt("#burstT", el); if (bt) bt.textContent = String(Math.round(pts * i / steps)); Sound.tick(i);
      if (i >= steps) { clearInterval(t); main.classList.remove("shake"); void main.offsetWidth; main.classList.add("shake"); }
    }, 55);
  }
  setTimeout(() => el.remove(), REDUCED ? 900 : 1300);
}

function checkUnlocks(): void {
  const seen = new Set(S().jokersSeen || []);
  const fresh = jokerProgress().filter(j => j.unlocked && !seen.has(j.id));
  const j = fresh[0]; if (!j) return;
  Store.setSettings({ jokersSeen: [...seen, ...fresh.map(x => x.id)] });
  setTimeout(() => {
    Sound.unlock();
    const m = modal(`<p class="eyebrow">Yeni joker açıldı</p><div class="jcard" id="newJ" style="max-width:220px;margin:0 auto;width:100%"><div class="in"><div class="face back"></div><div class="face front"><span class="jn">${esc(j.name)}</span><span class="jd">${esc(j.desc)}</span></div></div></div><p class="muted" style="text-align:center">${j.need} ${esc(j.label)} · Ustalığın ödülü. Sonraki koşuda slotunda.</p><button class="btn primary block" data-close>Harika</button>`);
    setTimeout(() => { $opt("#newJ", m.el)?.classList.add("flip"); Sound.flip(); }, 250);
  }, 1200);
}

/* ---------- Bitiş ekranları ---------- */

function endGate(r: RunState): void {
  const g = r.gate;
  const acc = g.total ? g.correct / g.total : 0;
  const passed = g.score >= g.target;
  let heartBack = false;
  const medal = passed ? (acc >= .8 ? "gold" : "silver") : null;
  if (medal) {
    r.passed++;
    const b = { ...(S().badges || {}) };
    if (b[g.section] !== "gold") { b[g.section] = medal; Store.setSettings({ badges: b }); }
    if (acc >= .8 && r.hearts < 5) { r.hearts++; heartBack = true; }
    if (medal === "gold" && r.elim < 3) r.elim++;
    Sound.fanfare(); confettiBurst(medal === "gold"); vibrate([40, 30, 40]);
  } else Sound.wrong();
  const nextSec = r.gates[r.gi + 1];
  main.innerHTML = `${hudHtml()}<div class="wrap"><div class="reward">
    ${medal ? `<svg class="medal" viewBox="0 0 24 24">${ICON.medal(medal).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>` : ""}
    <div class="ttl ${passed ? "win" : "lose"}">${passed ? "Kapı geçildi!" : "Kapı kapandı"}</div>
    <div class="score ${passed ? "" : "muted"}">${g.score}<span class="muted" style="font-size:22px"> / ${g.target}</span></div>
    <div class="kv">
      <div class="stat"><div class="v">${g.correct}/${g.total}</div><div class="l">doğru</div></div>
      <div class="stat"><div class="v">${r.hearts}</div><div class="l">kalp${heartBack ? " (+1 geri geldi)" : ""}</div></div>
      <div class="stat"><div class="v">${r.score}</div><div class="l">koşu puanı</div></div>
    </div>
    <p class="muted">${passed ? (medal === "gold" ? "Altın rozet! %80 üzeri başarı." : "Gümüş rozet. %80'i geçersen altın olur.") : "Hedefe ulaşamadın. Hatalarını incele, sonra yeniden dene."}</p>
  </div></div>
  <div class="actionbar"><div class="wrap">${passed && nextSec ? `<button class="btn primary" id="gNext">Sonraki kapı: ${esc(SEC[nextSec].short)} ▶</button>` : `<button class="btn primary" id="gEnd">Koşu özeti ▶</button>`}</div></div>`;
  bindHud();
  window.scrollTo(0, 0);
  const gn = $opt("#gNext"); if (gn && nextSec) gn.onclick = () => { r.gi++; r.gate = buildGate(nextSec); enterGate(r); };
  const ge = $opt("#gEnd"); if (ge) ge.onclick = () => endRun(passed ? "complete" : "target");
}

function endRun(reason: RunEndReason): void {
  const r = PLAY.run; if (!r) return;
  Store.put("runs", "run-" + Date.now(), { type: "run", ts: Date.now(), score: r.score, gates: r.gi + 1, passed: r.passed, correct: r.correct, total: r.total, reason, start: r.gates[0] });
  const wrong = PLAY.results.filter(x => !x.correct);
  const title = { complete: "Koşu tamamlandı!", hearts: "Kalpler bitti", target: "Koşu bitti", quit: "Koşu bitti" }[reason];
  if (reason === "complete") { Sound.fanfare(); confettiBurst(true); }
  const best = Object.values(Store.runs).reduce((m, x) => x.type === "run" ? Math.max(m, x.score || 0) : m, 0);
  summaryScreen(title, reason === "complete", `
    <div class="score">${r.score}</div><p class="muted">${r.score >= best && r.score > 0 ? "Yeni rekor!" : "En iyi: " + best}</p>
    <div class="kv"><div class="stat"><div class="v">${r.passed}</div><div class="l">kapı geçildi</div></div><div class="stat"><div class="v">${r.correct}/${r.total}</div><div class="l">doğru</div></div><div class="stat"><div class="v">%${pct(r.correct, r.total)}</div><div class="l">isabet</div></div></div>`, wrong);
}

function endPlay(): void {
  if (PLAY.mode === "inspect") { PLAY.active = false; return go(UI.screen); }
  const res = PLAY.results; const ok = res.filter(x => x.correct).length;
  summaryScreen(PLAY.mode === "review" ? "Tekrar tamam" : "Antrenman tamam", ok >= res.length * .75 && res.length > 0, `
    <div class="score">${ok}/${res.length}</div><p class="muted">%${pct(ok, res.length)} doğru</p>`, res.filter(x => !x.correct));
}

export function summaryScreen(title: string, win: boolean, body: string, wrong: readonly { qid: string; chosen: Letter | null }[]): void {
  clearInterval(PLAY.clockT);
  const seen = new Set<string>(); const items: { qid: string; chosen: Letter | null }[] = [];
  for (const w of wrong) if (!seen.has(w.qid)) { seen.add(w.qid); items.push({ qid: w.qid, chosen: w.chosen }); }
  PLAY.active = false;
  main.innerHTML = `<div class="wrap"><div class="reward"><div class="ttl ${win ? "win" : ""}">${esc(title)}</div>${body}
    ${items.length ? `<section class="panel" style="width:100%;text-align:left"><h3>Hata özeti (${items.length})</h3><div style="margin-top:6px">${items.map(x => { const q = Q(x.qid); return `<div class="weak"><span><b>${qLabel(q)}</b> · ${esc(q.explain?.short || "")}</span><span class="mono" style="color:var(--bad)">${x.chosen}→${q.answer}</span></div>`; }).join("")}</div></section>` : ""}
  </div></div>
  <div class="actionbar"><div class="wrap">${items.length ? `<button class="btn" id="sInspect">Hataları incele</button>` : ""}<button class="btn primary" id="sHome">Tamam</button></div></div>`;
  const si = $opt("#sInspect"); if (si) si.onclick = () => startInspect(items, "Hata incelemesi");
  $("#sHome").onclick = () => { PLAY.active = false; go(UI.screen); };
  window.scrollTo(0, 0);
}

/* ---------- Klavye: A-E şık, 1-3 güven, Enter devam; kelime kartlarında 1-4 ---------- */

export function installPlayKeys(): void {
  document.addEventListener("keydown", e => {
    if (!PLAY.active || $opt(".overlay") || e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    if (PLAY.mode === "vocab") {
      if (!VOC.done && /^[1-4]$/.test(e.key)) { e.preventDefault(); vocabAnswer(+e.key - 1); }
      else if (VOC.done && e.key === "Enter") { e.preventDefault(); vocabNext(); }
      return;
    }
    const k = e.key.toUpperCase();
    const next = $opt<HTMLButtonElement>("#next");
    if (!PLAY.answered && PLAY.q && isLetter(k) && LETTERS.includes(k) && !PLAY.items[PLAY.idx]?.preset) {
      const b = $opt(`#opts [data-opt="${k}"]`); if (b && b.getAttribute("aria-disabled") !== "true") { e.preventDefault(); b.click(); }
    } else if (!PLAY.answered && PLAY.picked && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); submit((["sure", "unsure", "guess"] as const)[+e.key - 1]!); }
    else if (e.key === "Enter" && next && !next.disabled && document.activeElement === document.body) { e.preventDefault(); next.click(); }
  });
}
