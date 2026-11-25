/* Deneme ekranı: seviye testi, yarım/tam deneme, yarım kalan deneme ve geçmiş. */
import { EXAM_NAME } from "../../config/exams";
import { allAttempts } from "../../core/attempts";
import { BOOKLETS, POOL } from "../../core/pool";
import { S, Store } from "../../core/store";
import { esc, fmtHMS, fmtNum } from "../../lib/format";
import type { ExamRecord } from "../../types";
import { closest } from "../dom";
import { clearExamState, loadExamState, resumeExam } from "../exam";
import { confirmBox } from "../modal";
import { render, UI } from "../shell";

export function screenExam(): string {
  const saved = loadExamState();
  const exams = Object.values(Store.runs).filter((r): r is ExamRecord => r.type === "exam").sort((a, b) => b.ts - a.ts);
  const attempted = new Set(allAttempts().map(a => a.qid));
  const freshN = [...POOL.values()].filter(q => !attempted.has(q.id)).length;
  const pts = S().placementTs;
  return `
  <h2 class="display" style="font-size:24px">Deneme</h2>
  <p class="muted">Gerçek sınav gibi: süreli, sessiz, açıklamasız. Soruları atlayabilir, işaretleyip geri dönebilirsin. Bitince puanın /100 ve bölüm dökümü gelir, sonra hatalarını incelersin.</p>
  ${saved ? `<section class="panel stack"><h3>Yarım kalan deneme</h3><p class="muted">${saved.qids.length} soru · ${Object.keys(saved.answers).length} cevaplı · kalan ${fmtHMS(saved.duration - saved.elapsed)}</p><div class="row"><button class="btn primary grow" id="exResume">Devam et</button><button class="btn grow" id="exDrop">Sil</button></div></section>` : ""}
  <section class="panel stack">
    <h3>Seviye testi</h3>
    <p class="muted" style="font-size:14.5px">28 soru, 65 dakika, her bölümden en az bir soru. Bitince tahmini puanını ve hangi bölümlerden başlaman gerektiğini gösterir.${pts ? ` Son seviye testin: ${new Date(pts).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}.` : ""}</p>
    <button class="btn primary block" data-act="exam:placement" ${saved ? "disabled" : ""}>Seviye testine başla</button>
  </section>
  <section class="panel stack">
    <label for="exSrc"><h3>Soru kaynağı</h3></label>
    <select id="exSrc">
      <option value="fresh">Önce hiç çözmediklerim (karışık) · ${freshN} yeni soru</option>
      ${BOOKLETS.map(b => `<option value="b:${esc(b.id)}" ${UI.examSrc === "b:" + b.id ? "selected" : ""}>${esc(b.title)} (${b.count} soru)</option>`).join("")}
    </select>
    <p class="note">Daha önce çözdüğün kitapçıklar puanını yüksek gösterebilir. Gerçek ölçüm için yeni kitapçıkları seç.</p>
    <div class="row">
      <button class="btn primary grow" data-act="exam:half" ${saved ? "disabled" : ""}>Yarım deneme · 40 soru · 90 dk</button>
      <button class="btn cyan grow" data-act="exam:full" ${saved ? "disabled" : ""}>Tam deneme · 80 soru · 180 dk</button>
    </div>
  </section>
  ${exams.length ? `<section class="panel"><h3>Geçmiş denemeler</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Tarih</th><th>Tür</th><th class="n">Doğru</th><th class="n">Puan</th></tr></thead><tbody>${exams.map(r => `<tr><td>${new Date(r.ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</td><td>${(EXAM_NAME[r.kind] || "").replace(" deneme", "")}</td><td class="n">${r.correct}/${r.total}</td><td class="n">${fmtNum(r.score)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}

export function installExamScreen(): void {
  document.addEventListener("change", e => { if (e.target instanceof HTMLSelectElement && e.target.id === "exSrc") UI.examSrc = e.target.value; });
  document.addEventListener("click", async e => {
    if (closest(e, "#exResume")) resumeExam();
    if (closest(e, "#exDrop") && await confirmBox("Yarım kalan deneme silinsin mi?", "Sil")) { clearExamState(); render(); }
  });
}
