/* Kelime kartları: İngilizce kelime → 4 Türkçe karşılıktan doğrusu. Bilinmeyen kart birkaç kart sonra tekrar gelir. */
import { Sound } from "../audio/sound";
import { LETTERS } from "../config/sections";
import { lastAttempt } from "../core/attempts";
import { findQ, PASSAGES } from "../core/pool";
import { BOX_DAYS } from "../core/srs";
import { Store } from "../core/store";
import { vocabChoices, vocabIndex, vocabSrsKey, type Choice, type VocabWord } from "../core/vocab";
import { esc } from "../lib/format";
import { shuffle } from "../lib/random";
import { DAY, startOfDay } from "../lib/time";
import { $, $$, closest, toast, vibrate } from "./dom";
import { ICON } from "./icons";
import { PLAY, summaryScreen } from "./play";
import { go, main, setPlaying, UI } from "./shell";

interface Card { key: string; n: number; ch?: Choice[] }
export const VOC: { tok: number; deck: Card[]; i: number; known: number; unknown: number; done: boolean } = { tok: 0, deck: [], i: 0, known: 0, unknown: 0, done: false };

export function startVocab(): void {
  const words = [...vocabIndex().values()]; const now = Date.now();
  const srs = (w: VocabWord) => Store.srs[vocabSrsKey(w.key)];
  const due = words.filter(w => { const e = srs(w); return e && e.box < 4 && now >= (e.due || 0); }).sort((a, b) => (srs(a)!.due || 0) - (srs(b)!.due || 0));
  const fresh = words.filter(w => !srs(w));
  const wrongQ = (w: VocabWord) => w.qids.some(id => { const la = lastAttempt(id); return la && !la.correct; });
  // Sıra: vadesi gelenler, senin işaretlediklerin, yanlış yaptığın sorulardakiler, diğerleri.
  const deck = [...due, ...shuffle(fresh.filter(w => w.mine)), ...shuffle(fresh.filter(w => !w.mine && wrongQ(w))), ...shuffle(fresh.filter(w => !w.mine && !wrongQ(w)))].slice(0, Math.max(20, due.length)).slice(0, 30);
  if (!deck.length) return toast("Kelime kartı yok.");
  Object.assign(VOC, { deck: deck.map(w => ({ key: w.key, n: 0 })), i: 0, known: 0, unknown: 0, done: false });
  PLAY.active = true; PLAY.mode = "vocab"; setPlaying(true);
  renderVocab();
}

