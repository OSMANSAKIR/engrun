#!/bin/sh
# Derlenmiş siteyi (dist/) hedef klasöre kopyalar. data/private ve work/ zaten derlemeye girmez.
#   tools/export_site.sh ~/website/public/engrun
set -eu
dest=${1:?hedef klasör ver, ör. ~/website/public/engrun}
cd "$(dirname "$0")/.."
npm run build
rm -rf "$dest"
mkdir -p "$dest"
cp -R dist/. "$dest/"
echo "kopyalandı: $dest ($(find "$dest" -type f | wc -l | tr -d ' ') dosya)"
