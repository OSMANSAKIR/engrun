/* Hedef sınav, tarih, hedef puan ve günlük süre seçimi. */
import { Sound } from "../audio/sound";
import { DAILY_MIN, EXAM_CALENDAR, EXAM_TYPES, TARGET_CHIPS, type ExamId, type FieldId } from "../config/exams";
import { G, targetNote } from "../core/goal";
import { bump, S, Store } from "../core/store";
import { clamp, esc, fmtDay } from "../lib/format";
import { dayKey, parseDay, startOfDay } from "../lib/time";
import { $, $$, closest } from "./dom";
import { modal } from "./modal";
import { render } from "./shell";

interface Draft { exam: ExamId | null; field: FieldId | null; date: string | null; target: number | null; minutes: number }

export function openGoal(first: boolean): void {
  const cur = G();
  const st: Draft = { exam: cur?.exam || null, field: cur?.field || null, date: cur?.date || null, target: cur?.target || null, minutes: cur?.minutes || 60 };
  const m = modal(`<div class="goalbox" id="goalBox"></div>`, { onClose: () => { if (!S().goalAsked) Store.setSettings({ goalAsked: true }); } });
  const box = $("#goalBox", m.el);
  const today = startOfDay();
  const dates = () => EXAM_CALENDAR.filter(c => c.exam === st.exam && parseDay(c.date) >= today && (!c.field || !st.field || c.field === st.field));
  const draw = () => {
    const list = dates(); const custom = st.date && !list.some(c => c.date === st.date);
    box.innerHTML = `
      <h2>${first ? "Hangi sınava hazırlanıyorsun?" : "Sınav ve hedef"}</h2>
      ${first ? `<p class="muted" style="margin-top:-6px">Seçimine göre bölüm ağırlıkları, denemeler ve günlük yol haritan ayarlanır. Sonra Ayarlar'dan değiştirebilirsin.</p>` : ""}
      <div class="goalpick" role="radiogroup" aria-label="Sınav">${Object.entries(EXAM_TYPES).map(([k, x]) => `<button class="gx" role="radio" data-gx="${k}" aria-checked="${st.exam === k}"><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></button>`).join("")}</div>
      ${st.exam === "yokdil" ? `<p class="lbl">Alan</p><div class="chips">${Object.entries(EXAM_TYPES.yokdil.fields ?? {}).map(([k, l]) => `<button class="chipbtn" data-gf="${k}" aria-pressed="${st.field === k}">${esc(l)}</button>`).join("")}</div>
        <p class="note">Paragraflı sorularda seçtiğin alanın metinleri öne alınır; diğer sorular ortaktır.</p>` : ""}
      ${st.exam ? `<p class="lbl">Sınav tarihi</p>
        <div class="chips">${list.map(c => `<button class="chipbtn" data-gd="${c.date}" aria-pressed="${st.date === c.date}">${esc(c.label)}<small>${esc(fmtDay(parseDay(c.date), { day: "numeric", month: "short", year: "numeric" }))}</small></button>`).join("")}
          <button class="chipbtn" data-gd="" aria-pressed="${!st.date}">Henüz belli değil</button></div>
        <div class="row" style="align-items:center"><label for="gDate" class="note">Listede yoksa tarih gir:</label><input type="date" id="gDate" min="${dayKey()}" value="${custom ? st.date : ""}"></div>
        <p class="note">Tarihler ÖSYM'nin 2026-2027 takviminden. Takvim değişebilir; başvurudan önce osym.gov.tr'den kontrol et.</p>
        <div class="two">
          <label><span class="lbl">Hedef puan</span><input type="number" id="gTarget" min="30" max="100" step="1" inputmode="numeric" placeholder="ör. 65" value="${st.target || ""}">
            <span class="chips tchips" aria-label="Hızlı hedef seçimi">${TARGET_CHIPS.map(v => `<button class="chipbtn" data-gt="${v}" aria-pressed="${st.target === v}">${v}</button>`).join("")}</span></label>
          <label><span class="lbl">Günlük süre</span><select id="gMin">${DAILY_MIN.map(t => `<option value="${t}" ${st.minutes === t ? "selected" : ""}>${t === 120 ? "2 saat ve üstü" : t + " dk"}</option>`).join("")}</select></label>
        </div>
        <p class="note" id="gTargetNote">${targetNote(st.target)}</p>
        <button class="btn primary block" id="gSave">${G() ? "Kaydet" : "Yol haritamı oluştur"}</button>` : ""}
      <button class="btn block" data-gclose>${first ? "Sonra seçerim" : "Vazgeç"}</button>`;
  };
  box.addEventListener("click", e => {
    const t = closest(e, "button"); if (!t) return;
    const d = t.dataset;
    if (d.gx) { const ex = d.gx as ExamId; if (st.exam !== ex) { st.exam = ex; st.field = null; if (st.date && !dates().some(c => c.date === st.date)) st.date = null; } draw(); }
    else if (d.gf) { st.field = d.gf as FieldId; const c = EXAM_CALENDAR.find(x => x.date === st.date); if (c && c.field && c.field !== st.field) st.date = null; draw(); }
    else if (d.gd !== undefined) { st.date = d.gd || null; if (st.date) { const c = dates().find(x => x.date === st.date); if (c && c.field) st.field = c.field; } draw(); }
    else if (d.gt) { st.target = +d.gt; draw(); }
    else if (t.id === "gSave") {
      if (!st.exam) return;
      if (!st.target) {
        const n = $("#gTargetNote", box); n.textContent = "Önce hedef puanını yaz ya da seç: okulunun, işinin ya da kendinin istediği puan."; n.classList.add("warn");
        $("#gTarget", box).focus(); return;
      }
      const c = st.date ? EXAM_CALENDAR.find(x => x.date === st.date && x.exam === st.exam) : undefined;
      const x = EXAM_TYPES[st.exam];
      const label = c ? c.label : x.name + (st.field && x.fields ? " · " + x.fields[st.field].replace(" Bilimleri", "") : "");
      const same = cur?.exam === st.exam && cur?.date === st.date;
      Store.setSettings({ goal: { exam: st.exam, field: st.field, date: st.date, label, target: st.target, minutes: st.minutes, start: same && cur?.start ? cur.start : dayKey() }, goalAsked: true });
      m.close(); bump(); render(); Sound.correct(0);
    }
    else if (d.gclose !== undefined) m.close();
  });
  box.addEventListener("change", e => {
    const t = e.target as HTMLInputElement;
    if (t.id === "gDate" && t.value) { st.date = t.value; draw(); }
    if (t.id === "gTarget") {
      // Yeniden çizmeden güncelle: yazıp hemen Kaydet'e basınca tıklama kaybolmasın.
      const v = Math.round(+t.value); st.target = v ? clamp(v, 30, 100) : null;
      if (st.target && st.target !== +t.value) t.value = String(st.target);
      const n = $("#gTargetNote", box); n.textContent = targetNote(st.target); n.classList.remove("warn");
      $$("[data-gt]", box).forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.gt) === st.target)));
    }
    if (t.id === "gMin") st.minutes = +t.value;
  });
  draw();
}
