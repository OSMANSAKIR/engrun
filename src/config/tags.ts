import type { Section } from "./sections";

export const TAG_TR: Readonly<Record<string, string>> = {
  "vocab.noun": "Kelime: isim", "vocab.verb": "Kelime: fiil", "vocab.adjective": "Kelime: sıfat", "vocab.adverb": "Kelime: zarf",
  "vocab.phrasal_verb": "Phrasal verb", "vocab.collocation": "Kelime öbeği (collocation)",
  "grammar.tense": "Zamanlar", "grammar.tense_sequence": "Zaman uyumu", "grammar.passive": "Edilgen yapı", "grammar.modal": "Modal",
  "grammar.modal_perfect": "Modal perfect", "grammar.conditional": "Koşul cümleleri", "grammar.wish": "Wish / keşke",
  "grammar.relative_clause": "Sıfat cümlecikleri", "grammar.noun_clause": "İsim cümlecikleri", "grammar.gerund_infinitive": "Gerund / infinitive",
  "grammar.preposition": "Edatlar", "grammar.comparison": "Karşılaştırma", "grammar.quantifier": "Miktar belirteçleri",
  "grammar.reduction": "Kısaltmalar", "grammar.inversion": "Devrik yapı", "grammar.pronoun": "Zamirler", "grammar.parallelism": "Paralel yapı",
  "conj.contrast": "Bağlaç: zıtlık", "conj.cause_effect": "Bağlaç: sebep-sonuç", "conj.addition": "Bağlaç: ekleme",
  "conj.condition": "Bağlaç: koşul", "conj.time": "Bağlaç: zaman", "conj.purpose": "Bağlaç: amaç", "conj.example": "Bağlaç: örnek",
  "conj.correlative": "Bağlaç: ikili (both…and)",
  "trans.structure": "Çeviri: cümle iskeleti", "trans.tense_match": "Çeviri: zaman eşleme", "trans.connector_match": "Çeviri: bağlaç eşleme",
  "trans.vocab_precision": "Çeviri: kelime hassasiyeti",
  "reading.main_idea": "Okuma: ana fikir", "reading.detail": "Okuma: detay", "reading.inference": "Okuma: çıkarım",
  "reading.vocab_in_context": "Okuma: bağlamda kelime", "reading.reference": "Okuma: gönderim (it/they)", "reading.author_attitude": "Okuma: yazarın tutumu",
  "reading.purpose": "Okuma: amaç",
  "dialogue.response": "Diyalog: cevap", "dialogue.question": "Diyalog: soru",
  "restate.tense_modality": "Yakın anlam: zaman/modal", "restate.negation": "Yakın anlam: olumsuzluk", "restate.logic": "Yakın anlam: mantık",
  "para.cohesion": "Paragraf: bağlantı (zamir/bağlaç)", "para.topic_flow": "Paragraf: konu akışı",
  "irrelevant.topic_shift": "Anlam bozan: konu kayması", "irrelevant.time_shift": "Anlam bozan: zaman kayması", "irrelevant.perspective_shift": "Anlam bozan: bakış açısı kayması"
};
export const tagName = (t: string): string => TAG_TR[t] || t;

// Claude'un ürettiği soruya hangi etiket ailelerinin verilebileceği.
export const TAG_FAMILY: Record<Section, string[]> = {
  vocab: ["vocab.", "conj."], grammar: ["grammar.", "conj."], cloze: ["grammar.", "conj.", "vocab."], sentence: ["conj.", "grammar."],
  trans_en_tr: ["trans."], trans_tr_en: ["trans."], reading: ["reading."], dialogue: ["dialogue."],
  restatement: ["restate.", "grammar."], para_completion: ["para."], irrelevant: ["irrelevant."]
};
