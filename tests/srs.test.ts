import { beforeEach, describe, expect, it } from "vitest";
import { SESSION } from "../src/core/attempts";
import { dueQuestions, srsAfterAnswer, srsBoxes, srsGet, srsIsDue } from "../src/core/srs";
import { Store } from "../src/core/store";
import { DAY, startOfDay } from "../src/lib/time";
import { makeQ, reset } from "./helpers";

beforeEach(reset);

describe("aralıklı tekrar", () => {
  it("'Eminim' deyip yanlış: kutu 0 ve kırmızı", () => {
    const q = makeQ("q1", "grammar");
    srsAfterAnswer(q, false, "sure");
    const e = srsGet("q1")!;
    expect(e.box).toBe(0);
    expect(e.red).toBe(true);
    expect(e.wrong).toBe(1);
    expect(e.reAfter).toBe(SESSION.count + 10);
  });

  it("kutu 0'daki soru aynı oturumda ~10 soru sonra vadesi gelir", () => {
    const q = makeQ("q1", "grammar");
    srsAfterAnswer(q, false, "unsure");
    expect(srsIsDue(srsGet("q1"))).toBe(false);
    SESSION.count += 10;
    expect(srsIsDue(srsGet("q1"))).toBe(true);
  });

  it("tahminle doğru da tekrar listesine girer", () => {
    const q = makeQ("q1", "vocab");
    srsAfterAnswer(q, true, "guess");
    expect(srsGet("q1")!.box).toBe(0);
  });

  it("ilk seferde 'Kararsızım' + doğru: kutu 1, yarın", () => {
    const q = makeQ("q1", "vocab");
    srsAfterAnswer(q, true, "unsure");
    const e = srsGet("q1")!;
    expect(e.box).toBe(1);
    expect(e.due).toBe(startOfDay() + DAY);
  });

  it("ilk seferde 'Eminim' + doğru: kayıt açılmaz", () => {
    const q = makeQ("q1", "vocab");
    srsAfterAnswer(q, true, "sure");
    expect(srsGet("q1")).toBeNull();
  });

  it("vadesi gelmeden doğru bilmek kutu atlatmaz; vadesi gelince bir üst kutu", () => {
    const q = makeQ("q1", "vocab");
    Store.srs.q1 = { kind: "q", qid: "q1", box: 1, due: Date.now() + DAY, red: true, last: 0 };
    srsAfterAnswer(q, true, "sure");
    expect(srsGet("q1")!.box).toBe(1);
    Store.srs.q1 = { ...srsGet("q1")!, due: Date.now() - 1 };
    srsAfterAnswer(q, true, "sure");
    const e = srsGet("q1")!;
    expect(e.box).toBe(2);
    expect(e.red).toBe(false);               // kutu 2'ye çıkan soru artık kırmızı değil
    expect(e.due).toBe(startOfDay() + 3 * DAY);
  });

  it("deste: önce kırmızılar, kelime kartları hariç", () => {
    makeQ("a", "vocab"); makeQ("b", "vocab");
    Store.srs.a = { kind: "q", qid: "a", box: 1, due: 0, red: false, last: 0 };
    Store.srs.b = { kind: "q", qid: "b", box: 1, due: 0, red: true, last: 0 };
    Store.srs["v:word"] = { kind: "v", en: "word", tr: "kelime", box: 0, due: 0, last: 0 };
    expect(dueQuestions().map(e => e.qid)).toEqual(["b", "a"]);
    expect(srsBoxes()).toEqual({ c: [0, 2, 0, 0, 0], red: 1 });
  });
});
