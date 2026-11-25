// YDS'nin 11 bölümü, sınavdaki sırasıyla. Oyun, istatistik ve plan hep bu listeyi kullanır.
export const SECTIONS = ["vocab", "grammar", "cloze", "sentence", "trans_en_tr", "trans_tr_en", "reading", "dialogue", "restatement", "para_completion", "irrelevant"] as const;
export type Section = (typeof SECTIONS)[number];

export interface SectionInfo {
  tr: string;      // ekranda tam adı
  short: string;   // kısa adı (kapı, grafik)
  par: number;     // soru başına hedef süre (sn)
  chips: number;   // koşuda doğru cevabın taban puanı
}

export const SEC: Record<Section, SectionInfo> = {
  vocab:           { tr: "Kelime",              short: "Kelime",      par: 35,  chips: 10 },
  grammar:         { tr: "Gramer / Zamanlar",   short: "Gramer",      par: 45,  chips: 10 },
  cloze:           { tr: "Paragrafta boşluk",   short: "Cloze",       par: 60,  chips: 15 },
  sentence:        { tr: "Cümle tamamlama",     short: "Cümle",       par: 75,  chips: 15 },
  trans_en_tr:     { tr: "Çeviri İng→Tr",       short: "İng→Tr",      par: 90,  chips: 20 },
  trans_tr_en:     { tr: "Çeviri Tr→İng",       short: "Tr→İng",      par: 90,  chips: 20 },
  reading:         { tr: "Okuma",               short: "Okuma",       par: 150, chips: 25 },
  dialogue:        { tr: "Diyalog tamamlama",   short: "Diyalog",     par: 75,  chips: 15 },
  restatement:     { tr: "Yakın anlam",         short: "Yakın anlam", par: 90,  chips: 20 },
  para_completion: { tr: "Paragraf tamamlama",  short: "Paragraf",    par: 120, chips: 25 },
  irrelevant:      { tr: "Anlam bozan cümle",   short: "Anlam bozan", par: 105, chips: 20 }
};

// Yavaş gelişen bölümler: hedefleri daha düşük tutulur (bkz. secTarget).
export const SLOW_SECTIONS: ReadonlySet<Section> = new Set<Section>(["reading", "restatement", "para_completion"]);
// Okuma yükü ağır bölümler: müzik otomatik kısılır.
export const DUCK_SECTIONS: ReadonlySet<string> = new Set<Section>(["reading", "cloze", "para_completion", "irrelevant", "trans_en_tr", "trans_tr_en", "restatement"]);

export const isSection = (x: unknown): x is Section => typeof x === "string" && Object.hasOwn(SEC, x);

export const LETTERS = ["A", "B", "C", "D", "E"] as const;
export type Letter = (typeof LETTERS)[number];
export const isLetter = (x: unknown): x is Letter => typeof x === "string" && (LETTERS as readonly string[]).includes(x);

export const CONF = { sure: "Eminim", unsure: "Kararsızım", guess: "Tahmin" } as const;
export type Confidence = keyof typeof CONF;
