export type JokerId = "conj_eye" | "tense_master" | "translator" | "fast_reader";

export interface Joker { id: JokerId; name: string; desc: string; need: number; label: string }

// Ustalıkla açılan jokerler: oyundaki ödül, zayıf konuyu çalışmaya bağlanır.
export const JOKERS: readonly Joker[] = [
  { id: "conj_eye",     name: "Bağlaç Gözü",  desc: "Bağlaç sorularında çip ×2.",                need: 20, label: "bağlaç sorusu doğru" },
  { id: "tense_master", name: "Zaman Ustası", desc: "Gramer sorularında çip ×2.",                need: 20, label: "gramer etiketi doğru" },
  { id: "translator",   name: "Çevirmen",     desc: "Çeviri sorularında çip ×2.",                need: 12, label: "çeviri sorusu doğru" },
  { id: "fast_reader",  name: "Hızlı Okur",   desc: "Okuma ve paragraf sorularında par +30 sn.", need: 10, label: "okuma sorusu par altında doğru" }
];
