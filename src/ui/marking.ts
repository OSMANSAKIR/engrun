/* Bilinmeyen kelime işaretleme.
   İşaretler Store.words'te tutulur (kelime başına bir kayıt, hangi sorularda işaretlendiği qids'te).
   Anlam önce sorulardaki kelime listelerinden, bulunamazsa Claude'dan gelir; cevap verilene kadar gösterilmez. */
import { Sound } from "../audio/sound";
import { aiErr, aiJson, aiReady, wordsPrompt } from "../core/ai";
import { findQ, passageQids, Q } from "../core/pool";
import { Store } from "../core/store";
import { loadDict, localMeaning, wordKey } from "../core/words";
import { esc, safeId } from "../lib/format";
import type { Question, WordDoc } from "../types";
import { $$, $opt, closest, typing } from "./dom";
import { EXAM } from "./exam";
import { PLAY } from "./play";
import { main } from "./shell";

export const MARK: { on: boolean; timer: ReturnType<typeof setTimeout> | undefined; busy: boolean; err: string } = { on: false, timer: undefined, busy: false, err: "" };

const wordDocId = (k: string) => "w_" + safeId(k);
// Paragraflı sorularda işaret paragrafın bütün sorularında görünür.
const scopeIds = (q: Question) => q.passage ? passageQids(q.passage) : [q.id];

function wordsFor(q: Question): WordDoc[] {
  const sc = new Set(scopeIds(q));
  return Object.values(Store.words).filter(d => (d.qids || []).some(x => sc.has(x)));
}

/** Şu an ekrandaki soru ve cevaplanıp cevaplanmadığı; işaretleme yapılamayan ekranda null. */
export function markTarget(): { q: Question; answered: boolean } | null {
  if (!$opt(".wrap.play") || PLAY.mode === "vocab" && !EXAM.active) return null;
  if (EXAM.active && EXAM.st) return { q: Q(EXAM.st.qids[EXAM.st.idx]!), answered: false };
  if (PLAY.active && PLAY.q) return { q: PLAY.q, answered: PLAY.answered || !!PLAY.items[PLAY.idx]?.preset };
  return null;
}

export function applyMarks(): void {
  const t = markTarget(); const root = $opt(".wrap.play"); if (!t || !root) return;
  root.classList.toggle("answered", t.answered);
  root.classList.toggle("marking", MARK.on);
  const docs = new Map(wordsFor(t.q).map(d => [d.key, d]));
  for (const el of $$(".w", root)) {
    const d = docs.get(el.dataset.w || "");
    el.classList.toggle("mk", !!d);
    if (d && d.tr && t.answered) el.dataset.tr = "(" + d.tr + ")"; else delete el.dataset.tr;
  }
  $opt("#markBtn")?.setAttribute("aria-pressed", String(MARK.on));
  const n = $opt("#markNote"); if (n) n.textContent = MARK.on ? (t.answered ? "Kelimeye dokun, anlamı çıksın." : "Kelimeye dokun · şık seçmek için harf kutusuna dokun.") : "";
  const f = $opt("#fbWords"); if (f && t.answered) f.innerHTML = wordsBlockHtml(t.q);
}

export const markBtnHtml = (): string => `<button class="btn small" id="markBtn" aria-pressed="${MARK.on}" title="Kısayol: M">✎ Kelime işaretle</button>`;

