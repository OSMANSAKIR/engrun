/* Ayarlar penceresi ve (isteğe bağlı) Anthropic API anahtarı kutusu. */
import { Sound } from "../audio/sound";
import { AI, AI_MODELS, aiErr, aiText, hasSample } from "../core/ai";
import { G, goalTarget } from "../core/goal";
import { BOOKLETS, POOL } from "../core/pool";
import { LS_KEY, S, Store } from "../core/store";
import { esc, fmtDay } from "../lib/format";
import { parseDay } from "../lib/time";
import type { Settings } from "../types";
import { refreshAiBox } from "./ai-panel";
import { $, $opt } from "./dom";
import { EXAM_KEY } from "./exam";
import { openGoal } from "./goal-modal";
import { confirmBox, modal } from "./modal";
import { applyTheme } from "./shell";

export function openSettings(): void {
  const s = S(); const g = G(); const tg = goalTarget();
  const m = modal(`
    <h2>Ayarlar</h2>
    <div>
      <div class="setrow"><label for="setMusic"><b>Müzik</b><br><span class="note">Okuma ve çeviri kapılarında otomatik %30'a kısılır, denemede kapalı.</span></label><span class="switch"><input type="checkbox" id="setMusic" ${s.music ? "checked" : ""}><span></span></span></div>
      <div class="setrow"><label for="setSfx"><b>Efektler</b></label><span class="switch"><input type="checkbox" id="setSfx" ${s.sfx ? "checked" : ""}><span></span></span></div>
      <div class="setrow"><label for="setVol"><b>Ses düzeyi</b></label><input type="range" id="setVol" min="0" max="1" step="0.05" value="${s.volume}"></div>
      <div class="setrow"><label for="setVib"><b>Titreşim</b><br><span class="note">Android'de doğru/yanlışta kısa titreşim.</span></label><span class="switch"><input type="checkbox" id="setVib" ${s.vibrate !== false ? "checked" : ""}><span></span></span></div>
      <div class="setrow"><label for="setTheme"><b>Tema</b></label><select id="setTheme"><option value="auto">Sistem</option><option value="dark">Koyu</option><option value="light">Açık</option></select></div>
    </div>
    <div class="setrow"><span><b>Sınav ve hedef</b><br><span class="note">${g ? `${esc(g.label)}${g.date ? " · " + esc(fmtDay(parseDay(g.date), { day: "numeric", month: "long", year: "numeric" })) : ""}${tg ? " · hedef " + tg : " · hedef yok"}` : "Seçilmedi"}</span></span><button class="btn small" id="setGoal">Değiştir</button></div>
    ${keyBoxHtml()}
    <p class="note">Kayıt: ${Store.status === "cloud" ? "bulutta (telefon ve bilgisayarda aynı)" : "bu tarayıcıda (yerel)"} · ${POOL.size} soru, ${BOOKLETS.length} kitapçık${Store.dirty.size && Store.status === "cloud" ? ` · ${Store.dirty.size} kayıt eşitleniyor` : ""}</p>
    <div class="row"><button class="btn small" id="setReset">Bu cihazdaki önbelleği temizle</button></div>
    <button class="btn primary block" data-close>Tamam</button>`);
  const el = m.el;
  const input = (id: string) => $<HTMLInputElement>(id, el);
  const theme = $<HTMLSelectElement>("#setTheme", el);
  theme.value = s.theme || "auto";
  const music = input("#setMusic"), sfx = input("#setSfx"), vol = input("#setVol"), vib = input("#setVib");
  music.onchange = () => { Store.setSettings({ music: music.checked }); if (music.checked) Sound.ensure(); Sound.sync(); };
  sfx.onchange = () => { Store.setSettings({ sfx: sfx.checked }); if (sfx.checked) Sound.correct(0); };
  vol.oninput = () => { const v = +vol.value; Sound.setVolume(v); Store.settings.volume = v; };
  vol.onchange = () => { Store.setSettings({ volume: +vol.value }); Sound.tick(); };
  vib.onchange = () => Store.setSettings({ vibrate: vib.checked });
  theme.onchange = () => { Store.setSettings({ theme: theme.value as Settings["theme"] }); applyTheme(); };
  bindKeyBox(el);
  $("#setGoal", el).onclick = () => { m.close(); openGoal(false); };
  $("#setReset", el).onclick = async () => {
    m.close();
    if (await confirmBox(Store.status === "cloud" ? "Yerel önbellek silinsin mi? Bulut kayıtların kalır, sayfa yenilenince geri yüklenir." : "Bu cihazdaki tüm ilerleme silinsin mi? Bu geri alınamaz.", "Sil")) {
      try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY + ".dirty"); localStorage.removeItem(EXAM_KEY); } catch { /* depolama kapalı */ }
      location.reload();
    }
  };
}

