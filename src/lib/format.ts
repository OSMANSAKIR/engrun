const ESC: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** HTML'e gömülecek her metin buradan geçer. */
export const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, c => ESC[c] ?? c);

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const pct = (a: number, b: number): number => b ? Math.round(100 * a / b) : 0;

/** 75 → "1:15" */
export function fmtSec(s: number): string {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** Geri sayım: 3_725_000 ms → "1:02:05", 65_000 → "1:05" */
export function fmtHMS(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}

export const fmtNum = (n: number): string => (Math.round(n * 100) / 100).toLocaleString("tr-TR");

export const fmtDay = (t: number, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", weekday: "long" }): string =>
  new Date(t).toLocaleDateString("tr-TR", o);

export const uid = (): string => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

/** Veritabanı belge kimliği olarak güvenli metin. */
export const safeId = (s: string): string => String(s).toLowerCase().trim().replace(/[^a-z0-9_\-.~:@+]/g, "_").slice(0, 150) || "x";
