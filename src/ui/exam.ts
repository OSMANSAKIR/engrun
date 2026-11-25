/* Deneme modu: sessiz, süreli, açıklamasız. Durum her saniye kaydedilir; sayfa kapansa da kalınan yerden sürer. */
import { Sound } from "../audio/sound";
import { EXAM_MIN, EXAM_NAME, type ExamKind } from "../config/exams";
import { isLetter, SEC, SECTIONS, type Letter, type Section } from "../config/sections";
import { recordAttempt } from "../core/attempts";
import { examSections, goalTarget, REAL, secTarget } from "../core/goal";
import { POOL, Q } from "../core/pool";
import { pickExamQuestions } from "../core/selection";
import { srsAfterAnswer } from "../core/srs";
import { Store } from "../core/store";
import { esc, fmtHMS, fmtNum, pct } from "../lib/format";
import { $, $opt, closest, toast } from "./dom";
import { ICON } from "./icons";
import { applyMarks, lookupSoon, markBtnHtml } from "./marking";
import { confirmBox, modal } from "./modal";
import { startInspect } from "./play";
import { optionsHtml, passageHtml, scrollPassageToBlank, stemHtml } from "./question";
import { bindActions, go, main, setPlaying, UI } from "./shell";

export const EXAM_KEY = "yds.exam.v1";

export interface ExamState {
  kind: ExamKind;
  qids: string[];
  want: number;                         // dağılımın istediği soru sayısı (havuz yetmezse qids daha az olur)
  answers: Record<string, Letter>;
  flags: Record<string, true>;
  times: Record<string, number>;        // soru başına harcanan ms
  idx: number;
  duration: number;                     // ms
  elapsed: number;                      // ms, aralar hariç
  start: number;
}

export const EXAM: { active: boolean; st: ExamState | null; base: number; resumed: number; qT: number; timer: ReturnType<typeof setInterval> | undefined } =
  { active: false, st: null, base: 0, resumed: 0, qT: 0, timer: undefined };

export function loadExamState(): ExamState | null {
  try {
    const s = JSON.parse(localStorage.getItem(EXAM_KEY) || "null") as ExamState | null;
    return s && Array.isArray(s.qids) && s.qids.every(id => POOL.has(id)) ? s : null;
  } catch { return null; }
}
function saveExamState(): void { try { localStorage.setItem(EXAM_KEY, JSON.stringify(EXAM.st)); } catch { /* depolama kapalı */ } }
export function clearExamState(): void { try { localStorage.removeItem(EXAM_KEY); } catch { /* depolama kapalı */ } }

export function startExam(kind: ExamKind, src: string): void {
  if (loadExamState()) return toast("Önce yarım kalan denemeyi bitir ya da sil.");
  const { qids, want } = pickExamQuestions(kind, kind === "placement" ? "fresh" : src);
  if (!qids.length) return toast("Deneme için soru bulunamadı.");
  const minutes = EXAM_MIN[kind] * Math.min(1, qids.length / want);
  const st: ExamState = { kind, qids, want, answers: {}, flags: {}, times: {}, idx: 0, duration: Math.max(10, Math.round(minutes)) * 60000, elapsed: 0, start: Date.now() };
  EXAM.st = st;
  if (qids.length < want) toast(`Havuzda ${qids.length} uygun soru var; süre buna göre ${Math.round(st.duration / 60000)} dk.`, 4000);
  saveExamState(); openExam();
}

export function resumeExam(): void { const s = loadExamState(); if (!s) return; EXAM.st = s; openExam(); }

function openExam(): void {
  if (!EXAM.st) return;
  EXAM.active = true; setPlaying(true);
  Sound.examMute = true; Sound.sync();
  EXAM.base = EXAM.st.elapsed; EXAM.resumed = Date.now(); EXAM.qT = Date.now();
  clearInterval(EXAM.timer);
  EXAM.timer = setInterval(examTick, 1000);
  renderExamQ();
}

const examRemaining = (st: ExamState): number => st.duration - (EXAM.base + (Date.now() - EXAM.resumed));

function examTick(): void {
  const st = EXAM.st;
  if (!EXAM.active || !st) return clearInterval(EXAM.timer);
  st.elapsed = EXAM.base + (Date.now() - EXAM.resumed);
  const rem = examRemaining(st); const t = $opt("#etimer");
  if (t) { t.textContent = fmtHMS(rem); t.classList.toggle("low", rem < 5 * 60000); }
  saveExamState();
  if (rem <= 0) finishExam(true);
}

// Ekrandaki soruda geçen süreyi o soruya yazar.
function examTrack(st: ExamState): void {
  const id = st.qids[st.idx]!;
  st.times[id] = (st.times[id] || 0) + (Date.now() - EXAM.qT); EXAM.qT = Date.now();
}