// Kelimenin geçtiği cümle (Claude'a bağlam olarak gider ve kartta gösterilir).
function sentenceAround(el: HTMLElement): string {
  const box = el.closest(".T, .stem, .passage > div:last-child");
  const txt = (box || el).textContent!.replace(/\s+/g, " ").trim(); const word = el.textContent || "";
  let s = txt.split(/(?<=[.!?])\s+/).find(x => x.includes(word)) || txt;
  const stem = box && box.classList.contains("T") && $opt("#stem");   // şıktaki kelime: soru cümlesini de ekle
  if (stem && s.length < 120) s += " — soru: " + (stem.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (s.length <= 300) return s;
  const i = Math.max(0, s.indexOf(word) - 140);
  return (i ? "…" : "") + s.slice(i, i + 280) + "…";
}

function toggleMark(el: HTMLElement): void {
  const t = markTarget(); const key = el.dataset.w; if (!t || !key || key.length < 2) return;
  const id = wordDocId(key); const d = Store.words[id]; const sc = scopeIds(t.q);
  const on = !!d && (d.qids || []).some(x => sc.includes(x));
  if (on) Store.put("words", id, { ...d, qids: d.qids.filter(x => !sc.includes(x)) });
  else Store.put("words", id, { key, word: el.textContent || key, en: d?.en ?? null, tr: d?.tr ?? null, pos: d?.pos ?? null, src: d?.src ?? null, ctx: d?.ctx || sentenceAround(el), qids: [...(d?.qids || []), t.q.id], ts: d?.ts || Date.now() });
  if (!EXAM.active) { if (on) Sound.unmark(); else Sound.mark(); }
  applyMarks();
  if (t.answered) lookupSoon();
}

export function installMarking(): void {
  main.addEventListener("click", e => {
    if (closest(e, "#markBtn")) { MARK.on = !MARK.on; applyMarks(); return; }
    const w = MARK.on && closest(e, ".w"); if (!w || !markTarget()) return;
    e.preventDefault(); e.stopPropagation(); toggleMark(w);
  }, true);
  document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() !== "m" || e.metaKey || e.ctrlKey || e.altKey || $opt(".overlay") || !markTarget() || typing()) return;
    e.preventDefault(); MARK.on = !MARK.on; applyMarks();
  });
}

/* ---- anlam bulma ---- */

export function lookupSoon(ms = 400): void { clearTimeout(MARK.timer); MARK.timer = setTimeout(() => void lookupWords(), ms); }

async function lookupWords(): Promise<void> {
  if (MARK.busy) return lookupSoon(800);
  await loadDict();
  const rest: WordDoc[] = [];
  for (const d of Object.values(Store.words)) {
    if (d.tr || d.failed || !(d.qids || []).length) continue;
    const m = localMeaning(d.key, findQ(d.qids[d.qids.length - 1]!));
    if (m) Store.put("words", d.id!, { ...d, en: m.en, tr: m.tr, src: "liste" }); else rest.push(d);
  }
  if (rest.length && aiReady()) {   // sözlükte olmayan (ör. yeni üretilmiş sorudaki) kelimeler
    const batch = rest.slice(0, 20);
    MARK.busy = true; MARK.err = ""; applyMarks();
    try {
      const r = await aiJson(wordsPrompt(batch), { quick: true }) as unknown;
      type Item = { w?: unknown; en?: unknown; tr?: unknown; pos?: unknown };
      const list: Item[] = Array.isArray(r) ? r : (r && typeof r === "object" && Array.isArray((r as { words?: unknown }).words) ? (r as { words: Item[] }).words : []);
      for (const d of batch) {
        const x = list.find(y => y && wordKey(String(y.w || "")) === d.key); const cur = Store.words[d.id!];
        if (!cur) continue;
        if (x && x.tr) Store.put("words", d.id!, { ...cur, en: String(x.en || cur.word).slice(0, 60), tr: String(x.tr).slice(0, 80), pos: x.pos ? String(x.pos).slice(0, 12) : null, src: "claude" });
        else Store.put("words", d.id!, { ...cur, failed: true });
      }
    } catch (e) { MARK.err = aiErr(e); }
    finally { MARK.busy = false; }
    if (rest.length > batch.length && !MARK.err) lookupSoon(300);
  }
  applyMarks();
}

export function wordsBlockHtml(q: Question): string {
  const ds = wordsFor(q);
  if (!ds.length) return Object.keys(Store.words).length ? "" : `<p class="note">İpucu: <b>✎ Kelime işaretle</b> ile bilmediğin kelimelere dokun. Cevaptan sonra anlamları kelimenin yanında çıkar ve kelime kartlarına eklenir.</p>`;
  const tr = (d: WordDoc) => d.tr ? esc(d.tr) : `<span class="muted">${MARK.busy ? "aranıyor…" : "sözlükte yok"}</span>`;
  return `<div class="fb-block"><h4>İşaretlediğin kelimeler</h4><div class="mkw">${ds.map(d => `<span><b>${esc(d.en || d.word)}</b> · ${tr(d)}</span>`).join("")}</div><p class="note">${MARK.err && ds.some(d => !d.tr) ? esc(MARK.err) + " " : ""}Anlamı bulunanlar kelime kartlarına eklendi.</p></div>`;
}
