# YDS Koşusu — soru verisi şeması

Soru dosyaları `data/manifest.json` üzerinden yüklenir. Tüm açıklamalar **Türkçe**, sade ve gerektiğinde
günlük hayattan kısa bir örnekle yazılır (Ayşe, John…); jargon tablosu yok.

## Dosya: `data/<klasör>/<id>.json`

```jsonc
{
  "id": "set-01",
  "title": "Deneme seti 1",
  "source": "Özgün (YDS biçiminde)",
  "passages": [
    {
      "id": "set-01-p17",          // ilk sorunun numarasıyla
      "kind": "cloze" | "reading",
      "text": "Paragraf metni. Cloze boşlukları tam olarak '(17)----' biçiminde.",
      "tr": "Paragrafın 2-3 cümlelik Türkçe özeti",
      "questions": [17, 18, 19, 20, 21]
    }
  ],
  "questions": [
    {
      "id": "set-01-07",           // <set>-<iki haneli numara>
      "n": 7,
      "section": "grammar",        // aşağıdaki bölüm kimliklerinden biri
      "passage": null,             // cloze/okuma ise passages[].id
      "stem": "By the time the rescue team ---- the village, most residents ---- to higher ground.",
      "stemTr": "Doğru cevap yerleştirilmiş Türkçe çeviri (okuma sorularında soru kökünün çevirisi).",
      "options": { "A": "reaches / are moving", "B": "reached / had moved", "C": "has reached / moved", "D": "will reach / have moved", "E": "was reaching / move" },
      "answer": "B",
      "tags": ["grammar.tense_sequence"],
      "difficulty": 2,             // 1 kolay, 2 orta, 3 zor
      "explain": {
        "short": "Tek cümlelik özet: neden B.",
        "why": "Neden doğru: 2-5 cümle, kuralı günlük bir örnekle anlat.",
        "others": { "A": "Neden yanlış (1 cümle)", "C": "...", "D": "...", "E": "..." },
        "clues": ["By the time"],  // soru kökünde cevabı ele veren ifadeler (birebir alıntı)
        "tip": "Bu soru tipi için genel taktik/kural (1-2 cümle)."
      },
      "vocab": [ { "en": "rescue team", "tr": "kurtarma ekibi" } ]   // 2-6 önemli kelime/kalıp
    }
  ]
}
```

## Bölüm kimlikleri (YDS sırası)
| section | Türkçe ad | tipik numaralar |
|---|---|---|
| `vocab` | Kelime | 1-6 |
| `grammar` | Gramer / Zamanlar | 7-16 |
| `cloze` | Paragrafta boşluk (bağlaç+kelime+gramer) | 17-26 |
| `sentence` | Cümle tamamlama | 27-36 |
| `trans_en_tr` | Çeviri İng→Tr | 37-39 |
| `trans_tr_en` | Çeviri Tr→İng | 40-42 |
| `reading` | Okuma | 43-62 |
| `dialogue` | Diyalog tamamlama | 63-67 |
| `restatement` | Yakın anlam (cümle) | 68-71 |
| `para_completion` | Paragraf tamamlama | 72-75 |
| `irrelevant` | Anlam bütünlüğünü bozan cümle | 76-80 |

YÖKDİL'de diyalog ve yakın anlam yoktur; ilk 20 soru kelime+gramer karışıktır. Bölüm ağırlıkları `index.html` içindeki `EXAM_TYPES`'ta.

## Etiketler (yalnızca bu listeden; her soruya 1-3 tane)
Kelime: `vocab.noun`, `vocab.verb`, `vocab.adjective`, `vocab.adverb`, `vocab.phrasal_verb`, `vocab.collocation`
Gramer: `grammar.tense`, `grammar.tense_sequence`, `grammar.passive`, `grammar.modal`, `grammar.modal_perfect`, `grammar.conditional`, `grammar.wish`, `grammar.relative_clause`, `grammar.noun_clause`, `grammar.gerund_infinitive`, `grammar.preposition`, `grammar.comparison`, `grammar.quantifier`, `grammar.reduction`, `grammar.inversion`, `grammar.pronoun`, `grammar.parallelism`
Bağlaçlar: `conj.contrast` (although, however, despite, whereas…), `conj.cause_effect` (because, so, therefore, due to…), `conj.addition` (moreover, besides, as well as…), `conj.condition` (unless, provided that, as long as…), `conj.time` (until, as soon as, once…), `conj.purpose` (so that, in order to…), `conj.example` (for instance, such as…), `conj.correlative` (both…and, not only…but also, either…or)
Çeviri: `trans.structure` (cümle iskeleti eşleme), `trans.tense_match`, `trans.connector_match`, `trans.vocab_precision`
Okuma: `reading.main_idea`, `reading.detail`, `reading.inference`, `reading.vocab_in_context`, `reading.reference`, `reading.author_attitude`, `reading.purpose`
Diyalog: `dialogue.response`, `dialogue.question`
Yakın anlam: `restate.tense_modality`, `restate.negation`, `restate.logic`
Paragraf: `para.cohesion` (zamir/bağlaç referansı), `para.topic_flow`
Anlam bozan: `irrelevant.topic_shift`, `irrelevant.time_shift`, `irrelevant.perspective_shift`

## Özgün soru (ikiz) kuralları
Repodaki sorular ÖSYM sorusu **değildir**. Gerçek sınavın biçimini, zorluğunu ve ölçtüğü beceriyi taklit eden özgün sorulardır.
- Metin, cümle ve şıklar yeni yazılır. Kaynak sorudan cümle, paragraf ya da ayırt edici ifade kopyalanmaz; konu da değiştirilir.
- Aynı beceri ölçülür: aynı bölüm, aynı etiketler, benzer zorluk ve benzer çeldirici mantığı (ör. zaman uyumu tuzağı).
- Tek doğru cevap olmalı. Her soru, cevabı görmeyen ikinci bir çözümle doğrulanır; uyuşmazsa soru atılır ya da düzeltilir.
- Şıkların harf dağılımı dengeli olmalı (her harf yaklaşık %20).
- Yeni kelimeler sözlüğe eklenir: `python3 -I tools/wordlist.py --missing 1000` → `work/dict/out-XX.jsonl` → `python3 -I tools/build_dict.py`.
- JSON geçerli UTF-8 olmalı; `python3 -I tools/validate.py` hatasız geçmeli.