function keyBoxHtml(): string {
  if (hasSample()) return `<div class="keybox"><b>Claude ile ek özellikler</b><p class="note">Bu sayfa claude.ai içinde açık; "Bunu farklı açıkla" ve "Benzer soru üret" anahtar gerekmeden çalışıyor.</p></div>`;
  const k = AI.key();
  return `<div class="keybox">
    <b>Claude ile ek özellikler (isteğe bağlı)</b>
    <p class="note">"Bunu farklı açıkla" ve "Benzer soru üret" kendi Anthropic API anahtarınla çalışır. Anahtar yalnızca bu tarayıcıda durur ve doğrudan api.anthropic.com'a gider; bu siteye ya da başka bir yere gönderilmez. Ücret Anthropic hesabından düşer: benzer soru (doğrulamasıyla) Haiku'da ~1-2, Opus'ta ~5-6 sent; açıklama bunun çok altında. Bu iş için ayrı bir anahtar oluşturup harcama sınırı koymanı öneririz.</p>
    <input type="password" id="setKey" autocomplete="off" spellcheck="false" placeholder="${k ? "Kayıtlı: sk-ant-…" + esc(k.slice(-4)) : "sk-ant-…"}" aria-label="Anthropic API anahtarı">
    <label class="chk"><input type="checkbox" id="setRemember" ${AI.remembered() ? "checked" : ""}> Bu cihazda hatırla <span class="note">(kapalıysa sekme kapanınca silinir)</span></label>
    <label for="setModel" class="note">Model</label>
    <select id="setModel">${AI_MODELS.map(([id, l]) => `<option value="${id}" ${AI.model() === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
    <div class="row"><button class="btn small primary" id="setKeySave">Kaydet ve dene</button>${k ? `<button class="btn small" id="setKeyDel">Anahtarı sil</button>` : ""}</div>
    <p class="note" id="setKeyMsg" aria-live="polite">${k ? "Anahtar kayıtlı; Claude özellikleri açık." : ""}</p>
  </div>`;
}

function bindKeyBox(el: HTMLElement): void {
  const sv = $opt<HTMLButtonElement>("#setKeySave", el); if (!sv) return;
  const msg = $("#setKeyMsg", el);
  const keyIn = $<HTMLInputElement>("#setKey", el), remember = $<HTMLInputElement>("#setRemember", el), model = $<HTMLSelectElement>("#setModel", el);
  model.onchange = () => Store.setSettings({ aiModel: model.value });
  remember.onchange = () => { const k = AI.key(); if (k) AI.setKey(k, remember.checked); };
  sv.onclick = async () => {
    const k = keyIn.value.trim() || AI.key();
    if (!k) { msg.textContent = "Önce anahtarını yapıştır."; return; }
    const old = AI.key(), oldR = AI.remembered();
    AI.setKey(k, remember.checked); sv.disabled = true; msg.textContent = "Deneniyor…";
    try {
      await aiText("Yalnızca OK yaz.");
      keyIn.value = ""; keyIn.placeholder = "Kayıtlı: sk-ant-…" + k.slice(-4);
      msg.textContent = "Bağlantı tamam ✓ Claude özellikleri açıldı."; refreshAiBox();
    } catch (e) { AI.setKey(old, oldR); msg.textContent = aiErr(e); }
    finally { sv.disabled = false; }
  };
  const del = $opt("#setKeyDel", el);
  if (del) del.onclick = () => { AI.setKey(""); msg.textContent = "Anahtar bu cihazdan silindi."; del.remove(); keyIn.placeholder = "sk-ant-…"; refreshAiBox(); };
}
