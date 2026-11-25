import { describe, expect, it } from "vitest";
import { chipMul, gateTarget, multOf, parOf, scoreCorrect } from "../src/core/scoring";

describe("çarpan", () => {
  it("her ardışık doğru +0,25, en fazla ×3", () => {
    expect(multOf(0)).toBe(1);
    expect(multOf(3)).toBe(1.75);
    expect(multOf(100)).toBe(3);
  });

  it("par, eleme ve 'Eminim' bonusları sırasıyla uygulanır", () => {
    // (1 + 0,5 + 0,5) × 1,5 = 3 → 20 çip × 3 = 60
    const r = scoreCorrect(20, 0, { underPar: true, elimHit: true, sure: true });
    expect(r.m).toBe(3);
    expect(r.pts).toBe(60);
    expect(r.bonus).toEqual(["par +0,5", "eleme +0,5", "eminim ×1,5"]);
  });

  it("bonus yoksa yalnızca combo çarpanı", () => {
    expect(scoreCorrect(10, 2, { underPar: false, elimHit: false, sure: false })).toEqual({ m: 1.5, pts: 15, bonus: [] });
  });
});

describe("jokerler", () => {
  it("Bağlaç Gözü bağlaç etiketli soruda çipi ikiye katlar", () => {
    expect(chipMul({ section: "cloze", tags: ["conj.contrast"] }, ["conj_eye"])).toBe(2);
    expect(chipMul({ section: "cloze", tags: ["conj.contrast"] }, [])).toBe(1);
  });

  it("Çevirmen iki çeviri bölümünde de çalışır", () => {
    expect(chipMul({ section: "trans_tr_en" }, ["translator"])).toBe(2);
  });

  it("Hızlı Okur okuma bölümlerine 30 sn ekler, diğerlerine eklemez", () => {
    expect(parOf({ section: "reading" }, ["fast_reader"])).toBe(180);
    expect(parOf({ section: "grammar" }, ["fast_reader"])).toBe(45);
  });
});

describe("kapı hedefi", () => {
  it("×1 çarpanla tam puanın %80'i", () => {
    expect(gateTarget("vocab", 5)).toBe(40);
    expect(gateTarget("reading", 4)).toBe(80);
  });
});
