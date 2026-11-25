/* Soru kartı: metin vurgulama, boşluklar, şıklar ve cevap sonrası açıklama. Hepsi HTML metni üretir. */
import { aiReady } from "../core/ai";
import { LETTERS, SEC, type Letter, type Section } from "../config/sections";
import { tagName } from "../config/tags";
import { PASSAGES, passageQids, Q } from "../core/pool";
import { isEn, WORD_RE, wordKey } from "../core/words";
import { esc } from "../lib/format";
import type { Question } from "../types";
import { $opt } from "./dom";
import { wordsBlockHtml } from "./marking";

export function prepText(text: string | undefined, section: Section): string {
  let t = String(text || "");
  if (section === "irrelevant") t = t.replace(/\s+\((II|III|IV|V)\)\s*/g, (_m, r: string) => "\n(" + r + ") ");
  return t;
}

// İngilizce metindeki her kelime işaretlenebilsin diye <span class="w"> içine alınır.
// Türkçe metinler (çeviri soruları) olduğu gibi kalır.
export function wrapWords(t: string): string {
  let out = "", pos = 0;
  for (const m of t.matchAll(WORD_RE)) {
    const i = m.index ?? 0;
    out += esc(t.slice(pos, i)) + `<span class="w" data-w="${esc(wordKey(m[0]))}">${esc(m[0])}</span>`;
    pos = i + m[0].length;
  }
  return out + esc(t.slice(pos));
}
const wordsOrEsc = (t: string | undefined): string => isEn(String(t || "")) ? wrapWords(String(t || "")) : esc(t);

// "(3) ----" numaralı boşluk ya da "----" boşluk; şu anki soru numarası vurgulanır.
function decorate(s: string, curBlank: number | null | undefined, en: boolean): string {
  const re = /\((\d+)\)\s*-{2,}|-{3,}/g; let out = "", pos = 0, m: RegExpExecArray | null;
  const txt = (x: string) => en ? wrapWords(x) : esc(x);
  while ((m = re.exec(s))) {
    out += txt(s.slice(pos, m.index)) + (m[1]
      ? `<span class="blank${String(m[1]) === String(curBlank) ? " cur" : ""}" data-blank="${m[1]}">(${m[1]}) ----</span>`
      : `<span class="gap">----</span>`);
    pos = m.index + m[0].length;
  }
  return out + txt(s.slice(pos));
}

