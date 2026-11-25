/* Koşu: başlangıç kapısı seçimi, jokerler ve son koşular. */
import { isSection, SEC, SECTIONS } from "../../config/sections";
import { POOL } from "../../core/pool";
import { jokerProgress } from "../../core/stats";
import { S, Store } from "../../core/store";
import { esc, fmtSec, pct } from "../../lib/format";
import type { RunRecord } from "../../types";
import { closest } from "../dom";
import { ICON } from "../icons";
import { PLAY } from "../play";
import { render, UI } from "../shell";

export function screenRun(): string {
  const avail = SECTIONS.filter(s => [...POOL.values()].some(q => q.section === s));
  if (!avail.includes(UI.runStart) && avail[0]) UI.runStart = avail[0];
  const badges = S().badges || {};
  const jp = jokerProgress();
  const runs = Object.values(Store.runs).filter((r): r is RunRecord => r.type === "run").sort((a, b) => b.ts - a.ts);
  const best = runs.reduce((m, r) => Math.max(m, r.score || 0), 0);
  return `
  <div class="section-title"><h2 class="display" style="font-size:24px">Koşu</h2><span class="muted">En iyi: <b class="mono">${best}</b></span></div>
  <p class="muted">YDS sırasıyla kapı kapı ilerle. Her kapıda hedef puana ulaş; 5 kalbin var. Başlangıç kapısını seç:</p>
  <div class="gates">${SECTIONS.map((s, i) => { const b = badges[s]; return `
    <button class="gate" data-gate="${s}" aria-pressed="${UI.runStart === s}" ${avail.includes(s) ? "" : "disabled"}>
      ${b ? ICON.medal(b) : ""}
      <span class="n">KAPI ${i + 1}</span><span class="nm">${esc(SEC[s].short)}</span><span class="ch">${SEC[s].chips} çip · par ${fmtSec(SEC[s].par)}</span>
    </button>`; }).join("")}</div>
  <button class="btn primary block" data-act="run:${UI.runStart}">${esc(SEC[UI.runStart].short)} kapısından başla</button>
  <section class="stack" style="gap:10px">
    <div class="section-title"><h3>Jokerler</h3><span class="note">Ustalaştıkça açılır · en fazla 3 slot</span></div>
    <div class="jokers">
      <div class="jcard flip"><div class="in"><div class="face back"></div><div class="face front"><span class="jn">Eleme Kartı</span><span class="jd">Cevaplamadan önce 2 şıkkı karart. İkisi de yanlışsa +0,5 çarpan. Koşu başına 2, altın kapıda +1.</span></div></div></div>
      ${jp.map(j => `<div class="jcard ${j.unlocked ? "flip" : ""}" data-joker="${j.id}"><div class="in">
        <div class="face back"><span class="jn">${esc(j.name)}</span><span class="jd">Kilitli: ${j.need} ${esc(j.label)}.</span><div class="prog"><i style="width:${pct(j.have, j.need)}%"></i></div><span class="note mono">${Math.min(j.have, j.need)}/${j.need}</span></div>
        <div class="face front"><span class="jn">${esc(j.name)}</span><span class="jd">${esc(j.desc)}</span><span class="note" style="margin-top:auto">Açık</span></div>
      </div></div>`).join("")}
    </div>
  </section>
  <section class="panel">
    <h3>Puan nasıl hesaplanır?</h3>
    <p class="muted" style="margin-top:6px;font-size:14.5px">Puan = <b style="color:var(--chip)">Çip</b> × <b style="color:var(--mult)">Çarpan</b>. Her ardışık doğru çarpana +0,25 ekler (en fazla ×3). Par süre altında cevap +0,5. "Eminim" deyip doğru bilirsen ×1,5. Kapıyı %80+ ile geçersen 1 kalp geri gelir.</p>
  </section>
  ${runs.length ? `<section class="panel"><h3>Son koşular</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Tarih</th><th>Kapı</th><th class="n">Doğru</th><th class="n">Puan</th></tr></thead><tbody>${runs.slice(0, 6).map(r => `<tr><td>${new Date(r.ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${new Date(r.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</td><td>${r.passed}/${r.gates}</td><td class="n">${r.correct}/${r.total}</td><td class="n">${r.score}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}

export function installRun(): void {
  document.addEventListener("click", e => {
    const g = closest(e, "[data-gate]");
    if (g && UI.screen === "run" && !PLAY.active && isSection(g.dataset.gate)) { UI.runStart = g.dataset.gate; render(); }
  });
}
