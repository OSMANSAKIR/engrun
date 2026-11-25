/* Antrenman: bölüm ya da etiket seçip hedefli çalışma. */
import { isSection, SEC, SECTIONS } from "../../config/sections";
import { tagName } from "../../config/tags";
import { allAttempts } from "../../core/attempts";
import { POOL } from "../../core/pool";
import { secStats, weakTags } from "../../core/stats";
import { esc } from "../../lib/format";
import { closest } from "../dom";
import { PLAY, startPractice } from "../play";
import { render, UI } from "../shell";

export function screenPractice(): string {
  const atts = allAttempts();
  const st = secStats(atts);
  const tagCount: Record<string, number> = {};
  for (const q of POOL.values()) for (const t of q.tags || []) tagCount[t] = (tagCount[t] || 0) + 1;
  const weakMap: Record<string, number> = Object.fromEntries(weakTags(atts, 999, 1).map(w => [w.tag, w.acc]));
  const tags = Object.keys(tagCount).sort((a, b) => (weakMap[a] ?? 2) - (weakMap[b] ?? 2) || tagCount[b]! - tagCount[a]!);
  const secN = (s: string) => [...POOL.values()].filter(q => q.section === s).length;
  return `
  <h2 class="display" style="font-size:24px">Antrenman</h2>
  <p class="muted">Bir bölüm ya da bir konu seç. Önce hiç çözmediklerin, sonra yanlış yaptıkların gelir. Yanlışlar ~10 soru sonra tekrar sorulur.</p>
  <section class="panel stack">
    <h3>Bölüm</h3>
    <div class="chips">${SECTIONS.filter(s => secN(s)).map(s => { const acc = st[s].acc; return `<button class="chipbtn" data-prsec="${s}" aria-pressed="${UI.prSec === s}">${esc(SEC[s].short)}<small>${acc == null ? secN(s) : "%" + Math.round(acc * 100)}</small></button>`; }).join("")}</div>
    <h3>Konu (etiket) <span class="note">· zayıftan güçlüye</span></h3>
    <div class="chips">${tags.map(t => `<button class="chipbtn" data-prtag="${esc(t)}" aria-pressed="${UI.prTag === t}">${esc(tagName(t))}<small>${weakMap[t] != null ? "%" + Math.round(weakMap[t] * 100) : tagCount[t]}</small></button>`).join("") || `<span class="muted">Etiket yok.</span>`}</div>
    <div class="row"><span class="muted">Soru sayısı</span>${[10, 20, 0].map(n => `<button class="chipbtn" data-prcount="${n}" aria-pressed="${UI.prCount === n}">${n || "Hepsi"}</button>`).join("")}</div>
    <button class="btn primary block" id="prStart" ${UI.prSec || UI.prTag ? "" : "disabled"}>${UI.prSec ? esc(SEC[UI.prSec].short) + " antrenmanı" : UI.prTag ? esc(tagName(UI.prTag)) + " antrenmanı" : "Bölüm ya da konu seç"}</button>
  </section>`;
}

export function installPractice(): void {
  document.addEventListener("click", e => {
    if (UI.screen !== "practice" || PLAY.active) return;
    const s = closest(e, "[data-prsec],[data-prtag],[data-prcount],#prStart");
    if (!s) return;
    if (s.id === "prStart") return startPractice({ section: UI.prSec, tags: UI.prTag ? [UI.prTag] : null, count: UI.prCount });
    const { prsec, prtag, prcount } = s.dataset;
    if (isSection(prsec)) { UI.prSec = UI.prSec === prsec ? null : prsec; UI.prTag = null; }
    if (prtag) { UI.prTag = UI.prTag === prtag ? null : prtag; UI.prSec = null; }
    if (prcount != null) UI.prCount = +prcount;
    render();
  });
}
