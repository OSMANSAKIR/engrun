/* Claude'a sor: "Bunu farklı açıkla", "Benzer soru üret" ve kelime anlamı.
   İki kaynak: claude.ai içinde açılınca sayfanın kendi Claude bağlantısı (sample),
   başka yerde kullanıcının kendi Anthropic API anahtarı. İkisi de yoksa bu özellikler gizlenir.
   Anahtar yalnızca bu tarayıcıda (oturumluk ya da "hatırla" ile kalıcı) tutulur, Store/db'ye asla yazılmaz. */
import type { SampleFn, SampleTextOptions } from "../claude-runtime";
import { LETTERS, SEC, isLetter, type Letter } from "../config/sections";
import { TAG_FAMILY, TAG_TR } from "../config/tags";
import { uid } from "../lib/format";
import type { Explain, Passage, Question, VocabNote, WordDoc } from "../types";
import { PASSAGES } from "./pool";
import { errCode, S } from "./store";

export const AI_MODELS: readonly [id: string, label: string][] = [["claude-opus-5-5", "Opus 5.5 · en güvenilir"], ["claude-sonnet-5-5", "Sonnet 5.5 · yaklaşık yarı fiyatına"], ["claude-haiku-4-5", "Haiku 4.5 · en ucuz"]];
const KEY_LS = "yds.apikey";

let SAMPLE: SampleFn | null = null;
export const setSample = (s: SampleFn | null): void => { SAMPLE = s; };
export const hasSample = (): boolean => !!SAMPLE;

export const AI = {
  key(): string { try { return sessionStorage.getItem(KEY_LS) || localStorage.getItem(KEY_LS) || ""; } catch { return ""; } },
  remembered(): boolean { try { return !!localStorage.getItem(KEY_LS); } catch { return false; } },
  setKey(k: string, remember = false): void {
    try { sessionStorage.removeItem(KEY_LS); localStorage.removeItem(KEY_LS); if (k) (remember ? localStorage : sessionStorage).setItem(KEY_LS, k); } catch { /* depolama kapalı */ }
  },
  mode(): "claude" | "key" | null { return SAMPLE ? "claude" : this.key() ? "key" : null; },
  model(): string { const m = S().aiModel; return AI_MODELS.some(x => x[0] === m) ? m! : AI_MODELS[0]![0]; }
};
export const aiReady = (): boolean => !!AI.mode();

/** Claude çağrılarının hata biçimi; claude.ai köprüsünün hataları da { code } taşır. */
export class AiError extends Error {
  constructor(readonly code: string, readonly text = "", message = "") { super(message || code); }
}
/** Hata anına kadar akışla gelmiş metin (varsa). */
export const errText = (e: unknown): string =>
  e && typeof e === "object" && "text" in e && typeof e.text === "string" ? e.text : "";

export async function aiText(prompt: string, opts: SampleTextOptions = {}): Promise<string> {
  if (SAMPLE) return (await SAMPLE(prompt, opts)).text;
  return apiCall(prompt, opts);
}

export async function aiJson(prompt: string, { signal, quick }: { signal?: AbortSignal; quick?: boolean } = {}): Promise<unknown> {
  if (SAMPLE) return SAMPLE.json(prompt, quick ? { signal, modelTier: "quick" } : { signal });
  return parseJsonLoose(await apiCall(prompt + "\n\nYalnızca geçerli JSON döndür; kod bloğu ya da açıklama ekleme.", { signal }));
}

