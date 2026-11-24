"""claude.ai Artifact sürümünü work/artifact/ altına derler (repoya girmez).

Herkese açık sürümden farkı:
  - data/private/ altındaki kişisel kullanım kitapçıkları manifest'e eklenir,
  - CSP meta satırı çıkarılır (claude.ai kendi köprü scriptlerini sayfaya ekliyor; CSP onları engellerdi),
  - sayfa claude.ai'nin beklediği gibi iskeletsiz (doctype/html/head/body olmadan) yazılır.

Kullanım:  python3 -I tools/build_artifact.py
Sonra Artifact'i root=work/artifact, file_path=work/artifact/index.html ile yayınla; çıktıdaki dosya listesi `files` olur.
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "work/artifact"


def page():
    s = (ROOT / "index.html").read_text(encoding="utf-8")
    s = re.sub(r"<!--[^>]*-->\n<meta http-equiv=\"Content-Security-Policy\"[^>]*>\n", "", s)
    s = re.sub(r"^(<!doctype html>|<html[^>]*>|<head>|</head>|<body>|</body>|</html>)\n", "", s, flags=re.M | re.I)
    s = re.sub(r'<meta name="viewport"[^>]*>\n', "", s)
    assert "Content-Security-Policy" not in s and "<body>" not in s
    return s


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "data").mkdir(parents=True)
    (OUT / "index.html").write_text(page(), encoding="utf-8")
    man = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
    priv_path = ROOT / "data/private/manifest.json"
    priv = json.loads(priv_path.read_text(encoding="utf-8")) if priv_path.exists() else {}
    man["booklets"] = priv.get("booklets", []) + man.get("booklets", [])
    (OUT / "data/manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
    files = ["data/manifest.json", "data/dict.json"]
    shutil.copy(ROOT / "data/dict.json", OUT / "data/dict.json")
    for e in man["booklets"] + man.get("generated", []):
        f = e if isinstance(e, str) else e["file"]
        (OUT / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / f, OUT / f)
        files.append(f)
    for d in ("fonts", "assets"):
        for f in sorted((ROOT / d).iterdir()):
            if f.suffix in (".css", ".woff2", ".svg", ".png"):
                (OUT / d).mkdir(exist_ok=True)
                shutil.copy(f, OUT / d / f.name)
                files.append(d + "/" + f.name)
    print(json.dumps(files, ensure_ascii=False))


if __name__ == "__main__":
    main()
