/* Tekrar: Leitner kutuları, kırmızı deste ve kelime kartları. */
import { dueQuestions, srsBoxes } from "../../core/srs";
import { Store } from "../../core/store";
import { vocabDeckInfo } from "../../core/vocab";
import { esc } from "../../lib/format";
import { closest } from "../dom";

export function screenReview(): string {
  const due = dueQuestions(); const bx = srsBoxes(); const vd = vocabDeckInfo();
  const labels = ["Kutu 0 · bugün", "Kutu 1 · +1 gün", "Kutu 2 · +3 gün", "Kutu 3 · +6 gün", "Öğrenildi"];
  const max = Math.max(1, ...bx.c);
  return `
  <h2 class="display" style="font-size:24px">Tekrar Destesi</h2>
  <p class="muted">Yanlış yaptığın, "Tahmin" ile doğru bildiğin ve kararsız kaldığın sorular aralıklı olarak geri gelir. Kırmızılar "Eminim" deyip yanıldıkların; önce onlar gelir.</p>
  <section class="panel stack">
    <div class="stats3">
      <div class="stat"><div class="v">${due.length}</div><div class="l">vadesi gelen</div></div>
      <div class="stat"><div class="v" style="color:var(--bad)">${bx.red}</div><div class="l">kırmızı</div></div>
      <div class="stat"><div class="v">${bx.c[4]}</div><div class="l">öğrenildi</div></div>
    </div>
    <div>${bx.c.map((n, i) => `<div class="hbar"><span class="lb">${labels[i]}</span><div class="track"><i style="width:${n / max * 100}%"></i></div><span class="val"><span>${n} soru</span></span></div>`).join("")}</div>
    <button class="btn primary block" data-act="review" ${due.length ? "" : "disabled"}>${due.length ? `Desteyi başlat (${Math.min(20, due.length)} soru)` : "Şu an vadesi gelen soru yok"}</button>
  </section>
  <section class="panel stack">
    <div class="section-title"><h3>Kelime kartları</h3><span class="note">${vd.total} kelime</span></div>
    <p class="muted" style="font-size:14.5px">İngilizce kelimeyi gör, 4 Türkçe karşılıktan doğrusunu seç. Önce senin işaretlediğin kelimeler, sonra yanlış yaptığın sorulardakiler gelir.${vd.mine ? ` Şu an ${vd.mine} kelimeyi sen işaretledin.` : ""}</p>
    <button class="btn cyan block" data-act="vocab" ${vd.due + vd.fresh ? "" : "disabled"}>Kartları aç (${vd.due} tekrar · ${vd.fresh} yeni)</button>
    ${myWordsHtml()}
  </section>`;
}

function myWordsHtml(): string {
  const ws = Object.values(Store.words).filter(d => (d.qids || []).length).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (!ws.length) return `<p class="note">Soru çözerken <b>✎ Kelime işaretle</b> ile bilmediğin kelimeleri işaretle; anlamlarıyla birlikte buraya ve kartlara eklenir.</p>`;
  return `<details class="fb-block"><summary>İşaretlediğin kelimeler (${ws.length})</summary>
    <div class="mkw">${ws.map(d => `<span><b>${esc(d.en || d.word)}</b> · ${d.tr ? esc(d.tr) : `<span class="muted">anlam yok</span>`}<button data-unmark="${esc(d.id)}" aria-label="${esc(d.en || d.word)} listeden çıkar" title="Listeden çıkar">✕</button></span>`).join("")}</div>
    <p class="note">✕ ile öğrendiğin kelimeyi listeden çıkarabilirsin.</p></details>`;
}

export function installReview(): void {
  document.addEventListener("click", e => {
    const b = closest(e, "[data-unmark]"); if (!b) return;
    const d = Store.words[b.dataset.unmark || ""]; if (!d || !d.id) return;
    Store.put("words", d.id, { ...d, qids: [] });
    b.parentElement?.remove();
  });
}
