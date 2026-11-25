/* Analiz: bölüm başarısı ve hedef, süre/par, güven kalibrasyonu, zayıf konular, tahmini puan grafiği. */
import { CONF, SEC, type Confidence } from "../../config/sections";
import { allAttempts } from "../../core/attempts";
import { examSections, goalTarget, secTarget } from "../../core/goal";
import { srsBoxes } from "../../core/srs";
import { predicted, predictedHistory, secStats, weakTags } from "../../core/stats";
import { esc, fmtSec, pct } from "../../lib/format";
import { weakRowsHtml } from "./today";

export function screenStats(): string {
  const atts = allAttempts();
  const st = secStats(atts); const p = predicted(atts);
  const cal: Record<Confidence, [number, number]> = { sure: [0, 0], unsure: [0, 0], guess: [0, 0] };
  for (const a of atts) if (a.confidence && cal[a.confidence]) { cal[a.confidence][1]++; if (a.correct) cal[a.confidence][0]++; }
  const weak = weakTags(atts, 5);
  const hist = predictedHistory();
  const red = srsBoxes().red;
  const maxT = Math.max(...examSections().map(s => Math.max(SEC[s].par * 1.6, st[s].avgT || 0)));
  return `
  <div class="section-title"><h2 class="display" style="font-size:24px">Analiz</h2><span class="pill">Tahmini <strong>${p.score ?? "—"}</strong></span></div>
  <section class="panel">
    <div class="section-title"><h3>Bölüm başarısı</h3><span class="legend"><span><i style="background:var(--chip)"></i>doğru oranı</span><span><i style="background:var(--ink);width:2px"></i>hedef</span></span></div>
    <div style="margin-top:8px">${examSections().map(s => { const x = st[s]; const tg = secTarget(s), tgt = tg == null ? null : Math.round(tg * 100); const a = x.acc == null ? null : Math.round(x.acc * 100);
      return `<div class="hbar"><span class="lb">${esc(SEC[s].short)}</span><div class="track" title="${a == null ? "veri yok" : "%" + a}"><i style="width:${a || 0}%"></i>${tgt == null ? "" : `<b style="left:${tgt}%"></b>`}</div><span class="val"><span>${a == null ? "veri yok" : `%${a} · ${x.ok}/${x.n}`}</span>${a == null || tgt == null ? "" : a >= tgt ? `<span class="ok">✓ hedefte</span>` : `<span class="warn">hedef %${tgt}</span>`}</span></div>`; }).join("")}</div>
  </section>
  <section class="panel">
    <div class="section-title"><h3>Ortalama süre ve par</h3><span class="legend"><span><i style="background:var(--chip)"></i>ortalama</span><span><i style="background:var(--ink);width:2px"></i>par</span></span></div>
    <div style="margin-top:8px">${examSections().map(s => { const t = st[s].avgT; const par = SEC[s].par;
      return `<div class="hbar"><span class="lb">${esc(SEC[s].short)}</span><div class="track"><i style="width:${t ? t / maxT * 100 : 0}%"></i><b style="left:${par / maxT * 100}%"></b></div><span class="val"><span>${t ? `ort ${fmtSec(t)} / par ${fmtSec(par)}` : `par ${fmtSec(par)} · süre verisi yok`}</span>${t ? (t <= par ? `<span class="ok">par altı</span>` : `<span class="warn">+${fmtSec(t - par)}</span>`) : ""}</span></div>`; }).join("")}</div>
    <p class="note" style="margin-top:6px">Süre yalnızca koşu, antrenman ve tekrar cevaplarından hesaplanır.</p>
  </section>
  <section class="panel stack">
    <h3>Güven kalibrasyonu</h3>
    <div class="stats3">${(["sure", "unsure", "guess"] as const).map(k => `<div class="stat"><div class="v">${cal[k][1] ? "%" + pct(cal[k][0], cal[k][1]) : "—"}</div><div class="l">${CONF[k]} dediğinde doğru · ${cal[k][1]} soru</div></div>`).join("")}</div>
    <p class="muted" style="font-size:14.5px">${cal.sure[1] >= 5 ? (cal.sure[0] / cal.sure[1] >= .85 ? "\"Eminim\" dediğinde genelde haklısın. Güzel kalibrasyon." : `"Eminim" dediklerinin %${100 - pct(cal.sure[0], cal.sure[1])}'inde yanıldın. Bunlar kırmızı destede; en kalıcı öğrenme buradan gelir.`) : "Birkaç soruda güven seçince burada ne kadar isabetli olduğunu göreceksin."}</p>
    ${red ? `<button class="btn small" data-act="review">Kırmızı desteyi aç (${red})</button>` : ""}
  </section>
  <section class="panel">
    <div class="section-title"><h3>En zayıf 5 konu</h3><button class="btn small" data-act="practice:weak" ${weak.length ? "" : "disabled"}>Antrenman</button></div>
    <div style="margin-top:6px">${weak.length ? weakRowsHtml(weak) : `<p class="muted">Henüz yeterli veri yok.</p>`}</div>
  </section>
  <section class="panel">
    <div class="section-title"><h3>Tahmini puanın günden güne</h3>${goalTarget() ? `<span class="note">kesikli çizgi: hedef ${goalTarget()}</span>` : ""}</div>
    ${hist.length >= 1 ? sparkline(hist, goalTarget()) : `<p class="muted">Veri geldikçe çizgi oluşacak.</p>`}
  </section>`;
}

/** Küçük SVG çizgi grafik (0-100 ölçek); hedef varsa kesikli çizgi. */
export function sparkline(pts: readonly { label: string; score: number }[], target: number | null): string {
  const W = 600, H = 140, L = 34, R = 26, T = 14, B = 26;
  const xs = (i: number) => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const ys = (v: number) => T + (1 - v / 100) * (H - T - B);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.score).toFixed(1)}`).join("");
  const area = line + `L${xs(pts.length - 1).toFixed(1)},${ys(0)}L${xs(0).toFixed(1)},${ys(0)}Z`;
  const last = pts[pts.length - 1]!;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tahmini puan geçmişi, son değer ${last.score}">
    ${[0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">${v}</text>`).join("")}
    ${target ? `<line x1="${L}" x2="${W - R}" y1="${ys(target)}" y2="${ys(target)}" stroke="var(--ink)" stroke-dasharray="5 5" stroke-width="1" opacity=".6"/>` : ""}
    <path d="${area}" fill="var(--chip)" opacity=".12"/>
    <path d="${line}" fill="none" stroke="var(--chip)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    ${pts.map((p, i) => `<circle cx="${xs(i)}" cy="${ys(p.score)}" r="${i === pts.length - 1 ? 5 : 3}" fill="${i === pts.length - 1 ? "var(--gold)" : "var(--chip)"}"><title>${esc(p.label)}: ${p.score}</title></circle>`).join("")}
    ${pts.map((p, i) => (pts.length <= 7 || i % 2 === 0 || i === pts.length - 1) ? `<text x="${xs(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="JetBrains Mono, monospace">${esc(p.label)}</text>` : "").join("")}
    <text x="${xs(pts.length - 1) - 8}" y="${ys(last.score) - 9}" text-anchor="end" font-size="13" font-weight="700" fill="var(--ink)">${last.score}</text>
  </svg>`;
}
