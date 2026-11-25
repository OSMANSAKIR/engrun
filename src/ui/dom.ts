import { S } from "../core/store";

/** Var olması gereken öğe; yoksa açık bir hata verir. */
export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error("Öğe bulunamadı: " + sel);
  return el;
}
/** Olmayabilecek öğe. */
export const $opt = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

/** Olayın hedefinden yukarı doğru seçiciye uyan ilk öğe. */
export function closest<T extends Element = HTMLElement>(e: Event, sel: string): T | null {
  return e.target instanceof Element ? e.target.closest<T>(sel) : null;
}

export const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Bir yazı alanına mı yazılıyor (kısayollar o zaman çalışmaz)? */
export const typing = (): boolean => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "");

export function vibrate(p: number | number[]): void {
  try { if (S().vibrate !== false && navigator.vibrate) navigator.vibrate(p); } catch { /* desteklenmiyor */ }
}

export function toast(msg: string, ms = 2400): void {
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
