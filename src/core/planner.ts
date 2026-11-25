/* Yol haritası: sınava kalan güne ve sonuçlara göre her günün türü ve odak bölümleri. Her gün yeniden hesaplanır. */
import { SEC, SLOW_SECTIONS, type Section } from "../config/sections";
import { STRATEGY } from "../config/strategy";
import { DAY, parseDay, startOfDay } from "../lib/time";
import { allAttempts } from "./attempts";
import { daysLeft, examSections, G, REAL, secTarget } from "./goal";
import { secStats } from "./stats";
import { S } from "./store";

export type DayKind = "placement" | "focus" | "half" | "full" | "light" | "red" | "eve" | "exam" | "after";

// Günün türü: sınava kalan gün (L) ve plan başından beri geçen gün (i) belirler.
// Uzak: 5 odak günü + 1 yarım deneme + 1 hafif gün. Son 35 gün: 4 günde bir yarım deneme.
// Son 14 gün: 4 tam deneme (14, 10, 7, 4 gün kala), son 3 gün kırmızı deste, son gün yeni konu yok.
export function dayKind(L: number | null, i: number, minutes: number): DayKind {
  if (L != null) {
    if (L < 0) return "after";
    if (L === 0) return "exam";
    if (L === 1) return "eve";
    if (L <= 14) return [14, 10, 7, 4].includes(L) ? (minutes >= 90 ? "full" : "half") : L <= 3 ? "red" : "focus";
    if (L <= 35) return i % 4 === 3 ? "half" : "focus";
  }
  return i % 7 === 5 ? "half" : i % 7 === 6 ? "light" : "focus";
}

export interface Priority { s: Section; acc: number; known: boolean; gain: number; score: number }
export interface PlanDay { day: number; L: number | null; kind: DayKind; secs: Priority[] }

// Önümüzdeki n günün planı. Odak günlerinde bölüm seçimi: sınavda kaybettirdiği tahmini soru × ne zamandır çalışılmadığı.
// Böylece zayıf ve büyük bölümler (okuma gibi) sık, küçük bölümler daha seyrek ama düzenli gelir.
export function planDays(n: number): PlanDay[] {
  const g = G(); const L0 = daysLeft(); const t0 = startOfDay();
  const start = g?.start ? parseDay(g.start) : t0;
  const all = allAttempts(); const atts = all.filter(a => a.ts < t0);
  const st = secStats(atts); const secs = examSections();
  const known = secs.filter(s => st[s].racc != null);
  const avg = known.length ? known.reduce((a, s) => a + st[s].racc!, 0) / known.length : .5;
  const last: Partial<Record<Section, number>> = {};
  for (const a of atts) if (a.mode !== "exam") last[a.section] = a.ts;
  const needPlacement = !S().placementTs && all.length < 30;
  const out: PlanDay[] = [];
  for (let k = 0; k < n; k++) {
    const day = t0 + k * DAY, L = L0 == null ? null : L0 - k, i = Math.max(0, Math.round((day - start) / DAY));
    const kind = k === 0 && needPlacement && (L == null || L > 1) ? "placement" : dayKind(L, i, g?.minutes || 60);
    const e: PlanDay = { day, L, kind, secs: [] };
    if (kind === "focus") {
      const pr = secs.map((s): Priority => {
        const racc = st[s].racc;
        const acc = racc ?? Math.min(avg, .5);
        const seen = last[s];
        const idle = seen ? Math.min(14, (day - seen) / DAY) : 14;
        // Hedefe uzaklık: hedefin 10 puan üstüne kadar her bölüm biraz çalışılır; hedef yoksa (1 - başarı).
        const tg = secTarget(s), gap = tg == null ? 1 - acc : Math.max(.05, tg + .1 - acc);
        return { s, acc, known: racc != null, gain: gap * REAL(s), score: gap * REAL(s) * (.25 + idle / 4) };
      }).sort((a, b) => b.score - a.score);
      const a = pr[0];
      // İkinci bölüm, birincinin karşı grubundan (hızlı ↔ yavaş gelişen): gün tek tip olmasın.
      const b = a && (pr.find(x => SLOW_SECTIONS.has(x.s) !== SLOW_SECTIONS.has(a.s)) || pr[1]);
      e.secs = [a, b].filter((x): x is Priority => !!x);
      for (const x of e.secs) last[x.s] = day;
    }
    out.push(e);
  }
  return out;
}

