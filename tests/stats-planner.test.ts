import { beforeEach, describe, expect, it } from "vitest";
import { allAttempts } from "../src/core/attempts";
import { examSections } from "../src/core/goal";
import { dayKind, planDays, planEntry } from "../src/core/planner";
import { predicted, secStats, weakTags } from "../src/core/stats";
import { Store } from "../src/core/store";
import { dayKey } from "../src/lib/time";
import { answer, reset, setGoal } from "./helpers";

beforeEach(reset);

describe("tahmini puan", () => {
  it("veri yoksa puan yok", () => {
    expect(predicted([]).score).toBeNull();
  });

  it("her bölümde tam isabet → 100", () => {
    setGoal(70);
    for (const s of examSections()) answer(s, 3, 0);
    expect(predicted(allAttempts())).toMatchObject({ score: 100, correct: 80, missing: 0 });
  });

  it("verisiz bölümler bilinenlerin ortalamasıyla doldurulur", () => {
    setGoal(70);
    answer("grammar", 1, 1);                         // %50
    expect(predicted(allAttempts())).toMatchObject({ score: 50, missing: examSections().length - 1 });
  });

  it("bölüm başarısı son 20 cevaba göre", () => {
    answer("vocab", 0, 10);
    answer("vocab", 20, 0);
    const st = secStats(allAttempts()).vocab;
    expect(st.acc).toBeCloseTo(20 / 30);
    expect(st.racc).toBe(1);
  });
});

describe("zayıf etiketler", () => {
  it("düşük isabetten yükseğe, %100 olanlar hariç", () => {
    const base = { section: "grammar" as const, chosen: null, confidence: null, timeMs: 0, mode: "practice" as const, qid: "x" };
    const atts = [
      { ...base, tags: ["a"], correct: false, ts: 1 }, { ...base, tags: ["a"], correct: true, ts: 2 },
      { ...base, tags: ["b"], correct: false, ts: 3 }, { ...base, tags: ["b"], correct: false, ts: 4 },
      { ...base, tags: ["c"], correct: true, ts: 5 }, { ...base, tags: ["c"], correct: true, ts: 6 }
    ];
    expect(weakTags(atts).map(w => w.tag)).toEqual(["b", "a"]);
  });
});

describe("günün türü", () => {
  it.each([
    [-1, 0, 60, "after"], [0, 0, 60, "exam"], [1, 0, 60, "eve"],
    [14, 0, 120, "full"], [14, 0, 60, "half"], [3, 0, 60, "red"], [5, 0, 60, "focus"],
    [30, 3, 60, "half"], [30, 2, 60, "focus"],
    [null, 5, 60, "half"], [null, 6, 60, "light"], [null, 0, 60, "focus"]
  ] as const)("L=%s, i=%s, %s dk → %s", (L, i, min, kind) => {
    expect(dayKind(L, i, min)).toBe(kind);
  });
});

describe("plan", () => {
  it("ilk gün seviye testi önerir (henüz test yoksa)", () => {
    setGoal(70);
    expect(planDays(1)[0]!.kind).toBe("placement");
  });

  // Plan bugün başlasın: haftalık döngünün 0. günü her zaman odak günü (test tarihe bağlı olmasın).
  const startToday = () => setGoal(70, "yds", { start: dayKey() });

  it("odak gününde en çok soru kaybettiren bölüm önce gelir", () => {
    startToday();
    Store.settings.placementTs = Date.now();
    for (const s of examSections()) answer(s, 9, 1);   // her yer %90
    answer("reading", 0, 20);                           // okuma son 20'de %0 ve sınavda 20 soru
    const day = planDays(1)[0]!;
    expect(day.kind).toBe("focus");
    expect(day.secs[0]!.s).toBe("reading");
    expect(planEntry(day).acts[0]![1]).toBe("practice:reading");
  });

  it("ikinci bölüm karşı gruptan seçilir (yavaş ↔ hızlı)", () => {
    startToday();
    Store.settings.placementTs = Date.now();
    for (const s of examSections()) answer(s, 5, 5);
    const [a, b] = planDays(1)[0]!.secs;
    const slow = new Set(["reading", "restatement", "para_completion"]);
    expect(slow.has(a!.s)).not.toBe(slow.has(b!.s));
  });
});
