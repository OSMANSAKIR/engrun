"""Soru JSON'larını SCHEMA.md'ye göre denetler.

Kullanım: python3 -I tools/validate.py [dosya.json ...]   (dosya verilmezse data/manifest.json'daki hepsi)
80 soruluk tam setlerde numara ve bölüm dağılımı da YDS biçimine göre kontrol edilir.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = ["vocab", "grammar", "cloze", "sentence", "trans_en_tr", "trans_tr_en",
            "reading", "dialogue", "restatement", "para_completion", "irrelevant"]
EXPECTED = {"vocab": 6, "grammar": 10, "cloze": 10, "sentence": 10, "trans_en_tr": 3,
            "trans_tr_en": 3, "reading": 20, "dialogue": 5, "restatement": 4,
            "para_completion": 4, "irrelevant": 5}
TAG_PREFIXES = ("vocab.", "grammar.", "conj.", "trans.", "reading.", "dialogue.",
                "restate.", "para.", "irrelevant.")
LETTERS = list("ABCDE")


def check(path):
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    errs, warns = [], []
    qs = d.get("questions", [])
    passages = {p["id"]: p for p in d.get("passages", [])}
    if len(qs) == 80:
        nums = Counter(q.get("n") for q in qs)
        for n in range(1, 81):
            if nums[n] == 0:
                errs.append(f"{n}. soru yok")
            elif nums[n] > 1:
                errs.append(f"{n}. soru {nums[n]} kez var")
        sec = Counter(q.get("section") for q in qs)
        for s, c in EXPECTED.items():
            if sec[s] != c:
                warns.append(f"bölüm {s}: {sec[s]} soru (beklenen {c})")
    ids = Counter(q.get("id") for q in qs)
    errs += [f"{i} kimliği {c} kez var" for i, c in ids.items() if c > 1]
    for q in qs:
        tag = f"{q.get('n')}."
        if q.get("missing"):
            warns.append(f"{tag} eksik işaretli")
            continue
        if q.get("section") not in SECTIONS:
            errs.append(f"{tag} bilinmeyen bölüm {q.get('section')}")
        opts = q.get("options") or {}
        if sorted(opts) != LETTERS or not all(str(v).strip() for v in opts.values()):
            errs.append(f"{tag} şıklar eksik")
        if q.get("answer") not in LETTERS:
            errs.append(f"{tag} cevap yok")
        if q.get("passage") and q["passage"] not in passages:
            errs.append(f"{tag} paragraf {q['passage']} bulunamadı")
        if q.get("section") in ("cloze", "reading") and not q.get("passage"):
            errs.append(f"{tag} paragraf bağlantısı yok")
        ex = q.get("explain") or {}
        if not ex.get("short") or not ex.get("why"):
            errs.append(f"{tag} açıklama eksik")
        others = ex.get("others") or {}
        if set(others) != set(LETTERS) - {q.get("answer")}:
            warns.append(f"{tag} yanlış şık açıklamaları eksik")
        tags = q.get("tags") or []
        if not tags or not all(t.startswith(TAG_PREFIXES) for t in tags):
            warns.append(f"{tag} etiket sorunu {tags}")
    return d, errs, warns


def balance(books):
    c = Counter(q.get("answer") for d in books for q in d.get("questions", []))
    n = sum(c.values())
    if n:
        print("\nCevap harfi dağılımı: " + " ".join(f"{L} %{100 * c[L] / n:.0f}" for L in LETTERS))


def main():
    if sys.argv[1:]:
        paths = sys.argv[1:]
    else:
        man = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
        paths = [str(ROOT / (e if isinstance(e, str) else e["file"])) for e in man.get("booklets", []) + man.get("generated", [])]
    books, bad = [], False
    for p in paths:
        d, errs, warns = check(p)
        books.append(d)
        print(f"\n## {Path(p).name}: {len(d.get('questions', []))} soru · {len(errs)} hata · {len(warns)} uyarı")
        for e in errs:
            print("  HATA ", e)
        for w in warns:
            print("  uyarı", w)
        bad |= bool(errs)
    balance(books)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
