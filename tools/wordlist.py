"""Sorulardaki tüm İngilizce kelime biçimlerini çıkarır; sözlükte (data/dict.json) olmayanları listeler.

Kullanım:
  python3 -I tools/wordlist.py               → eksik biçim sayısı
  python3 -I tools/wordlist.py --missing N   → eksikleri N'lik parçalara böler: work/dict/todo-XX.txt

Kelime ayırma kuralı src/core/words.ts'teki WORD_RE / wordKey ile aynıdır (küçük harf, ’ → ', sondaki 's atılır).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORD = re.compile(r"[^\W\d_](?:[^\W\d_]|['’-])*[^\W\d_]|[^\W\d_]")
TURKISH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")


def word_key(w):
    k = w.lower().replace("’", "'")
    k = re.sub(r"'s$", "", k)
    return k.strip("-")


def lemma_cands(k):
    """src/core/words.ts'teki lemmaCands ile aynı: çekim eklerini atarak sözlük biçimi adayları üretir."""
    c = [k]

    def add(x):
        if len(x) > 2 and x not in c:
            c.append(x)
    if k.endswith("ies"):
        add(k[:-3] + "y")
    if k.endswith("es"):
        add(k[:-2])
    if k.endswith("s") and not k.endswith("ss"):
        add(k[:-1])
    if k.endswith("ied"):
        add(k[:-3] + "y")
    if k.endswith("ed"):
        add(k[:-2]); add(k[:-1])
        if re.search(r"(.)\1ed$", k):
            add(k[:-3])
    if k.endswith("ing"):
        add(k[:-3]); add(k[:-3] + "e")
        if re.search(r"(.)\1ing$", k):
            add(k[:-4])
    if k.endswith("ily"):
        add(k[:-3] + "y")
    if k.endswith("ly"):
        add(k[:-2])
    return c


def forms():
    c = Counter()

    def add(t):
        if not t or TURKISH.search(t):
            return
        for m in WORD.finditer(t):
            k = word_key(m.group(0))
            if len(k) >= 2:
                c[k] += 1

    man = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
    for e in man.get("booklets", []) + man.get("generated", []):
        d = json.loads((ROOT / (e if isinstance(e, str) else e["file"])).read_text(encoding="utf-8"))
        for p in d.get("passages", []):
            add(p.get("text"))
        for q in d.get("questions", []):
            add(q.get("stem"))
            for v in (q.get("options") or {}).values():
                add(v)
    return c


def main():
    c = forms()
    dict_path = ROOT / "data/dict.json"
    known = set()
    if dict_path.exists():
        d = json.loads(dict_path.read_text(encoding="utf-8"))
        known = set(d.get("forms", {})) | set(d.get("lemmas", {}))
    # Uygulama çekimli biçimi ekleri atarak da bulur (lemmaCands); onları eksik sayma.
    missing = sorted(k for k in c if not any(x in known for x in lemma_cands(k)))
    print(f"{len(c)} biçim · sözlükte {len(c) - len(missing)} · eksik {len(missing)}")
    if "--missing" in sys.argv:
        n = int(sys.argv[sys.argv.index("--missing") + 1])
        out = ROOT / "work/dict"
        out.mkdir(parents=True, exist_ok=True)
        for i in range(0, len(missing), n):
            (out / f"todo-{i // n + 1:02d}.txt").write_text("\n".join(missing[i:i + n]) + "\n", encoding="utf-8")
        print(f"{(len(missing) + n - 1) // n} parça yazıldı → work/dict/")


if __name__ == "__main__":
    main()