// Kelimenin geçtiği cümle, kelime vurgulanmış olarak.
function vocabContext(w: VocabWord): string {
  const hl = (s: string, root: string) => { const i = s.toLowerCase().indexOf(root); return i < 0 ? esc(s) : esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + root.length)) + "</mark>" + esc(s.slice(i + root.length)); };
  if (w.ctx) return hl(w.ctx, String(w.word || w.en).toLowerCase());
  for (const id of w.qids) {
    const q = findQ(id); if (!q) continue;
    const texts = [q.stem, q.passage ? PASSAGES.get(q.passage)?.text : undefined, ...LETTERS.map(L => q.options[L])];
    const root = w.en.toLowerCase().split(/[\s/(]/)[0]!.replace(/[^a-z'-]/g, "").slice(0, Math.max(4, w.en.length - 2));
    for (const t of texts) {
      if (!t || !root) continue;
      const s = String(t).split(/(?<=[.!?])\s+/).find(x => x.toLowerCase().includes(root));
      if (s) return hl(s, root);
    }
  }
  return "";
}

function renderVocab(): void {
  if (VOC.i >= VOC.deck.length) {
    PLAY.active = false;
    return summaryScreen("Kartlar bitti", VOC.known >= VOC.unknown, `<div class="score">${VOC.known}<span class="muted" style="font-size:22px"> / ${VOC.known + VOC.unknown}</span></div><p class="muted">kelimeyi ilk seferde doğru bildin. Bilemediklerin yarın tekrar gelecek.</p>`, []);
  }
  const c = VOC.deck[VOC.i]!; const w = vocabIndex().get(c.key); const e = Store.srs[vocabSrsKey(c.key)];
  if (!w) { VOC.i++; return renderVocab(); }
  const ch = c.ch = vocabChoices(w); VOC.done = false;
  main.innerHTML = `<div class="hud"><div class="wrap"><div class="hud-top">
      <button class="iconbtn" id="vQuit" aria-label="Kartları kapat">${ICON.close}</button>
      <div class="hud-title"><div class="g">Kelime kartları</div><div class="s">${VOC.i + 1}/${VOC.deck.length} · ${e ? "tekrar · kutu " + e.box : "yeni"}</div></div>
    </div></div></div>
    <div class="wrap play vwrap">
      <div class="vq"><span class="eyebrow">${w.mine ? "Senin işaretlediğin" : "Sorulardan"}</span><div class="vw">${esc(w.en)}</div><span class="note">Türkçe karşılığı hangisi? (1-4)</span></div>
      <div class="opts" id="vOpts">${ch.map((x, i) => `<button class="opt" data-i="${i}"><span class="L">${i + 1}</span><span class="T">${esc(x.tr)}</span></button>`).join("")}</div>
      <div class="stack" id="vFb" style="margin-top:14px"></div>
    </div>
    <div class="actionbar"><div class="wrap" id="vAct"><button class="btn" id="vSkip">Bilmiyorum</button></div></div>`;
  Sound.flip();
  window.scrollTo(0, 0);
  $("#vOpts").onclick = ev => { const b = closest(ev, "[data-i]"); if (b) vocabAnswer(Number(b.dataset.i)); };
  $("#vSkip").onclick = () => vocabAnswer(-1);
  $("#vQuit").onclick = () => { VOC.tok++; PLAY.active = false; go(UI.screen); };
}

/** i: seçilen şık (0-3), -1 = "Bilmiyorum". */
export function vocabAnswer(i: number): void {
  if (VOC.done) return; VOC.done = true;
  const c = VOC.deck[VOC.i]!; const w = vocabIndex().get(c.key); const ch = c.ch;
  if (!w || !ch) return;
  const id = vocabSrsKey(c.key); const e = Store.srs[id]; const now = Date.now();
  const knew = i >= 0 && !!ch[i]?.ok;
  if (c.n === 0) { if (knew) VOC.known++; else VOC.unknown++; }
  c.n++;
  if (knew) {
    const nb = e ? Math.min(4, e.box + 1) : 2;     // ilk seferde bilinen yeni kelime 2. kutudan başlar
    Store.put("srs", id, { kind: "v", en: w.en, tr: w.tr, box: nb, due: nb >= 4 ? null : startOfDay(now) + BOX_DAYS[nb]! * DAY, last: now });
    Sound.correct(1); vibrate(30);
  } else {
    Store.put("srs", id, { kind: "v", en: w.en, tr: w.tr, box: 0, due: now, last: now });
    if (c.n < 3) VOC.deck.splice(Math.min(VOC.deck.length, VOC.i + 5), 0, { key: c.key, n: c.n });
    Sound.wrong(); vibrate([60, 40, 60]);
  }
  $$("#vOpts .opt").forEach((b, j) => { b.setAttribute("aria-disabled", "true"); b.classList.add(ch[j]?.ok ? "correct" : j === i ? "wrong" : "dim"); });
  const ctx = vocabContext(w);
  $("#vFb").innerHTML = `<div class="fb-head ${knew ? "good" : "bad"}"><span class="ic">${knew ? "✓" : "✗"}</span><div><div class="ttl">${knew ? "Doğru!" : i < 0 ? "Bir dahakine" : "Yanlış"}</div><div class="sub"><b>${esc(w.en)}</b> = ${esc(w.tr)}${knew ? "" : " · birkaç kart sonra tekrar gelecek"}</div></div></div>
    ${ctx ? `<div class="fb-block"><h4>Geçtiği cümle</h4><p>${ctx}</p></div>` : ""}`;
  $("#vAct").innerHTML = `<button class="btn primary" id="vNext">Devam ▶</button>`;
  const nb = $("#vNext"); nb.onclick = vocabNext; nb.focus({ preventScroll: true });
  if (knew) { const tok = ++VOC.tok; setTimeout(() => { if (VOC.tok === tok) vocabNext(); }, 1400); }
}

export function vocabNext(): void {
  if (!VOC.done || PLAY.mode !== "vocab" || !PLAY.active) return;
  VOC.tok++; VOC.i++; renderVocab();
}
