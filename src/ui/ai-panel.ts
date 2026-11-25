/* Cevaptan sonraki "Claude'a sor" kutusu: farklı açıklama (akışlı) ve doğrulanmış benzer soru. */
import type { Letter } from "../config/sections";
import { AiError, aiErr, aiJson, aiReady, aiText, buildGenerated, errText, explainPrompt, similarPrompt, verifyAnswer, type Generated } from "../core/ai";
import { addGenerated } from "../core/pool";
import { bump, errCode, Store } from "../core/store";
import { sleep } from "../lib/time";
import type { Question } from "../types";
import { $opt } from "./dom";
import { insertNext, PLAY } from "./play";

let ctl: AbortController | null = null;

export function bindAi(q: Question, chosen: Letter | null | undefined): void {
  const ex = $opt("#aiExplain"), si = $opt("#aiSimilar"); if (!ex || !si || !aiReady()) return;
  ex.onclick = () => void aiExplain(q, chosen);
  si.onclick = () => void aiSimilar(q);
}

/** Anahtar eklenince/silinince açık olan sorudaki kutuyu günceller. */
export function refreshAiBox(): void {
  const box = $opt("#aiBox"); if (!box) return;
  box.hidden = !aiReady();
  if (aiReady() && PLAY.q) bindAi(PLAY.q, PLAY.picked || PLAY.items[PLAY.idx]?.chosen);
}

function aiBusy(on: boolean): void {
  const ex = $opt<HTMLButtonElement>("#aiExplain"), si = $opt<HTMLButtonElement>("#aiSimilar"), stop = $opt("#aiStop");
  if (ex) ex.disabled = on;
  if (si) si.disabled = on;
  if (stop) { stop.hidden = !on; stop.onclick = () => ctl?.abort(); }
}

async function aiExplain(q: Question, chosen: Letter | null | undefined): Promise<void> {
  const out = $opt("#aiOut"); if (!out) return;
  ctl = new AbortController(); aiBusy(true); out.textContent = "Claude düşünüyor…";
  try {
    await aiText(explainPrompt(q, chosen), { signal: ctl.signal, onText: ({ text }) => { out.textContent = text; } });
  } catch (e) {
    out.textContent = errText(e);
    if (errCode(e) !== "cancelled") out.textContent += (out.textContent ? "\n\n" : "") + aiErr(e);
  } finally { aiBusy(false); }
}

async function aiSimilar(q: Question): Promise<void> {
  const out = $opt("#aiOut"); if (!out) return;
  const c = ctl = new AbortController(); aiBusy(true); out.textContent = "Claude yeni bir soru yazıyor… (biraz sürebilir)";
  const prompt = similarPrompt(q);
  try {
    // Üretilen soruyu ikinci bir çağrı cevabı görmeden çözer; cevaplar uyuşmazsa soru gösterilmez.
    let g: Generated | null = null;
    for (let attempt = 1; attempt <= 2 && !g; attempt++) {
      if (attempt > 1) out.textContent = "İlk soru doğrulamadan geçmedi, yenisi yazılıyor…";
      const cand = buildGenerated(await aiJson(prompt, { signal: c.signal }), q);
      if (!cand) continue;
      out.textContent = "Soru yazıldı. Cevap anahtarı ayrıca kontrol ediliyor…";
      if (await verifyAnswer(cand, c.signal) === cand.q.answer) g = cand;
    }
    if (!g) throw new AiError("unverified");
    Store.put("gen", g.q.id, { q: g.q, passage: g.passage, src: q.id, ts: Date.now() });
    addGenerated(g); bump();
    out.textContent = "Yeni soru hazır. Hemen çözüyorsun…";
    aiBusy(false);
    await sleep(500);
    insertNext(g.q.id);
  } catch (e) {
    const code = errCode(e);
    out.textContent = code === "cancelled" ? "" : code === "unverified" ? "Claude'un yazdığı soruların cevap anahtarı doğrulamadan geçemedi (iki ayrı çözüm farklı çıktı). Hatalı soru göstermemek için iptal edildi; tekrar deneyebilirsin." : aiErr(e);
    aiBusy(false);
  }
}
