import { Sound } from "../audio/sound";
import { SEC, SECTIONS, type Section } from "../config/sections";
import { STRATEGY } from "../config/strategy";
import { examType, REAL } from "../core/goal";
import { S, Store } from "../core/store";
import { esc, fmtSec } from "../lib/format";
import { modal } from "./modal";

export function strategyHtml(sec: Section): string {
  const ex = esc(examType().name);
  return `<p class="eyebrow">Strateji kartı · ${esc(SEC[sec].tr)}</p><ul>${STRATEGY[sec].map(t => `<li>${esc(t)}</li>`).join("")}</ul><p class="note">Par süre: ${fmtSec(SEC[sec].par)} · ${REAL(sec) ? `${ex} sınavında ${REAL(sec)} soru` : `${ex} sınavında bu bölüm yok`}</p>`;
}

function showStrategy(sec: Section): Promise<void> {
  return new Promise(res => {
    Sound.flip();
    modal(`<h2>${esc(SEC[sec].short)}</h2>${strategyHtml(sec)}<button class="btn primary block" data-close>Anladım, başla</button>`, { onClose: res, sticky: true });
  });
}

export function showAllStrategy(): void {
  modal(`<h2>Strateji kartları</h2>${SECTIONS.map(s => `<div class="stack" style="gap:6px"><h3>${esc(SEC[s].tr)}</h3><ul>${STRATEGY[s].map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}<button class="btn primary block" data-close>Kapat</button>`);
}

/** Bölüme ilk girişte strateji kartını bir kez gösterir. */
export async function maybeStrategy(sec: Section): Promise<void> {
  const seen = S().seenStrategy || {};
  if (seen[sec]) return;
  await showStrategy(sec);
  Store.setSettings({ seenStrategy: { ...seen, [sec]: true } });
}
