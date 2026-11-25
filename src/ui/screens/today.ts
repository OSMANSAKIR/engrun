/* Bugün: geri sayım, tahmini puan, günün görevleri, yol haritası ve en zayıf konular. */
import { Sound } from "../../audio/sound";
import { tagName } from "../../config/tags";
import { allAttempts } from "../../core/attempts";
import { daysLeft, examType, G, goalTarget } from "../../core/goal";
import { planDays, planEntry, type PlanEntry } from "../../core/planner";
import { dueQuestions, srsBoxes } from "../../core/srs";
import { predicted, streakDays, weakTags, type WeakTag } from "../../core/stats";
import { S, Store } from "../../core/store";
import { vocabDeckInfo } from "../../core/vocab";
import { clamp, esc, fmtDay } from "../../lib/format";
import { DAY, dayKey, parseDay, startOfDay } from "../../lib/time";
import { closest } from "../dom";
import { ICON } from "../icons";
import { UI } from "../shell";

interface Task { t: string; d: string; acts: PlanEntry["acts"] }

export const weakRowsHtml = (weak: readonly WeakTag[]): string =>
  weak.map(w => `<div class="weak"><span><b>${esc(tagName(w.tag))}</b></span><span class="mono muted">%${Math.round(w.acc * 100)} · ${w.n}</span><div class="bar"><i style="width:${Math.max(3, Math.round(w.acc * 100))}%"></i></div></div>`).join("");

export function screenToday(): string {
  const atts = allAttempts(); const p = predicted(atts);
  const g = G(); const days = daysLeft(); const target = goalTarget();
  const key = dayKey();
  const pe = planDays(1)[0]!; const plan = planEntry(pe);
  const mins = g?.minutes || 60; const part = (r: number) => Math.max(5, Math.round(mins * r / 5) * 5);
  const st = streakDays(); const due = dueQuestions().length; const red = srsBoxes().red;
  const weak = weakTags(atts, 3);
  const todayAtt = Object.values(Store.attempts).filter(a => a.ts >= startOfDay());
  const todayWrong = todayAtt.filter(a => !a.correct).length;
  const checks = S().dayChecks?.[key] || [false, false, false, false];
  const vd = vocabDeckInfo();
  const score = p.score;
  const gw = score == null ? 0 : clamp(score, 0, 100);
  // Günlük süre görevlere bölünür: ~%17 tekrar, ~%62 ana blok, ~%13 kelime, ~%8 hataların üstünden geçme.
  // Deneme günlerinde ana blok denemenin kendisidir.
  const review: Task = { t: `${part(.17)} dk · Tekrar Destesi`, d: due ? `${due} soru vadesi geldi${red ? `, ${red} tanesi kırmızı` : ""}.` : "Vadesi gelen soru yok; yeni hata yaptıkça dolar.", acts: [["Desteyi aç", "review"]] };
  const words: Task = { t: `${part(.13)} dk · Kelime kartları`, d: `${vd.due} tekrar, ${vd.fresh} yeni kelime hazır.`, acts: [["Kartları aç", "vocab"]] };
  const errs: Task = { t: `${part(.08)} dk · Bugünün hataları`, d: todayWrong ? `Bugün ${todayWrong} yanlışın var. Açıklamalara son kez bak.` : "Bugün henüz yanlış yok.", acts: todayWrong ? [["Hataları incele", "todaywrong"]] : [] };
  const mainTask: Task = { t: `${plan.exam || part(.62)} dk · ${plan.title}`, d: plan.text, acts: plan.acts };
  const tasks = pe.kind === "after" || pe.kind === "exam" ? [mainTask]
    : plan.exam ? [mainTask, errs]
    : pe.kind === "red" || pe.kind === "eve" || pe.kind === "light" ? [{ ...mainTask, t: `${mins} dk · ${plan.title}` }, words]
    : mins < 60 ? [mainTask, words] : [review, mainTask, words, errs];
  return `
  <section class="hero">
    <div>
      <p class="eyebrow">${g ? esc(g.label) + (g.date ? " · " + esc(fmtDay(parseDay(g.date))) : "") : "Hedef sınav seçilmedi"}</p>
      ${days == null ? `<div class="big" style="font-size:40px">${esc(examType().name)}</div><p class="sub">${g ? "tarih seçilmedi" : "sınavını ve tarihini seç"} · <button class="btn small" data-act="goal" style="vertical-align:middle">${g ? "Tarih seç" : "Seç"}</button></p>`
        : days > 0 ? `<div class="big">${days}<span>GÜN</span></div><p class="sub">sınava kaldı</p>` : days === 0 ? `<div class="big" style="font-size:44px">BUGÜN</div><p class="sub">Sınav günü. Sakin kal, stratejine güven.</p>` : `<div class="big" style="font-size:40px">BİTTİ</div><p class="sub">Sınav geride kaldı.</p>`}
    </div>
    <div class="predict">
      <p class="eyebrow">Tahmini puan</p>
      <div class="num">${score == null ? "—" : score}</div>
      <p class="note">${target ? `hedef ${target}${score != null && score < target ? ` · ~${Math.ceil((target - score) / 1.25)} doğru daha` : ""}` : `hedef yok · <button class="linkbtn" data-act="goal">belirle</button>`}${p.missing ? ` · ${p.missing} bölüm verisiz` : ""}</p>
    </div>
    <div class="gauge" role="img" aria-label="Tahmini puan ${score ?? "yok"}${target ? ", hedef " + target : ""}"><i style="width:${gw}%"></i>${target ? `<b style="left:${target}%"></b>` : ""}</div>
    <div class="gauge-labels"><span>0</span>${target ? `<span style="position:absolute;left:${target}%;transform:translateX(-50%)">${target}</span>` : ""}<span>100</span></div>
  </section>
  <div class="stats3">
    <div class="stat"><div class="v" style="display:flex;align-items:center;gap:4px">${ICON.flame}${st.n}</div><div class="l">${st.n ? "gün üst üste" : "seri yok"}${st.n && !st.today ? " · bugün çöz!" : ""}</div></div>
    <div class="stat"><div class="v">${todayAtt.length}</div><div class="l">bugün çözülen</div></div>
    <div class="stat"><div class="v">${due}</div><div class="l">vadesi gelen tekrar</div></div>
  </div>
  <section class="panel">
    <div class="section-title"><h3>Bugün · ${esc(plan.title)}</h3><span class="eyebrow">${mins >= 120 ? "2+ saat" : mins + " dk"}</span></div>
    <div style="margin-top:6px">${tasks.map((t, i) => `
      <div class="task ${checks[i] ? "done" : ""}">
        <input type="checkbox" id="task${i}" data-task="${i}" ${checks[i] ? "checked" : ""} aria-label="${esc(t.t)} tamamlandı">
        <div><label class="t" for="task${i}">${esc(t.t)}</label><p class="d">${esc(t.d)}</p>
        ${t.acts.length ? `<div class="acts">${t.acts.map(([l, a]) => `<button class="btn small cyan" data-act="${a}">${esc(l)}</button>`).join("")}</div>` : ""}</div>
      </div>`).join("")}</div>
  </section>
  ${roadmapHtml()}
  <section class="panel">
    <div class="section-title"><h3>En zayıf 3 konun</h3><button class="btn small" data-act="practice:weak" ${weak.length ? "" : "disabled"}>Antrenman</button></div>
    <div style="margin-top:6px">${weak.length ? weakRowsHtml(weak) : `<p class="muted" style="padding-top:6px">Birkaç soru çözünce burada zayıf konuların görünecek.</p>`}</div>
  </section>
  <div class="row"><button class="btn primary grow" data-act="run:${UI.runStart}">Koşuya başla</button><button class="btn grow" data-act="strategy">Strateji kartları</button></div>`;
}