/** Model cevabındaki ilk JSON nesnesini/dizisini çıkarır (kod bloğu ya da önsöz olsa bile). */
export function parseJsonLoose(t: string): unknown {
  const s = String(t || "").replace(/```(?:json)?/g, "");
  const a = s.search(/[[{]/), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  try { if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1)); } catch { /* aşağıda hata */ }
  throw new AiError("invalid_json");
}

interface ApiEvent { type: string; delta?: { type?: string; text?: string; stop_reason?: string }; error?: { message?: string } }

// Messages API'ye tarayıcıdan doğrudan istek; metin isteklerinde akış (stream) ile parça parça gösterir.
async function apiCall(prompt: string, { signal, onText }: SampleTextOptions = {}): Promise<string> {
  const model = AI.model(); const fb = !model.startsWith("claude-haiku"); const stream = !!onText;
  const headers: Record<string, string> = { "content-type": "application/json", "x-api-key": AI.key(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
  if (fb) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  const body: Record<string, unknown> = { model, max_tokens: 16000, messages: [{ role: "user", content: prompt }] };
  if (stream) body.stream = true;
  if (fb) body.fallbacks = "default";
  let res: Response;
  try { res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body), signal }); }
  catch (e) { throw new AiError(isAbort(e) ? "cancelled" : "network"); }
  if (!res.ok) {
    let msg = "";
    try { msg = ((await res.json()) as { error?: { message?: string } }).error?.message || ""; } catch { /* gövde JSON değil */ }
    throw new AiError("http_" + res.status, "", msg);
  }
  if (!stream || !res.body) {
    const d = await res.json() as { stop_reason?: string; content?: { type: string; text?: string }[] };
    if (d.stop_reason === "refusal") throw new AiError("refusal");
    return (d.content || []).filter(b => b.type === "text").map(b => b.text || "").join("");
  }
  const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = "", text = "";
  try {
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, i).split("\n").find(l => l.startsWith("data:")); buf = buf.slice(i + 2);
        if (!line) continue;
        let ev: ApiEvent; try { ev = JSON.parse(line.slice(5)) as ApiEvent; } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") { const delta = ev.delta.text || ""; text += delta; onText!({ text, delta }); }
        else if (ev.type === "message_delta" && ev.delta?.stop_reason === "refusal") throw new AiError("refusal", text);
        else if (ev.type === "error") throw new AiError("http_stream", text, ev.error?.message);
      }
    }
  } catch (e) { if (isAbort(e)) throw new AiError("cancelled", text); throw e; }
  return text;
}
const isAbort = (e: unknown) => e instanceof Error && e.name === "AbortError";

const AI_ERR: Readonly<Record<string, string>> = {
  not_granted: "Claude'a erişim izni verilmedi.", network: "Claude'a bağlanılamadı. İnternet bağlantını kontrol et.",
  http_401: "API anahtarı geçersiz. Ayarlar'dan kontrol et.", http_403: "Bu anahtarın bu modeli kullanma izni yok.",
  http_404: "Seçili model bulunamadı. Ayarlar'dan başka bir model seç.", http_429: "Anahtarının hız ya da harcama sınırına ulaşıldı; biraz sonra dene.",
  http_529: "Claude şu an çok yoğun; biraz sonra dene.", http_500: "Claude tarafında bir hata oldu; tekrar dene.",
  refusal: "Claude bu isteği yanıtlamadı.", rate_limited: "Kullanım sınırına ulaşıldı; biraz sonra tekrar dene.",
  prompt_too_large: "Soru Claude'a göndermek için çok uzun.", invalid_json: "Claude'un cevabı soru biçiminde gelmedi. Bir kez daha dene.",
  sampling_disabled: "Bu görünümde Claude'a sorulamıyor.", session_expired: "Oturum süresi doldu; sayfayı yenile."
};

/** Hata → kullanıcıya gösterilecek Türkçe cümle. */
export function aiErr(e: unknown): string {
  const c = errCode(e);
  if (c === "http_400" && e instanceof Error && e.message && e.message !== c) return "Claude isteği reddetti: " + e.message;
  return (c && AI_ERR[c]) || "Şu an yanıt alınamadı. Tekrar dene.";
}

/* ---------- İstemler ---------- */

function qForPrompt(q: Question, chosen: Letter | null | undefined): string {
  const p = q.passage ? PASSAGES.get(q.passage) : null;
  return `Bölüm: ${SEC[q.section].tr}\n${p ? "Paragraf:\n" + p.text + "\n\n" : ""}Soru${q.n ? " (" + q.n + ")" : ""}: ${q.stem || "(paragraftaki boşluk)"}\nŞıklar:\n${LETTERS.map(L => `${L}) ${q.options[L]}`).join("\n")}\nDoğru cevap: ${q.answer}\n${chosen ? "Öğrencinin cevabı: " + chosen + (chosen === q.answer ? " (doğru)" : " (yanlış)") + "\n" : ""}Mevcut açıklama: ${q.explain?.short || ""} ${q.explain?.why || ""}`;
}

export function explainPrompt(q: Question, chosen: Letter | null | undefined): string {
  return `Sen YDS (İngilizce yeterlik) sınavına hazırlanan, Türkçe konuşan bir öğrencinin sabırlı koçusun. Aşağıdaki soruyu mevcut açıklamadan FARKLI bir yoldan, sade Türkçe ile anlat.
- Günlük hayattan kısa bir örnek kullan (ör. Ayşe, John).
- Öğrenci yanlış yaptıysa önce seçtiği şıkkın neden cazip göründüğünü ve neden olmadığını söyle.
- Sonra doğru cevabın mantığını adım adım anlat.
- En sonda tek cümlelik, akılda kalıcı bir kural ver ("Kural:" ile başlasın).
- En fazla 170 kelime. Düz metin; başlık, tablo veya Markdown işareti kullanma.

${qForPrompt(q, chosen)}`;
}

export function similarPrompt(q: Question): string {
  const p = q.passage ? PASSAGES.get(q.passage) : null;
  const needP = q.section === "cloze" || q.section === "reading";
  const allowed = Object.keys(TAG_TR).filter(t => TAG_FAMILY[q.section].some(f => t.startsWith(f)));
  const example: Record<string, unknown> = { section: q.section, stem: q.stem || "", stemTr: q.stemTr || "", options: q.options, answer: q.answer, tags: q.tags, difficulty: q.difficulty || 2, explain: q.explain, vocab: q.vocab || [] };
  if (needP && p) example.passage = { kind: p.kind, text: p.text, tr: p.tr || "" };
  return `YDS (ÖSYM İngilizce yeterlik) sınavı için, aşağıdaki örnekle AYNI bölümde (${SEC[q.section].tr}) ve aynı beceriyi (${(q.tags || []).join(", ")}) ölçen YENİ ve özgün bir soru yaz. Konu ve cümleler örnekten farklı olsun, zorluk aynı kalsın. Gerçek YDS üslubu: akademik İngilizce, 5 şık, tek doğru cevap, makul çeldiriciler. Doğru cevabı rastgele bir harfe koy.
Kurallar:
- "options" tam olarak A, B, C, D, E anahtarlarını içersin.
- "answer" tek harf (A-E).
- Açıklamalar Türkçe ve sade olsun; "explain.why" içinde günlük hayattan kısa bir örnek ver.
- "explain.others": doğru cevap DIŞINDAKİ 4 şıkkın her biri için tek cümle.
- "explain.clues": soru metninden${needP ? " veya paragraftan" : ""} BİREBİR alıntılanmış 1-3 ipucu ifadesi.
- "tags": yalnızca şu listeden 1-3 tane: ${allowed.join(", ")}.
- "vocab": 2-5 önemli kelime, {"en","tr"}.
${q.section === "cloze" ? `- "passage": {"kind":"cloze","text":"80-130 kelimelik paragraf, TEK boşluk ve boşluk tam olarak (1)---- biçiminde","tr":"2 cümlelik Türkçe özet"}. "stem" boş string olsun.\n` : ""}${q.section === "reading" ? `- "passage": {"kind":"reading","text":"130-180 kelimelik akademik paragraf","tr":"2-3 cümlelik Türkçe özet"}. "stem" paragrafla ilgili soru olsun.\n` : ""}- Yalnızca tek bir JSON nesnesi döndür, başka metin yazma.

Örnek (biçim için):
${JSON.stringify(example)}`;
}

export function wordsPrompt(batch: readonly Pick<WordDoc, "word" | "ctx">[]): string {
  return `Türkçe konuşan bir YDS öğrencisi aşağıdaki İngilizce kelimeleri bilmediği için işaretledi. Her kelimenin VERİLEN CÜMLEDEKİ anlamını Türkçe ver.
Yalnızca bir JSON dizisi döndür, başka metin yazma:
[{"w":"<kelime, verildiği gibi>","en":"<sözlük biçimi; ör. curtailed → curtail, studies → study>","tr":"<kısa Türkçe karşılık, en fazla 4 kelime; gerekirse virgülle 2 anlam>","pos":"isim|fiil|sıfat|zarf|bağlaç|edat|diğer"}]

Kelimeler:
${batch.map((d, i) => `${i + 1}. "${d.word}" — cümle: "${String(d.ctx || "").slice(0, 300)}"`).join("\n")}`;
}

/* ---------- Üretilen sorunun doğrulanması ---------- */

export interface Generated { q: Question; passage: Passage | null }

// Üretilen soruyu ikinci bir çağrı cevabı görmeden çözer; cevaplar uyuşmazsa soru gösterilmez.
export async function verifyAnswer(g: Generated, signal?: AbortSignal): Promise<string> {
  const p = g.passage;
  const prompt = `Aşağıdaki YDS sorusunu dikkatle çöz. Tek doğru cevabı bul.
Yalnızca JSON döndür: {"answer":"<A, B, C, D ya da E>"}

${p ? "Paragraf:\n" + p.text + "\n\n" : ""}Soru: ${g.q.stem || "Paragraftaki (1) numaralı boşluğa en uygun seçenek hangisidir?"}
${LETTERS.map(L => `${L}) ${g.q.options[L]}`).join("\n")}`;
  const r = await aiJson(prompt, { signal }) as { answer?: unknown } | null;
  return String(r?.answer || "").trim().toUpperCase().charAt(0);
}

const str = (x: unknown): string => typeof x === "string" ? x : x == null ? "" : String(x);

/** Modelden gelen ham nesneyi denetleyip soruya çevirir; eksik ya da bozuksa null. */
export function buildGenerated(raw: unknown, src: Question): Generated | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const o = (d.options || {}) as Record<string, unknown>;
  if (!LETTERS.every(L => typeof o[L] === "string" && (o[L] as string).trim())) return null;
  const ans = str(d.answer).trim().toUpperCase();
  if (!isLetter(ans)) return null;
  const ex = (d.explain || {}) as Record<string, unknown>;
  if (typeof ex.short !== "string" || !ex.short.trim()) return null;
  const id = "gen-" + uid();
  let passage: Passage | null = null;
  if (src.section === "cloze" || src.section === "reading") {
    const pd = (d.passage || {}) as Record<string, unknown>;
    let text = str(pd.text).trim();
    if (text.length < 40) return null;
    if (src.section === "cloze" && !/\(1\)\s*-{2,}/.test(text)) { if (/-{3,}/.test(text)) text = text.replace(/-{3,}/, "(1)----"); else return null; }
    passage = { id: id + "-p", kind: src.section === "cloze" ? "cloze" : "reading", text, tr: str(pd.tr), questions: [1] };
  }
  const exOthers = (ex.others || {}) as Record<string, unknown>;
  const others: Partial<Record<Letter, string>> = {};
  for (const L of LETTERS) if (L !== ans) others[L] = str(exOthers[L]);
  const tags = (Array.isArray(d.tags) ? d.tags : []).filter((t): t is string => typeof t === "string" && !!TAG_TR[t]).slice(0, 3);
  const explain: Explain = { short: ex.short, why: str(ex.why), others, clues: (Array.isArray(ex.clues) ? ex.clues : []).filter((c): c is string => typeof c === "string"), tip: str(ex.tip) };
  const vocab = (Array.isArray(d.vocab) ? d.vocab : []).filter((v): v is VocabNote => !!v && typeof v.en === "string" && typeof v.tr === "string").slice(0, 6);
  const q: Question = {
    id, n: src.section === "cloze" ? 1 : null, section: src.section, passage: passage ? passage.id : null,
    stem: str(d.stem), stemTr: str(d.stemTr), options: Object.fromEntries(LETTERS.map(L => [L, (o[L] as string).trim()])) as Record<Letter, string>, answer: ans,
    tags: tags.length ? tags : (src.tags || []), difficulty: typeof d.difficulty === "number" ? d.difficulty : src.difficulty || 2,
    explain, vocab, generatedFrom: src.id
  };
  if (src.section !== "cloze" && !q.stem!.trim()) return null;
  return { q, passage };
}
