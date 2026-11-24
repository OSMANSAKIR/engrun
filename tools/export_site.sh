#!/bin/sh
# Yayınlanacak dosyaları hedef klasöre kopyalar (data/private ve work/ hariç).
#   tools/export_site.sh ~/website/public/yds
set -eu
dest=${1:?hedef klasör ver, ör. ~/website/public/yds}
cd "$(dirname "$0")/.."
rm -rf "$dest"
mkdir -p "$dest/data/generated" "$dest/fonts"
cp index.html LICENSE "$dest/"
cp data/manifest.json data/dict.json data/LICENSE.md "$dest/data/"
cp data/generated/*.json "$dest/data/generated/"
cp fonts/* "$dest/fonts/"
echo "kopyalandı: $dest ($(find "$dest" -type f | wc -l | tr -d ' ') dosya)"