function renderExamQ(): void {
  const st = EXAM.st; if (!st) return;
  const q = Q(st.qids[st.idx]!); const N = st.qids.length;
  main.innerHTML = `<div class="ebar"><div class="wrap">
      <button class="iconbtn" id="exExit" aria-label="Denemeye ara ver">${ICON.pause}</button>
      <div class="grow"><div class="eyebrow">${EXAM_NAME[st.kind]}</div><b class="mono">${st.idx + 1} / ${N}</b> <span class="note">· ${Object.keys(st.answers).length} cevaplı</span></div>
      <span class="etimer" id="etimer">${fmtHMS(examRemaining(st))}</span>
      <button class="btn small primary" id="exFinish">Bitir</button>
    </div></div>
    <div class="wrap play">
      ${q.passage ? passageHtml(q, null) : ""}
      <article class="qcard">
        <div class="qmeta"><span class="eyebrow">Soru ${st.idx + 1} · ${esc(SEC[q.section].short)}</span>${st.flags[q.id] ? `<span class="tag" style="color:var(--flame)">işaretli</span>` : ""}</div>
        <div class="stem">${stemHtml(q, null)}</div>
        <div class="opts" id="exOpts">${optionsHtml(q, { picked: st.answers[q.id] })}</div>
        <div class="qtools">${markBtnHtml()}${st.answers[q.id] ? `<button class="btn small" id="exClear">Cevabı sil</button>` : ""}<span class="note" id="markNote"></span></div>
      </article>
    </div>
    <div class="actionbar"><div class="wrap">
      <button class="btn" id="exPrev" ${st.idx ? "" : "disabled"} aria-label="Önceki soru">◀</button>
      <button class="btn" id="exFlag">${st.flags[q.id] ? "İşareti kaldır" : "İşaretle"}</button>
      <button class="btn" id="exGrid">Liste</button>
      <button class="btn primary" id="exNext" ${st.idx + 1 < N ? "" : "disabled"} aria-label="Sonraki soru">▶</button>
    </div></div>`;
  applyMarks(); scrollPassageToBlank(); window.scrollTo(0, 0);
  $("#exOpts").onclick = e => {
    const b = closest(e, "[data-opt]"); const L = b?.dataset.opt; if (!isLetter(L)) return;
    if (st.answers[q.id] === L) delete st.answers[q.id]; else st.answers[q.id] = L;   // aynı şıkka tekrar dokunmak cevabı siler
    saveExamState(); renderExamQ();
  };
  const clr = $opt("#exClear"); if (clr) clr.onclick = () => { delete st.answers[q.id]; saveExamState(); renderExamQ(); };
  $("#exPrev").onclick = () => examGo(st.idx - 1);
  $("#exNext").onclick = () => examGo(st.idx + 1);
  $("#exFlag").onclick = () => { if (st.flags[q.id]) delete st.flags[q.id]; else st.flags[q.id] = true; saveExamState(); renderExamQ(); };
  $("#exGrid").onclick = examGrid;
  $("#exFinish").onclick = async () => {
    const blank = N - Object.keys(st.answers).length, fl = Object.keys(st.flags).length;
    if (await confirmBox(`Denemeyi bitirmek istiyor musun?${blank ? ` ${blank} boş soru var.` : ""}${fl ? ` ${fl} işaretli soru var.` : ""}`, "Bitir", "Devam et")) finishExam(false);
  };
  $("#exExit").onclick = async () => {
    if (await confirmBox("Ara vermek istiyor musun? Süre durur; Deneme ekranından devam edebilirsin.", "Ara ver", "Devam et")) {
      examTrack(st); st.elapsed = EXAM.base + (Date.now() - EXAM.resumed); saveExamState();
      EXAM.active = false; clearInterval(EXAM.timer); Sound.examMute = false; go("exam");
    }
  };
}

function examGo(i: number): void {
  const st = EXAM.st; if (!st || i < 0 || i >= st.qids.length) return;
  examTrack(st); st.idx = i; saveExamState(); renderExamQ();
}

function examGrid(): void {
  const st = EXAM.st; if (!st) return;
  const m = modal(`<h2>Sorular</h2><p class="note">Mavi: cevaplı · turuncu nokta: işaretli · çerçeve: şu anki</p>
    <div class="egrid">${st.qids.map((id, i) => `<button data-i="${i}" class="${st.answers[id] ? "ans" : ""} ${st.flags[id] ? "flag" : ""} ${i === st.idx ? "cur" : ""}">${i + 1}</button>`).join("")}</div>
    <button class="btn block" data-close>Kapat</button>`);
  $(".egrid", m.el).onclick = e => { const b = closest(e, "[data-i]"); if (!b) return; m.close(); examGo(Number(b.dataset.i)); };
}