/** Metin + ipucu ifadelerini <mark> ile vurgulama (çakışan aralıklar birleştirilir). */
export function richText(text: string, clues?: readonly string[] | null, curBlank?: number | null): string {
  const en = isEn(text);
  const low = text.toLowerCase(); const ranges: [number, number][] = [];
  for (const c of clues || []) {
    const cl = String(c || "").toLowerCase().trim(); if (cl.length < 2) continue;
    let i = low.indexOf(cl);
    while (i >= 0) { ranges.push([i, i + cl.length]); i = low.indexOf(cl, i + cl.length); }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) { const l = merged[merged.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else merged.push([r[0], r[1]]); }
  let out = "", pos = 0;
  for (const [a, b] of merged) { out += decorate(text.slice(pos, a), curBlank, en) + "<mark>" + decorate(text.slice(a, b), curBlank, en) + "</mark>"; pos = b; }
  return out + decorate(text.slice(pos), curBlank, en);
}

export function stemHtml(q: Question, clues?: readonly string[] | null): string {
  if (!String(q.stem || "").trim()) {
    return q.passage ? `<span class="muted">Paragraftaki <b>(${q.n})</b> numaralı boşluğa en uygun seçenek hangisi?</span>` : "";
  }
  return richText(prepText(q.stem, q.section), clues);
}

export function passageHtml(q: Question, clues?: readonly string[] | null): string {
  const p = q.passage ? PASSAGES.get(q.passage) : undefined; if (!p) return "";
  const qs = passageQids(p.id).map(id => Q(id).n).filter(Boolean);
  const range = qs.length ? (qs.length > 1 ? `${qs[0]}–${qs[qs.length - 1]}` : qs[0]) : "";
  return `<div class="passage" id="psg" tabindex="0" aria-label="Paragraf"><div class="ph"><span class="eyebrow">${p.kind === "cloze" ? "Paragraf · boşluklar" : "Okuma parçası"}${range ? " · soru " + range : ""}</span></div><div>${richText(prepText(p.text, q.section), clues, q.n)}</div></div>`;
}

/** Paragraf kutusunu şu anki boşluğa kaydırır. */
export function scrollPassageToBlank(): void {
  const box = $opt("#psg"); if (!box) return;
  const b = $opt(".blank.cur", box); if (!b) return;
  box.scrollTop = Math.max(0, b.offsetTop - box.clientHeight / 3);
}

export interface OptionsState { done?: boolean; chosen?: Letter | null; picked?: Letter | null; struck?: readonly Letter[] }

export function optionsHtml(q: Question, state: OptionsState = {}): string {
  return LETTERS.map(L => {
    let cls = "opt";
    if (state.done) {
      if (L === q.answer) cls += " correct";
      else if (L === state.chosen) cls += " wrong";
      else cls += " dim";
    } else if (state.picked === L) cls += " picked";
    const struck = !!state.struck?.includes(L);
    if (struck) cls += " struck";
    return `<button class="${cls}" data-opt="${L}" ${state.done || struck ? `aria-disabled="true"` : ""}><span class="L">${L}</span><span class="T">${wordsOrEsc(q.options[L])}</span></button>`;
  }).join("");
}

export function confHtml(): string {
  return `<div class="conf" id="conf" role="group" aria-label="Ne kadar eminsin?"><span class="q">Ne kadar eminsin? (1 · 2 · 3)</span>
    <button class="sure" data-conf="sure">Eminim<small>doğruysa ×1,5</small></button>
    <button data-conf="unsure">Kararsızım<small>tekrar gelir</small></button>
    <button class="guess" data-conf="guess">Tahmin<small>tekrar gelir</small></button></div>`;
}

export interface FeedbackOptions { blank?: boolean; scoreLine?: string; extra?: string }

export function feedbackHtml(q: Question, chosen: Letter | null | undefined, opts: FeedbackOptions = {}): string {
  const ex = q.explain || {}; const ok = chosen === q.answer;
  const others = ex.others || {};
  const p = q.passage ? PASSAGES.get(q.passage) : null;
  const otherList = LETTERS.filter(L => L !== q.answer && L !== (ok ? null : chosen) && others[L]);
  const head = opts.blank
    ? `<div class="fb-head bad"><span class="ic">–</span><div><div class="ttl">Boş bıraktın</div><div class="sub">Doğru cevap ${q.answer}</div></div></div>`
    : `<div class="fb-head ${ok ? "good" : "bad"}"><span class="ic">${ok ? "✓" : "✗"}</span><div><div class="ttl">${ok ? "Doğru!" : "Yanlış"}</div><div class="sub">${ok ? (opts.scoreLine || "Doğru cevap " + q.answer) : `Senin cevabın ${chosen} · doğru cevap ${q.answer}`}${opts.extra ? " · " + opts.extra : ""}</div></div></div>`;
  return `${head}
    ${!ok && chosen && others[chosen] ? `<div class="fb-block chosen"><h4>${chosen} şıkkı neden olmuyor?</h4><p>${esc(others[chosen])}</p></div>` : ""}
    <div class="fb-block answer"><h4>Doğru cevap · ${q.answer}</h4><p class="opttext">${esc(q.options[q.answer])}</p>${ex.short ? `<p class="lead">${esc(ex.short)}</p>` : ""}${ex.why ? `<p>${esc(ex.why)}</p>` : ""}</div>
    ${ex.tip ? `<div class="fb-block tip"><h4>Taktik</h4><p>${esc(ex.tip)}</p></div>` : ""}
    ${otherList.length ? `<details class="fb-block"><summary>Diğer şıklar neden yanlış</summary><ul class="others">${otherList.map(L => `<li><b>${L}</b><span>${esc(others[L])}</span></li>`).join("")}</ul></details>` : ""}
    <div id="fbWords">${wordsBlockHtml(q)}</div>
    ${(q.vocab || []).length ? `<div class="fb-block"><h4>Kelimeler</h4><div class="vocab">${(q.vocab || []).map(v => `<span><b>${esc(v.en)}</b> · ${esc(v.tr)}</span>`).join("")}</div></div>` : ""}
    ${q.stemTr ? `<details class="fb-block"><summary>Türkçesi</summary><p style="white-space:pre-line">${esc(q.stemTr)}</p></details>` : ""}
    ${p && p.tr ? `<details class="fb-block"><summary>Paragrafın Türkçe özeti</summary><p>${esc(p.tr)}</p></details>` : ""}
    ${(q.tags || []).length ? `<div class="row" style="gap:6px">${(q.tags || []).map(t => `<span class="tag">${esc(tagName(t))}</span>`).join("")}</div>` : ""}
    <div class="fb-block" id="aiBox" ${aiReady() ? "" : "hidden"}>
      <h4>Claude'a sor</h4>
      <div class="ai-row"><button class="btn small cyan" id="aiExplain">Bunu farklı açıkla</button><button class="btn small cyan" id="aiSimilar">Benzer soru üret</button><button class="btn small" id="aiStop" hidden>Durdur</button></div>
      <div class="ai-out" id="aiOut" aria-live="polite"></div>
    </div>`;
}

/** Hata özetindeki tek satır başlığı: "Gramer 12". */
export const qLabel = (q: Question): string => esc(SEC[q.section].short) + (q.n ? " " + q.n : "");
