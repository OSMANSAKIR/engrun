export const DAY = 86_400_000;

/** Yerel saate göre "YYYY-AA-GG". */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "YYYY-AA-GG" → o günün yerel gece yarısı. */
export const parseDay = (d: string): number => {
  const [y = 1970, m = 1, dd = 1] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).getTime();
};

export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
