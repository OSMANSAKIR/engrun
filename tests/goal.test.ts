import { beforeEach, describe, expect, it } from "vitest";
import { EXAM_TYPES } from "../src/config/exams";
import { SECTIONS } from "../src/config/sections";
import { EXAM_DIST, examSections, REAL, scaleDist, secTarget, targetNote } from "../src/core/goal";
import { reset, setGoal } from "./helpers";

beforeEach(reset);

describe("hedef puan", () => {
  it("hedef yoksa bölüm hedefi de yok", () => {
    setGoal(null);
    expect(secTarget("reading")).toBeNull();
  });

  it("yavaş bölümler 10 puan altta, diğerleri 5 puan üstte", () => {
    setGoal(70);
    expect(secTarget("reading")).toBeCloseTo(.60);
    expect(secTarget("grammar")).toBeCloseTo(.75);
  });

  // Bölüm hedefleri gerçek soru sayılarıyla tartılınca seçilen puana denk gelmeli (80 soru × 1,25).
  it.each([50, 60, 70, 80, 90])("%i hedefinde bölüm hedefleri toplamda hedefe denk gelir", target => {
    setGoal(target);
    const correct = examSections().reduce((sum, s) => sum + secTarget(s)! * REAL(s), 0);
    expect(Math.abs(correct * 1.25 - target)).toBeLessThan(1.5);
  });

  it("gereken doğru sayısını söyler", () => {
    expect(targetNote(70)).toContain("en az 56 doğru");
  });
});

describe("deneme dağılımı", () => {
  it("YDS tam deneme 80 soru", () => {
    setGoal(70, "yds");
    expect(Object.values(EXAM_DIST.full).reduce((a, b) => a + b, 0)).toBe(80);
  });

  it.each(["yds", "yokdil"] as const)("%s: yarım deneme 40, seviye testi 28 soru ve her bölümden en az 1", exam => {
    setGoal(70, exam);
    const sum = (d: Partial<Record<string, number>>) => Object.values(d).reduce((a: number, b) => a + (b || 0), 0);
    expect(sum(EXAM_DIST.half)).toBe(40);
    const p = EXAM_DIST.placement;
    expect(sum(p)).toBe(28);
    for (const s of examSections()) expect(p[s]).toBeGreaterThanOrEqual(1);
  });

  it("YÖKDİL'de diyalog ve yakın anlam yok", () => {
    setGoal(70, "yokdil");
    expect(examSections()).not.toContain("dialogue");
    expect(examSections()).not.toContain("restatement");
    expect(Object.keys(scaleDist(40))).not.toContain("dialogue");
  });

  it("her sınav biçimi 80 soru", () => {
    for (const x of Object.values(EXAM_TYPES)) expect(SECTIONS.reduce((a, s) => a + x.real[s], 0)).toBe(80);
  });
});