export interface PlanEntry { title: string; short: string; text: string; acts: [label: string, action: string][]; exam?: number }

export function planEntry(e: PlanDay): PlanEntry {
  const tip = (sec: Section) => { const l = STRATEGY[sec].filter(t => !t.startsWith("⚠️")); return l[Math.round(e.day / DAY) % l.length]; };
  switch (e.kind) {
    case "placement": return { title: "Seviye testi", short: "Seviye testi", text: "28 soru, 65 dakika, her bölümden soru. Yol haritan bu sonuca göre hangi bölümle başlayacağını seçer.", acts: [["Seviye testine başla", "exam:placement"]], exam: 65 };
    case "half": return { title: "Yarım deneme", short: "Yarım deneme", text: "40 soru, 90 dakika, sessiz ve açıklamasız. Bitince hatalarını incele; sonraki günlerin planı bu sonuca göre değişir.", acts: [["Yarım denemeyi başlat", "exam:half"]], exam: 90 };
    case "full": return { title: "Tam deneme · sınav provası", short: "Tam deneme", text: "80 soru, 180 dakika, tek oturumda. Mümkünse sınavla aynı saatte başla; mola verme.", acts: [["Tam denemeyi başlat", "exam:full"]], exam: 180 };
    case "red": return { title: "Kırmızı deste ve zayıf konular", short: "Kırmızı deste", text: "Yeni bölüm açma. \"Eminim\" deyip yanıldığın sorular ve en zayıf etiketlerin.", acts: [["Tekrar destesi", "review"], ["Zayıf etiketler", "practice:weak"], ["Strateji kartları", "strategy"]] };
    case "eve": return { title: "Son gün: hafif tekrar", short: "Hafif tekrar", text: "Yeni konu yok. Kırmızı deste, strateji kartları ve kelimeler. Erken yat.", acts: [["Tekrar destesi", "review"], ["Strateji kartları", "strategy"]] };
    case "exam": return { title: "Sınav günü", short: "SINAV", text: "Sabah 15 dk strateji kartlarına bak. Kimliğini ve sınav giriş belgeni unutma. Başarılar!", acts: [["Strateji kartları", "strategy"]] };
    case "after": return { title: "Sınav geride kaldı", short: "—", text: "Sonucunu bekliyorsan ya da yeniden gireceksen yeni bir hedef seç; plan ona göre kurulsun.", acts: [["Yeni hedef seç", "goal"]] };
    case "light": return { title: "Hafif gün: tekrar ve kelime", short: "Hafif gün", text: "Haftanın yükünü hafiflet: vadesi gelen tekrarlar ve kelime kartları.", acts: [["Tekrar destesi", "review"], ["Kelime kartları", "vocab"]] };
    case "focus": break;
  }
  const [a, b] = e.secs;
  if (!a) return { title: "Antrenman", short: "Antrenman", text: "Bu sınavda çalışılacak bölüm bulunamadı.", acts: [["Zayıf etiketler", "practice:weak"]] };
  const why = a.known ? `${SEC[a.s].tr} şu an %${Math.round(a.acc * 100)}; sınavda ~${Math.round(a.gain)} soru kaybettiriyor.` : `${SEC[a.s].tr} için henüz yeterli veri yok.`;
  const title = b ? `${SEC[a.s].short} + ${SEC[b.s].short}` : SEC[a.s].short;
  return {
    title, short: title,
    text: `${why} İpucu: ${tip(a.s)}`,
    acts: [[`${SEC[a.s].short} antrenmanı`, "practice:" + a.s], ...(b ? [[`${SEC[b.s].short} antrenmanı`, "practice:" + b.s] as [string, string]] : []), ["Zayıf etiketler", "practice:weak"]]
  };
}
