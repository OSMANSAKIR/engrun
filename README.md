# YDS Koşusu

YDS, e-YDS ve YÖKDİL'e hazırlananlar için oyunlaştırılmış bir çalışma uygulaması. Tek bir HTML dosyası.
Framework, sunucu ya da hesap gerekmez; ilerleme tarayıcıda saklanır.

## Neler var
- **Hedef ve yol haritası:** Sınavını (YDS, e-YDS, YÖKDİL) ve ÖSYM takviminden tarihini seç. Uygulama, kalan güne göre günlük
  bir plan çıkarır: zayıf bölümler, yarım ve tam denemeler, son günlerde kırmızı deste. Plan her gün sonuçlarına göre yeniden hesaplanır.
- **Seviye testi:** 28 soru, 65 dakika. Tahmini puanı ve sınavda en çok puan kaybettiren bölümleri gösterir.
- **Açıklamalı sorular:** Doğru şıkkın neden doğru, her yanlış şıkkın neden yanlış olduğu, ipucu kelimeler ve bölüm taktikleri.
- **Kelime işaretleme ve sözlük:** Sorudaki bilmediğin kelimeye dokun; anlamı site içindeki sözlükten gelir ve kelime kartlarına eklenir.
- **Aralıklı tekrar:** Yanlışlar ve "Eminim" deyip yanıldıkların (kırmızı deste) belirli aralıklarla geri gelir.
- **Koşu modu:** Bölümler kapı kapı; çip × çarpan puanı, kalpler, jokerler. Müzik ve efektler tarayıcıda üretilir, ses dosyası yok.
- **Deneme modu:** Süreli, sessiz, açıklamasız; sınav biçimine göre bölüm dağılımı.
- **İsteğe bağlı Claude özellikleri:** Kendi Anthropic API anahtarını girersen "Bunu farklı açıkla" ve "Benzer soru üret" açılır.

## Çalıştırma
```sh
python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```
Dosyayı doğrudan açmak (`file://`) çalışmaz, çünkü sorular `fetch` ile yüklenir. Herhangi bir statik sunucu (GitHub Pages, Netlify, kendi siten) yeterli.

## API anahtarı ve gizlilik
- Anahtar yalnızca tarayıcıda durur: varsayılan olarak sekme kapanınca silinir, "Bu cihazda hatırla" seçilirse `localStorage`'da kalır.
  İlerleme kayıtlarına hiç yazılmaz ve yalnızca `api.anthropic.com`'a gönderilir.
- Sayfadaki Content-Security-Policy, dışarıya yalnızca `api.anthropic.com` bağlantısına izin verir. Dış script ya da font yüklenmez.
- Bu iş için ayrı bir anahtar oluşturup [Anthropic Console](https://console.anthropic.com)'da harcama sınırı koyman önerilir.
- Üretilen her benzer soru, cevabı görmeyen ikinci bir çağrıyla yeniden çözülür. Cevaplar uyuşmazsa soru gösterilmez.

## Sorular hakkında
Toplam 420 soru: YDS biçiminde 4 tam deneme seti (4 × 80) ve konu bazlı 100 ek soru.
Buradaki sorular ÖSYM sorusu **değildir**. Sınavın biçimini, zorluğunu ve ölçtüğü becerileri taklit eden özgün sorulardır.
- 320 deneme sorusunun her biri, cevabı görmeyen ikinci bir çözümle doğrulandı; hepsinde iki çözüm aynı cevabı verdi.
- Paragraflar fen, sağlık ve sosyal bilimler alanlarına dağıtıldı (`field`). YÖKDİL'e hazırlananlara kendi alanlarının metinleri önce gelir.
- Paragraflardaki tarih ve rakamlar genel bilgiye dayanır, tek tek kaynakla doğrulanmadı. Hata görürsen issue açabilirsin.

ÖSYM soruları telif kapsamındadır ve bu depoya eklenmemelidir.

## Klasörler
| Yol | İçerik |
|---|---|
| `index.html` | Uygulamanın tamamı (stil, oyun, ses, depolama) |
| `data/manifest.json` | Yüklenecek soru dosyalarının listesi |
| `data/generated/` | Özgün soru setleri (`set-01`…`set-04` tam denemeler) |
| `data/dict.json` | İngilizce-Türkçe sözlük (sorulardaki tüm kelimeler) |
| `tools/export_site.sh` | Yayınlanacak dosyaları başka bir klasöre (ör. bir sitenin `public/` klasörüne) kopyalar |
| `fonts/` | Bungee, JetBrains Mono, Nunito (SIL OFL 1.1) |
| `tools/SCHEMA.md` | Soru JSON biçimi ve özgün soru kuralları |
| `tools/validate.py` | Soru dosyalarını denetler |
| `tools/wordlist.py`, `tools/build_dict.py` | Sözlükte eksik kelimeleri bulur ve sözlüğe ekler |

## Lisans
- **Kod** (`index.html`, `tools/`): [MIT](LICENSE)
- **Sorular ve sözlük** (`data/`): [CC BY-NC 4.0](data/LICENSE.md). Kaynak göstererek, ticari olmayan her amaçla kullanabilirsin.
- **Fontlar** (`fonts/`): SIL Open Font License 1.1

## Sınav takvimi
Tarihler ÖSYM'nin 2026-2027 takviminden alınmıştır (`EXAM_CALENDAR`, `index.html`). Takvim değişebilir;
başvurudan önce [osym.gov.tr](https://www.osym.gov.tr)'den kontrol et.
