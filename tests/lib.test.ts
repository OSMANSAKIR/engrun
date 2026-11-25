import { describe, expect, it } from "vitest";
import { clamp, esc, fmtHMS, fmtSec, pct, safeId } from "../src/lib/format";
import { shuffle } from "../src/lib/random";
import { dayKey, parseDay, startOfDay } from "../src/lib/time";

describe("biçimlendirme", () => {
  it("HTML özel karakterlerini kaçırır", () => {
    expect(esc(`<img src=x onerror="a('b')">&`)).toBe("&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
    expect(esc(null)).toBe("");
  });

  it("süreleri biçimler", () => {
    expect(fmtSec(75)).toBe("1:15");
    expect(fmtSec(-3)).toBe("0:00");
    expect(fmtHMS(65_000)).toBe("1:05");
    expect(fmtHMS(3_725_000)).toBe("1:02:05");
  });

  it("yüzde ve sınırlar", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(5, 0)).toBe(0);
    expect(clamp(120, 20, 98)).toBe(98);
  });

  it("güvenli belge kimliği üretir", () => {
    expect(safeId("Hello World/ş")).toBe("hello_world__");
    expect(safeId("")).toBe("x");
  });
});

describe("tarih", () => {
  it("dayKey ve parseDay birbirinin tersi", () => {
    const t = parseDay("2027-03-28");
    expect(dayKey(t)).toBe("2027-03-28");
    expect(startOfDay(t + 5 * 3600_000)).toBe(t);
  });
});

describe("shuffle", () => {
  it("girdiyi değiştirmez, aynı elemanları döndürür", () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
    expect([...b].sort()).toEqual(a);
  });
});
