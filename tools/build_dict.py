"""Ajanların yazdığı work/dict/out-*.jsonl parçalarını data/dict.json sözlüğüne ekler.

Satır biçimi: {"f": kelime biçimi, "l": sözlük biçimi, "tr": Türkçe anlam}
Sözlük biçimi: {"lemmas": {sözlük biçimi: anlam}, "forms": {biçim: sözlük biçimi}}  (biçim = sözlük biçimiyse forms'a yazılmaz)
Var olan kayıtların üzerine yazmaz; yeni kitapçık eklendiğinde yalnızca eksikler eklenir:
  python3 -I tools/wordlist.py --missing 1000  →  ajanlar out-XX.jsonl yazar  →  python3 -I tools/build_dict.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data/dict.json"


def main():
    d = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"lemmas": {}, "forms": {}}
    rows, bad = [], 0
    for part in sorted((ROOT / "work/dict").glob("out-*.jsonl")):
        for line in part.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                r = json.loads(line)
                f, l = str(r["f"]).strip().lower(), str(r.get("l") or "").strip().lower()
                rows.append((f, l or f, str(r["tr"]).strip()))  # boş sözlük biçimi = kelimenin kendisi
            except (ValueError, KeyError):
                bad += 1
    # Önce sözlük biçiminin kendi satırı (f == l) anlamı belirler, sonra çekimli biçimlerinki.
    rows.sort(key=lambda r: r[0] != r[1])
    added = 0
    for f, l, tr in rows:
        if not tr or not l:
            continue
        if l not in d["lemmas"]:
            d["lemmas"][l] = tr
            added += 1
        if f != l and f not in d["forms"] and f not in d["lemmas"]:
            d["forms"][f] = l
    OUT.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    print(f"{len(rows)} satır · {bad} bozuk · {added} yeni anlam · sözlük: {len(d['lemmas'])} anlam, {len(d['forms'])} biçim · {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