// Seviye testi raporu: bölüm başarılarını gerçek sınavdaki soru sayılarıyla tartıp tahmini puan çıkarır,
// en zayıf bölümleri sıralar ve oradan antrenmana başlatır.
type ByCounts = Partial<Record<Section, [number, number]>>;
function placementHtml(by: ByCounts, correct: number, total: number): string {
  const avg = total ? correct / total : 0;
  const acc = (s: Section) => { const x = by[s]; return x ? x[0] / x[1] : null; };
  let est = 0;
  for (const s of examSections()) est += (acc(s) ?? avg) * REAL(s) * 1.25;
  const rows = examSections().flatMap(s => { const a = acc(s); return a == null ? [] : [{ s, acc: a, n: by[s]![1], gain: (1 - a) * REAL(s) }]; })
    .sort((a, b) => b.gain - a.gain || a.acc - b.acc);   // sınavda en çok soru kaybettiren bölüm önce
  const weak = rows.filter(r => r.acc < (secTarget(r.s) ?? .75)).slice(0, 3);
  return `<section class="panel stack" style="width:100%;text-align:left">
    <h3>Seviye profilin</h3>
    <p>Bu sonuçla gerçek sınavda tahmini puanın <b style="color:var(--gold)">${Math.round(est)}</b> civarında. ${total < 40 ? "28 soruluk bir test kaba bir ölçüm; birkaç gün çözdükçe tahmin netleşir." : ""}</p>
    ${weak.length ? `<p class="muted">Önce şu bölümlerden başla. Hem en çok zorlandığın hem de sınavda en çok puan getiren yerler:</p>
    <div class="stack" style="gap:8px">${weak.map(r => `<div class="weak"><span><b>${esc(SEC[r.s].tr)}</b> · %${Math.round(r.acc * 100)} (${r.n} soru)</span><button class="btn small cyan" data-act="practice:${r.s}">Antrenman</button><span class="note" style="grid-column:1/-1">Sınavda ~${Math.round(r.gain)} / ${REAL(r.s)} soru kaybettiriyor</span></div>`).join("")}</div>`
    : `<p class="muted">Bütün bölümlerde iyisin. Koşuya ve denemelere geçebilirsin.</p>`}
  </section>`;
}

function finishExam(auto: boolean): void {
  const st = EXAM.st;
  if (!EXAM.active || !st) return;
  examTrack(st);
  EXAM.active = false; clearInterval(EXAM.timer);
  const by: ByCounts = {}; let correct = 0, blank = 0;
  for (const id of st.qids) {
    const q = Q(id); const ch = st.answers[id] || null;
    const a = recordAttempt(q, ch, null, st.times[id] || 0, "exam");
    if (!ch) blank++;
    if (a.correct) correct++; else srsAfterAnswer(q, false, null);
    const b = by[q.section] ??= [0, 0]; b[1]++; if (a.correct) b[0]++;
  }
  const per = 100 / st.want;
  const score = Math.round(correct * per * 100) / 100;
  const used = Math.min(st.duration, EXAM.base + (Date.now() - EXAM.resumed));
  if (st.kind === "placement") Store.setSettings({ placementTs: Date.now() });
  Store.put("runs", "exam-" + Date.now(), { type: "exam", kind: st.kind, ts: Date.now(), total: st.qids.length, correct, blank, score, by, usedMs: used });
  clearExamState();
  Sound.examMute = false;
  lookupSoon(0);
  const wrong = st.qids.filter(id => st.answers[id] !== Q(id).answer).map(id => ({ qid: id, chosen: st.answers[id] || null }));
  UI.screen = "exam";
  const tg = goalTarget();
  main.innerHTML = `<div class="wrap"><div class="reward">
    <p class="eyebrow">${auto ? "Süre doldu" : "Bitti"} · ${EXAM_NAME[st.kind]}</p>
    <div class="score" style="color:${tg && score >= tg ? "var(--good)" : "var(--gold)"}">${fmtNum(score)}<span class="muted" style="font-size:22px"> / 100</span></div>
    <p class="muted">${correct} doğru · ${st.qids.length - correct - blank} yanlış · ${blank} boş · ${fmtHMS(used)} kullanıldı${st.want !== st.qids.length ? ` · ${st.qids.length}/${st.want} soru mevcuttu` : ""}</p>
    <p class="muted">Her doğru ${fmtNum(per)} puan.${!tg ? "" : score >= tg ? ` Hedefin ${tg}'in üstündesin!` : ` ${tg} için ${Math.max(0, Math.ceil(tg / per) - correct)} doğru daha gerekiyordu.`}</p>
    ${st.kind === "placement" ? placementHtml(by, correct, st.qids.length) : ""}
    <section class="panel" style="width:100%;text-align:left"><h3>Bölüm dökümü</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Bölüm</th><th class="n">Doğru</th><th class="n">%</th></tr></thead><tbody>
      ${SECTIONS.flatMap(s => { const b = by[s]; return b ? [`<tr><td>${esc(SEC[s].tr)}</td><td class="n">${b[0]}/${b[1]}</td><td class="n">${pct(b[0], b[1])}</td></tr>`] : []; }).join("")}
    </tbody></table></div></section>
  </div></div>
  <div class="actionbar"><div class="wrap">${wrong.length ? `<button class="btn primary" id="exRev">Hataları incele (${wrong.length})</button>` : ""}<button class="btn" id="exHome">Tamam</button></div></div>`;
  window.scrollTo(0, 0);
  bindActions(main);
  const rev = $opt("#exRev"); if (rev) rev.onclick = () => startInspect(wrong, "Deneme incelemesi");
  $("#exHome").onclick = () => go("exam");
}