function roadmapHtml(): string {
  const L = daysLeft(); const days = planDays(8); const g = G();
  const d = (k: number) => fmtDay(startOfDay() + k * DAY, { day: "numeric", month: "short" });
  const ph: [string, string, string][] = [];
  if (L != null && L > 0) {
    if (L > 35) ph.push(["Temel", `bugün → ${d(L - 36)}`, "Zayıf bölümler sırayla; haftada bir yarım deneme ve bir hafif gün."]);
    if (L > 14) ph.push(["Deneme ağırlıklı", `${L > 35 ? d(L - 35) : "bugün"} → ${d(L - 15)}`, "4 günde bir yarım deneme, arada hedefli antrenman."]);
    ph.push(["Son düzlük", `${L > 14 ? d(L - 14) : "bugün"} → ${d(L - 1)}`, "Tam denemeler, kırmızı deste; son gün yeni konu yok."]);
    ph.push(["Sınav", d(L), esc(g?.label)]);
  }
  return `<section class="panel">
    <div class="section-title"><h3>Yol haritası</h3><button class="btn small" data-act="goal">Hedefi değiştir</button></div>
    ${ph.length ? `<div class="phases">${ph.map((p, i) => `<div class="phase ${i === 0 ? "now" : ""}"><i></i><b>${p[0]} <span>· ${p[1]}</span></b><span>${p[2]}</span></div>`).join("")}</div>`
      : `<p class="muted" style="font-size:14px">${L != null && L < 0 ? "Sınav tarihi geçti." : "Sınav tarihi seçmedin; haftalık döngü: 5 odak günü, 1 yarım deneme, 1 hafif gün."}</p>`}
    <ul class="week">${days.map((e, k) => { const p = planEntry(e); return `<li class="${k === 0 ? "today" : ""} ${p.exam || e.kind === "exam" ? "big" : ""}"><span class="d">${k === 0 ? "Bugün" : k === 1 ? "Yarın" : esc(fmtDay(e.day, { weekday: "short", day: "numeric", month: "short" }))}</span><span>${esc(p.short)}</span></li>`; }).join("")}</ul>
    <p class="note" style="margin-top:8px">Plan her gün sonuçlarına göre yeniden hesaplanır: zayıf olduğun ve uzun süredir çalışmadığın bölümler öne gelir.</p>
  </section>`;
}

/** Görev kutucukları: işaretler güne göre saklanır. */
export function installToday(): void {
  document.addEventListener("change", e => {
    const t = closest<HTMLInputElement>(e, "[data-task]");
    if (!t) return;
    const key = dayKey(); const all = { ...(S().dayChecks || {}) };
    const arr = (all[key] || [false, false, false, false]).slice(); arr[Number(t.dataset.task)] = t.checked; all[key] = arr;
    Store.setSettings({ dayChecks: all });
    t.closest(".task")?.classList.toggle("done", t.checked);
    if (t.checked) Sound.tick(3);
  });
}
