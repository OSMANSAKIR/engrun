import { beforeEach, describe, expect, it } from "vitest";
import { buildGenerated, parseJsonLoose } from "../src/core/ai";
import { dictLookup, lemmaCands, normEn, wordKey } from "../src/core/words";
import { makeQ, reset } from "./helpers";

beforeEach(reset);

describe("Claude cevabından JSON", () => {
  it("kod bloğu ve önsöz olsa da JSON'u bulur", () => {
    expect(parseJsonLoose('İşte:\n```json\n{"answer":"C"}\n```')).toEqual({ answer: "C" });
    expect(parseJsonLoose('[{"w":"x"}] bitti')).toEqual([{ w: "x" }]);
  });

  it("JSON yoksa invalid_json hatası", () => {
    expect(() => parseJsonLoose("üzgünüm")).toThrow(expect.objectContaining({ code: "invalid_json" }));
  });
});

describe("üretilen sorunun denetimi", () => {
  const valid = {
    stem: "Although it rained, we ---- the match.", options: { A: "won", B: "lost", C: "had", D: "made", E: "took" },
    answer: "a", explain: { short: "Zıtlık", others: { B: "x" }, clues: ["Although", 5] },
    tags: ["conj.contrast", "uydurma.etiket"], vocab: [{ en: "match", tr: "maç" }, { en: 1 }]
  };

  it("geçerli soruyu temizleyip kabul eder", () => {
    const g = buildGenerated(valid, makeQ("src", "sentence", { tags: ["conj.time"] }))!;
    expect(g.q.answer).toBe("A");                     // küçük harf düzeltilir
    expect(g.q.tags).toEqual(["conj.contrast"]);      // bilinmeyen etiket atılır
    expect(g.q.explain!.clues).toEqual(["Although"]);
    expect(g.q.vocab).toEqual([{ en: "match", tr: "maç" }]);
    expect(Object.keys(g.q.explain!.others!)).toEqual(["B", "C", "D", "E"]);
    expect(g.q.generatedFrom).toBe("src");
    expect(g.passage).toBeNull();
  });

  it.each([
    ["eksik şık", { ...valid, options: { A: "a", B: "b", C: "c", D: "d" } }],
    ["geçersiz cevap", { ...valid, answer: "F" }],
    ["açıklama yok", { ...valid, explain: {} }],
    ["boş soru kökü", { ...valid, stem: "  " }]
  ])("reddeder: %s", (_name, raw) => {
    expect(buildGenerated(raw, makeQ("src", "sentence"))).toBeNull();
  });

  it("cloze paragrafında boşluğu (1)---- biçimine çevirir", () => {
    const raw = { ...valid, stem: "", passage: { text: "Scientists have long argued that sleep matters; ---- new studies confirm it.", tr: "özet" } };
    const g = buildGenerated(raw, makeQ("src", "cloze"))!;
    expect(g.passage!.text).toContain("(1)----");
    expect(g.q.passage).toBe(g.passage!.id);
    expect(g.q.n).toBe(1);
  });
});

describe("kelime", () => {
  it("anahtar ve kök adayları", () => {
    expect(wordKey("Government’s")).toBe("government");
    expect(lemmaCands("studies")).toContain("study");
    expect(lemmaCands("stopped")).toContain("stop");
    expect(lemmaCands("making")).toContain("make");
    expect(normEn("to curtail (sth)")).toBe("curtail");
    expect(normEn("take part")).toBeNull();
  });

  it("sözlükte çekimli biçimden anlam bulur", () => {
    const dict = { lemmas: { curtail: "kısıtlamak" }, forms: { curtailed: "curtail" } };
    expect(dictLookup("curtailed", dict)).toEqual({ en: "curtail", tr: "kısıtlamak" });
    expect(dictLookup("curtails", dict)).toEqual({ en: "curtail", tr: "kısıtlamak" });
    expect(dictLookup("unknown", dict)).toBeNull();
  });
});
