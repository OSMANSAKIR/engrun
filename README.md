# YDS Koşusu

YDS, e-YDS ve YÖKDİL'e hazırlananlar için oyunlaştırılmış bir çalışma uygulaması.

**Hemen dene:** https://osmansakir.github.io/yds-kosusu/

- Tek bir HTML dosyası; framework, kurulum, sunucu ya da hesap gerekmez.
- İlerleme kendi tarayıcında saklanır.
- Telefonda ve bilgisayarda çalışır, açık ve koyu tema var.
- 420 özgün soru: YDS biçiminde 4 tam deneme seti (4 × 80) ve konu bazlı 100 ek soru.

> Buradaki sorular ÖSYM sorusu **değildir**. Sınavın biçimini, zorluğunu ve ölçtüğü becerileri taklit eden, sıfırdan yazılmış sorulardır.

## İçindekiler
- [Neden yapıldı](#neden-yapıldı)
- [Özellikler](#özellikler)
- [Öğrenme ilkeleri](#öğrenme-ilkeleri)
- [Sorular nasıl hazırlandı](#sorular-nasıl-hazırlandı)
- [Çalıştırma](#çalıştırma)
- [API anahtarı ve gizlilik](#api-anahtarı-ve-gizlilik)
- [Klasörler](#klasörler)
- [Soru eklemek](#soru-eklemek)
- [Geliştirme geçmişi](#geliştirme-geçmişi)
- [Bilinen sınırlar](#bilinen-sınırlar)
- [Lisans](#lisans)

## Neden yapıldı
Deneme çözmek tek başına puanı pek yükseltmiyor. Yanlışın nedenini anlamadan bir sonraki denemeye geçince aynı hatalar tekrar ediyor.
YDS Koşusu bu döngüyü kırmak için yapıldı:
- Her yanlışı hemen açıklıyor.
- Hataları sen unutmadan önce sana geri getiriyor.
- Çalışma süreni puanı en hızlı yükseltecek bölümlere yönlendiriyor.

Basit bir örnek: Ayşe'nin okuma hızını iki haftada ikiye katlaması zor. Ama "although'dan sonra cümle, despite'tan sonra isim gelir" kuralını bir günde öğrenip sınavda 3-4 soru kazanabilir.
Uygulama bu yüzden önce hızlı kazanç getiren bölümlere ağırlık verir.

## Özellikler

### Hedef ve yol haritası
- **Sınav seçimi:** İlk açılışta YDS, e-YDS ya da YÖKDİL'i seçersin. YÖKDİL'de alanını da seçersin: Fen, Sağlık ya da Sosyal Bilimler.
- **Tarih, hedef, süre:** Sınav tarihini ÖSYM'nin 2026-2027 takviminden seçersin ya da kendin girersin. Sonra hedef puanını (50-90) ve günlük çalışma süreni (30-120 dk) belirlersin.
- **Plan:** Uygulama kalan güne göre günlük bir plan çıkarır ve sonuçlarına göre her gün yeniden hesaplar.
  - *Sınava 5 haftadan fazla varsa:* Haftada 5 gün zayıf bölüm çalışması, 1 yarım deneme ve 1 hafif gün.
  - *Son 5 hafta:* 4 günde bir yarım deneme.
  - *Son 2 hafta:* Sınava 14, 10, 7 ve 4 gün kala tam deneme. Son 3 gün yalnızca kırmızı deste, sınavdan önceki gün hafif tekrar.
- **Bölüm seçimi:** Her gün, tahmini puanda en çok puan kaybettiren ve en uzun süredir çalışmadığın bölümler öne alınır. Hızlı gelişen bir bölümle yavaş gelişen bir bölüm aynı güne konur.
- **Günün süresi şöyle bölünür:**
  - %17 tekrar
  - %62 ana çalışma
  - %13 kelime kartları
  - %8 o günün hatalarına son bakış
- **Ana sayfa:**
  - geri sayım
  - hedef puan göstergesi ve hedefe kaç doğru kaldığı
  - günün görev listesi
  - önümüzdeki 7 günün planı

### Sınav biçimleri
Her sınavın bölüm dağılımı ayrı tutulur. Tahmini puan, denemeler, seviye testi ve analiz ekranı seçtiğin sınava göre hesaplanır.

| Bölüm | YDS / e-YDS | YÖKDİL |
|---|---|---|
| Kelime | 6 | 10* |
| Gramer | 10 | 10* |
| Paragrafta boşluk (cloze) | 10 | 10 |
| Cümle tamamlama | 10 | 11 |
| Çeviri İng→Tr / Tr→İng | 3 + 3 | 6 + 6 |
| Okuma | 20 | 15 |
| Diyalog tamamlama | 5 | yok |
| Yakın anlam | 4 | yok |
| Paragraf tamamlama | 4 | 6 |
| Anlam bozan cümle | 5 | 6 |

\* YÖKDİL'in ilk 20 sorusunda kelime ve gramer karışık gelir. ÖSYM ayrı sayı vermediği için yarı yarıya sayıldı.

Paragraflar fen, sağlık ve sosyal bilimler alanlarına ayrılmıştır. YÖKDİL'de alanını seçersen önce kendi alanının metinleri gelir.

### Seviye testi
- 28 soru, 65 dakika. Her bölümden en az 1 soru gelir; dağılım gerçek sınavın oranlarına yakındır.
- Sonunda tahmini puanını ve sınavda en çok puan kaybettiren bölümlerini görürsün. Yol haritası buna göre şekillenir.

### Koşu modu
Sınavın bölüm sırasıyla ilerleyen bir oyun. Her bölüm bir "kapı"dır; kapının hedef puanını geçince sonraki bölüm açılır.
- **Puan = çip × çarpan:**
  - Her bölümün çipi ağırlığına göre değişir: kelime 10, okuma 25 gibi.
  - Art arda her doğru, çarpana +0,25 ekler (en fazla ×3).
  - Par sürenin altında cevap vermek ve "Eminim" deyip doğru bilmek bonus kazandırır.
- **Kalpler:** Koşu 5 kalple başlar ve her yanlış bir kalp götürür. Bir kapıyı %80 ve üzeri başarıyla geçersen bir kalp geri gelir.
- **Eleme kartı:** Cevaplamadan önce iki şıkkı eleyebilirsin. Sınavdaki eleme becerisini çalıştırır.
- **Jokerler:** Bir bölümde ustalaştıkça açılır. Yani ödül, zayıf konunu çalışmaya bağlıdır.
  - *Bağlaç Gözü:* 20 bağlaç sorusu doğru → bağlaç sorularında çip ×2
  - *Zaman Ustası:* 20 gramer sorusu doğru → gramer sorularında çip ×2
  - *Çevirmen:* 12 çeviri sorusu doğru → çeviri sorularında çip ×2
  - *Hızlı Okur:* 10 okuma sorusu par altında doğru → okuma ve paragraf sorularında par +30 sn
- **Par süreler:** Gerçek sınavda soru başına ortalama 2 dk 15 sn düşer. Her bölümün kendi hedef süresi vardır; örneğin kelimede 35 sn, okumada 2,5 dk.

### Açıklamalı geri bildirim
Her sorudan sonra şunları görürsün:
- Doğru şıkkı ve neden doğru olduğunu, kuralı anlatan günlük hayattan bir örnekle (Ayşe, John…).
- Her yanlış şıkkın neden elendiğini, tek cümleyle.
- Soru kökündeki ipucu kelimeleri, renkli olarak.
- Cümlenin ya da sorunun Türkçesini, önemli kelimeleri ve paragrafın kısa özetini.

### Emin olma bahsi ve kırmızı deste
- Cevap vermeden önce "Eminim", "Kararsızım" ya da "Tahmin" seçersin.
- "Eminim" deyip yanıldığın sorular **kırmızı desteye** düşer ve daha sık geri gelir. Araştırmalar, insanın en iyi bu tür sürprizli hataları düzelttiğini gösteriyor.
- "Tahmin" deyip doğru bildiğin sorular da tekrar listesine girer, çünkü bunlar şans eseri doğrudur.

### Aralıklı tekrar
- Yanlış yaptığın soru önce aynı oturumda, yaklaşık 10 soru sonra geri gelir.
- Sonra 1 gün, 3 gün ve 6 gün sonra yeniden sorulur. Bu aşamaların hepsini doğru geçen soru öğrenilmiş sayılır.
- Tekrar destesinde bölümler karışık gelir. Her soruda "bu hangi tip?" diye düşünmen gerekir, tıpkı gerçek sınavdaki gibi.

### Kelime işaretleme, sözlük ve kelime kartları
- Sorudaki bilmediğin kelimeye dokunursun. Anlamı uygulamanın içindeki sözlükten gelir (5.703 kelime) ve kelime kartlarına eklenir.
- Sözlük çekimli hâlleri de tanır: studies → study, avoided → avoid.
- Kelime kartları kelimeyi, geçtiği cümlenin içinde ve çoktan seçmeli olarak sorar.

### Antrenman
Bölüm ya da etiket seçip hedefli soru çözersin. Her soru etiketlidir; örneğin "Zaman uyumu", "Bağlaç: zıtlık", "Okuma: çıkarım".

### Deneme modu
- **Tam deneme:** 80 soru, 180 dakika. Bir deneme setini kitapçık sırasıyla çözersin.
- **Yarım deneme:** 40 soru, 90 dakika. Sorular bölümlerden orantılı seçilir.
- Gerçek sınav gibi sessiz, süreli ve açıklamasızdır.
- Soru haritasıyla sorular arasında atlayabilir, şıkların üstünü çizerek eleyebilirsin.
- Sayfayı kapatsan bile kaldığın yerden devam edersin.
- Bitince puanın 100 üzerinden hesaplanır ve yanlışlarını açıklamalarıyla tek tek incelersin.

### Analiz
- Tahmini puanın ve zaman içindeki değişimi, hedef çizgisiyle birlikte
- Bölüm başarıları ve soru başına ortalama süre, par süreyle karşılaştırmalı
- En zayıf etiketlerin
- "Eminim" deyip yanıldıkların
- Günlük seri ve açılan jokerler

### Strateji kartları
Her bölüme ilk girişte 3-4 maddelik bir taktik kartı çıkar. Örnekler:
- **Paragraf tamamlama:** "Cevabı boşluktan önceki değil, sonraki cümle ele verir; önce onu oku."
- **Tr→İng çeviri:** "Türkçe cümlenin en sonundaki ana fiili bul."

### Müzik ve ses
- **Kodla üretilir:** Müzik ve efektler tarayıcının içinde kodla üretilir. Ses dosyası yoktur, dolayısıyla telif riski de yoktur.
- Her bölümün kendi müzik havası vardır.
- **Okurken kısılır:** Okuma, paragraf ve çeviri sorularında müzik kendiliğinden kısılır, çünkü okurken çalan müzik anlamayı düşürür. Deneme modu tamamen sessizdir.
- **Efektler:**
  - combo yükseldikçe tonu yükselen doğru cevap sesi
  - kalp kırılma sesi
  - kapı geçme fanfarı
  - puan sayma sesi
- **Ayarlar:** Ses ve titreşim ayarlardan kapatılabilir. İşletim sisteminde "hareketi azalt" açıksa animasyonlar durur.

### İsteğe bağlı Claude özellikleri
Kendi Anthropic API anahtarını girersen iki düğme açılır:
- **Bunu farklı açıkla:** Sorunun açıklamasını başka bir yoldan, yeni bir örnekle yeniden anlatır.
- **Benzer soru üret:** Aynı beceriyi ölçen yeni bir soru yazar. Üretilen soru, cevabı görmeyen ikinci bir çağrıyla yeniden çözülür. Cevaplar uyuşmazsa soru gösterilmez.

Anahtar girmezsen uygulamanın geri kalanı aynen çalışır.

## Öğrenme ilkeleri
Uygulamadaki her mekanik, bilinen bir öğrenme bulgusuna dayanır:

| İlke | Uygulamadaki karşılığı |
|---|---|
| Kendini test etme etkisi (Roediger ve Karpicke, 2006) | Temel etkinlik okumak değil, soru çözmek |
| Hemen ve açıklamalı geri bildirim (Butler ve Roediger, 2008) | Her cevaptan sonra doğru şık, yanlışların nedeni ve ipuçları |
| Hiperdüzeltme (Metcalfe, 2017) | "Eminim" deyip yanıldıkların kırmızı desteye düşer |
| Aralıklı tekrar (Leitner sistemi) | Aynı oturum → 1 → 3 → 6 gün |
| Karışık pratik (Rohrer ve Taylor, 2007) | Tekrar destesi bölümleri karıştırır |
| Bilinçli pratik | Etiketlere göre zayıf noktalar ve hedefli antrenman |
| Okurken müzik dikkati böler | Okuma bölümlerinde müzik kısılır, denemeler sessizdir |

## Sorular nasıl hazırlandı
Her soru, gerçek bir YDS sorusunun ölçtüğü beceriyi aynı zorlukta ölçecek şekilde sıfırdan yazıldı.
- **Aynı beceri, farklı içerik:**
  - Bölüm, etiket, zorluk ve tuzak türü korundu. Kaynak soru zaman uyumunu ölçüyorsa yeni soru da zaman uyumunu ölçer.
  - Konu, cümleler, şıklar, isimler ve sayılar tamamen yeni. Kaynak paragraf diyabet hakkındaysa yeni paragraf örneğin kahve ve uyku hakkında olabilir.
- **Kopya kontrolü:**
  - Her soru ve paragraf kaynakla 6 kelimelik parçalar hâlinde karşılaştırıldı ve ortak ifade çıkan yerler yeniden yazıldı.
  - Şu an ortak kalanlar yalnızca "According to the passage…" gibi standart soru kökleri.
- **Kör çözüm:**
  - Deneme setlerindeki 320 sorunun her biri, cevap anahtarını görmeyen ayrı bir çözücü tarafından baştan çözüldü. Hepsinde iki çözüm aynı cevabı verdi.
  - Bu kontrol, iki doğru cevabı olan ya da bozuk soruları yakalamak için yapıldı.
- **Dengeli cevap harfleri:** Her setteki cevaplar A-E arasında yaklaşık eşit dağılır, böylece "bu sette hep C çıkıyor" gibi bir örüntü oluşmaz.
- **Açıklamalar:** Türkçe yazıldı. Kural günlük hayattan bir örnekle anlatılır, her yanlış şık için tek cümlelik bir neden verilir.

Biçim ve kuralların ayrıntısı [`tools/SCHEMA.md`](tools/SCHEMA.md) dosyasında.

## Çalıştırma
```sh
git clone https://github.com/OSMANSAKIR/yds-kosusu.git
cd yds-kosusu
python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```
Dosyayı doğrudan açmak (`file://`) çalışmaz, çünkü sorular `fetch` ile yüklenir. Herhangi bir statik sunucu (GitHub Pages, Netlify, kendi siten) yeterli.

Başka bir siteye eklemek için `tools/export_site.sh <hedef-klasör>` komutu yalnızca yayınlanacak dosyaları kopyalar.

## API anahtarı ve gizlilik
- Uygulamada hiçbir anahtar yok. Claude özelliklerini kullanmak isteyen herkes kendi anahtarını girer.
- Anahtar yalnızca senin tarayıcında durur:
  - Varsayılan olarak sekme kapanınca silinir.
  - "Bu cihazda hatırla" seçersen `localStorage`'da kalır.
  - İlerleme kayıtlarına hiç yazılmaz ve yalnızca `api.anthropic.com`'a gönderilir.
- Sayfadaki Content-Security-Policy, dışarıya yalnızca `api.anthropic.com` bağlantısına izin verir. Dış script, font ya da takip kodu yüklenmez; fontlar repoda durur.
- Bu iş için ayrı bir anahtar oluşturup [Anthropic Console](https://console.anthropic.com)'da harcama sınırı koyman önerilir.
- İlerlemen (cevaplar, tekrar kutuları, kelimeler, hedef) yalnızca tarayıcının yerel deposunda tutulur, hiçbir sunucuya gönderilmez.

## Klasörler
| Yol | İçerik |
|---|---|
| `index.html` | Uygulamanın tamamı: stil, oyun, ses, depolama |
| `data/manifest.json` | Yüklenecek soru dosyalarının listesi |
| `data/generated/set-01…04.json` | Tam deneme setleri (her biri 80 soru) |
| `data/generated/gen-*.json` | Konu bazlı ek sorular (kelime, gramer, cümle, paragraf; her biri 25 soru) |
| `data/dict.json` | İngilizce-Türkçe sözlük (sorulardaki tüm kelimeler) |
| `fonts/` | Bungee, JetBrains Mono, Nunito (SIL OFL 1.1) |
| `tools/SCHEMA.md` | Soru JSON biçimi, bölüm ve etiket listesi, özgün soru kuralları |
| `tools/validate.py` | Soru dosyalarını denetler: biçim, soru sayıları, harf dağılımı, tekrar eden kimlikler |
| `tools/wordlist.py` | Sözlükte eksik kelimeleri bulur |
| `tools/build_dict.py` | Yeni anlamları sözlüğe ekler |
| `tools/export_site.sh` | Yayınlanacak dosyaları başka bir klasöre kopyalar |
| `tools/build_artifact.py` | claude.ai Artifact sürümünü hazırlar |

## Soru eklemek
1. [`tools/SCHEMA.md`](tools/SCHEMA.md)'deki biçimde bir JSON dosyası yaz ve `data/generated/` altına koy.
2. Dosyayı `data/manifest.json` dosyasına ekle:
   - Tam deneme setiyse `booklets` listesine.
   - Ek soruysa `generated` listesine.
3. `python3 tools/validate.py` ile denetle.
4. Sözlüğü güncelle:
   - `python3 tools/wordlist.py --missing 1000` sözlükte olmayan kelimeleri `work/dict/todo-XX.txt` dosyalarına yazar.
   - Anlamları `work/dict/out-XX.jsonl` dosyalarına satır satır yaz: `{"f": "studies", "l": "study", "tr": "çalışma; incelemek"}`.
   - `python3 tools/build_dict.py` bunları `data/dict.json`'a ekler.

Yanlış cevap, iki doğru şık ya da hatalı bilgi gördüğün bir soru için issue açabilirsin.

## Geliştirme geçmişi
Proje, Kasım 2026'daki YDS'ye 10 gün kala kişisel bir çalışma aracı olarak başladı, sonra herkesin kullanabileceği bir ürüne dönüştü.

1. **İlk sürüm:**
   - Koşu modu, çip × çarpan puanı, kalpler ve jokerler.
   - Aralıklı tekrar, kırmızı deste, deneme modu ve analiz ekranı.
   - Kodla üretilen müzik ve efektler, telefona uygun arayüz.
2. **Açıklamalar ve kelimeler:**
   - Her soruya Türkçe açıklama, ipucu, çeviri ve etiket eklendi.
   - Kelime işaretleme, kelime kartları ve uygulama içi sözlük geldi.
3. **Claude özellikleri:**
   - "Bunu farklı açıkla" ve "Benzer soru üret" eklendi.
   - Üretilen sorular kör çözümle doğrulanıyor.
   - Anahtar yalnızca kullanıcının tarayıcısında tutuluyor.
4. **Seviye testi ve strateji:**
   - 28 soruluk seviye testi ve tahmini puan eklendi.
   - Bölüm bölüm strateji kartları ve sık düşülen tuzaklar eklendi.
5. **Hedef ve yol haritası:**
   - Sınav türü seçimi (YDS, e-YDS, YÖKDİL) ve ÖSYM 2026-2027 takvimi geldi.
   - Plan, hedef puana ve günlük süreye göre çıkarılıyor.
   - Puan hesabı sınav türüne göre yapılıyor.
6. **Açık sürüme hazırlık:**
   - Kişisel veriler ve ÖSYM soruları repodan çıkarıldı.
   - Fontlar yerelleştirildi, Content-Security-Policy eklendi.
7. **Özgün deneme setleri:**
   - ÖSYM sorularının yerine, aynı beceriyi ölçen 4 × 80 özgün soru yazıldı. Hepsi kopya kontrolü ve kör çözümle doğrulandı.
   - Metinler YÖKDİL alanlarına ayrıldı.
   - Sözlük 5.703 kelimeye genişletildi.

## Bilinen sınırlar
- **Kör çözüm insan kontrolünün yerini tutmaz.** Otomatik bir çözücüyle yapıldı. Bozuk ya da çift cevaplı soruları yakalar, ama yazanla çözenin aynı yanlışa düşmesini yakalayamaz. Bir insanın son kez gözden geçirmesi hâlâ değerli olur.
- **Ek sorular daha hafif denetlendi.** 100 ek soru, deneme setleri kadar sıkı bir kör çözümden geçmedi.
- **Paragraflardaki bilgiler kaynakla doğrulanmadı.** Tarih ve rakamlar genel bilgiye dayanır.
- **Tahmini puan resmî değildir.** Son cevaplarındaki bölüm başarılarına göre yapılan bir tahmindir.
- **İlerleme tarayıcıya bağlıdır.** Tarayıcı verilerini silersen ilerlemen de silinir.

## Sınav takvimi
Tarihler ÖSYM'nin 2026-2027 takviminden alınmıştır (`EXAM_CALENDAR`, `index.html`). Takvim değişebilir;
başvurudan önce [osym.gov.tr](https://www.osym.gov.tr)'den kontrol et.

## Lisans
- **Kod** (`index.html`, `tools/`): [MIT](LICENSE)
- **Sorular ve sözlük** (`data/`): [CC BY-NC 4.0](data/LICENSE.md). Kaynak göstererek, ticari olmayan her amaçla kullanabilirsin.
- **Fontlar** (`fonts/`): SIL Open Font License 1.1
