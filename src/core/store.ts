/* Kalıcılık: localStorage her zaman; claude.ai içinde açılınca ayrıca bulut veritabanı (db).
   Her kayıt { id, u } taşır; iki taraf çakışırsa u'su (son değişiklik zamanı) büyük olan kazanır.
   Bulut yazılamayan kayıtlar "dirty" listesinde bekler ve bağlantı gelince gönderilir. */
import type { ClaudeDb, ClaudeDocData } from "../claude-runtime";
import { sleep } from "../lib/time";
import type { Attempt, GenDoc, HistoryRecord, Settings, SrsEntry, WordDoc } from "../types";

export const DEFAULT_SETTINGS: Settings = { music: true, sfx: true, volume: 0.6, theme: "auto", vibrate: true, seenStrategy: {}, badges: {}, dayChecks: {}, jokersSeen: [], u: 0 };
export const LS_KEY = "yds.v1";

interface Collections { attempts: Attempt; srs: SrsEntry; runs: HistoryRecord; gen: GenDoc; words: WordDoc }
export type CollName = keyof Collections;
const COLLS: readonly CollName[] = ["attempts", "srs", "runs", "gen", "words"];
const isColl = (x: string): x is CollName => (COLLS as readonly string[]).includes(x);

// Her değişiklikte artar; önbellekler (deneme listesi vb.) buna bakarak tazelenir.
let version = 0;
export const bump = (): void => { version++; };
export const dataVersion = (): number => version;

type Timer = ReturnType<typeof setTimeout> | undefined;

class StoreImpl {
  attempts: Record<string, Attempt> = {};
  srs: Record<string, SrsEntry> = {};
  runs: Record<string, HistoryRecord> = {};
  gen: Record<string, GenDoc> = {};
  words: Record<string, WordDoc> = {};
  settings: Settings = { ...DEFAULT_SETTINGS };
  db: ClaudeDb | null = null;
  status: "local" | "cloud" = "local";
  dirty = new Set<string>();
  wordsRev = 0;                         // işaretli kelimeler değişince artar (kelime dizini önbelleği)
  private saveT: Timer;
  private settingsT: Timer;

  private table<K extends CollName>(coll: K): Record<string, Collections[K]> {
    return this[coll] as Record<string, Collections[K]>;
  }

  load(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Record<CollName, unknown>> & { settings?: Partial<Settings> };
        for (const k of COLLS) { const v = d[k]; if (v && typeof v === "object") Object.assign(this, { [k]: v }); }
        if (d.settings) this.settings = { ...DEFAULT_SETTINGS, ...d.settings };
      }
      const dr = localStorage.getItem(LS_KEY + ".dirty");
      if (dr) this.dirty = new Set(JSON.parse(dr) as string[]);
    } catch (e) { console.warn("Yerel kayıt okunamadı", e); }
  }

  saveLocal(): void {
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ attempts: this.attempts, srs: this.srs, runs: this.runs, gen: this.gen, words: this.words, settings: this.settings }));
        localStorage.setItem(LS_KEY + ".dirty", JSON.stringify([...this.dirty]));
      } catch { /* depolama dolu ya da kapalı: oturum yine çalışır */ }
    }, 250);
  }

  put<K extends CollName>(coll: K, id: string, doc: Collections[K]): void {
    doc.u = Date.now(); doc.id = id;
    this.table(coll)[id] = doc;
    if (coll === "words") this.wordsRev++;
    bump();
    const path = coll + "/" + id;
    this.dirty.add(path); this.saveLocal();
    void dbWrite(path);
  }

  setSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch, u: Date.now(), id: "main" };
    bump();
    this.dirty.add("settings/main"); this.saveLocal();
    clearTimeout(this.settingsT);                        // kaydırıcı gibi art arda değişiklikleri tek yazışa topla
    this.settingsT = setTimeout(() => void dbWrite("settings/main"), 900);
  }

  async connect(): Promise<void> {
    const cl = window.claude;
    if (!cl || typeof cl.use !== "function") return;
    let db: ClaudeDb | null = null;
    try { db = await Promise.race([cl.use("db"), sleep(10000).then(() => null)]); } catch { db = null; }
    if (!db) return;
    try {
      const r = await Promise.race([this.pull(db), sleep(10000).then(() => "timeout" as const)]);
      if (r === "timeout") throw new Error("db zaman aşımı");
      this.db = db; this.status = "cloud";
      this.saveLocal(); bump();
      void (async () => { for (const p of [...this.dirty]) await dbWrite(p); })();
    } catch (e) {
      console.warn("db kullanılamadı, yerel kayıtla devam:", errCode(e) ?? (e instanceof Error ? e.message : e));
      this.status = "local";
    }
  }

  private async pull(db: ClaudeDb): Promise<void> {
    for (const coll of COLLS) {
      const remote = await fetchColl(db, coll);
      const local = this.table(coll) as unknown as Record<string, ClaudeDocData>;   // buluttan gelen belge şekli denetlenmez
      const seen = new Set<string>();
      for (const d of remote) {
        seen.add(d.id);
        const loc = local[d.id];
        if (!loc || (d.u || 0) > (loc.u || 0)) local[d.id] = d;
        else if ((loc.u || 0) > (d.u || 0)) this.dirty.add(coll + "/" + d.id);
      }
      for (const id of Object.keys(local)) if (!seen.has(id)) this.dirty.add(coll + "/" + id);
    }
    const s = await db.doc("settings/main").get();
    if (s.exists) {
      const d = s.data() as Partial<Settings>;
      if ((d.u || 0) > (this.settings.u || 0)) this.settings = { ...DEFAULT_SETTINGS, ...d };
      else if ((this.settings.u || 0) > (d.u || 0)) this.dirty.add("settings/main");
    } else if (this.settings.u) this.dirty.add("settings/main");
  }
}

export const Store = new StoreImpl();
export const S = (): Settings => Store.settings;

export const errCode = (e: unknown): string | undefined =>
  e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : undefined;

// Koleksiyonu "u"ya göre sayfa sayfa çeker (500'lük sayfalar, en fazla 40 sayfa).
async function fetchColl(db: ClaudeDb, coll: string): Promise<(ClaudeDocData & { id: string })[]> {
  const out: (ClaudeDocData & { id: string })[] = [];
  let last: unknown = null;
  for (let page = 0; page < 40; page++) {
    let q = db.collection(coll);
    if (last != null) q = q.where("u", "<", last);
    const snap = await q.orderBy("u", "desc").limit(500).get();
    for (const d of snap.docs) out.push({ ...d.data(), id: d.id });
    if (snap.size < 500) break;
    last = snap.docs[snap.size - 1]?.data().u;
  }
  return out;
}

// Aynı belgeye eşzamanlı yazma yok: yazılırken gelen değişiklik "again" ile sıraya girer.
const WQ = new Map<string, { busy: boolean; again: boolean }>();
async function dbWrite(path: string): Promise<void> {
  if (!Store.db) return;
  let e = WQ.get(path);
  if (!e) { e = { busy: false, again: false }; WQ.set(path, e); }
  if (e.busy) { e.again = true; return; }
  e.busy = true; let tries = 0;
  do {
    e.again = false;
    const [coll = "", id = ""] = path.split("/");
    const doc: object | undefined = coll === "settings" ? Store.settings : isColl(coll) ? Store[coll][id] : undefined;
    if (!doc) break;
    try {
      await Store.db.doc(path).set(JSON.parse(JSON.stringify(doc)));
      Store.dirty.delete(path); Store.saveLocal();
    } catch (err) {
      const code = errCode(err);
      if ((code === "unavailable" || !code) && tries++ < 2) { await sleep(400 + Math.random() * 800); e.again = true; }
      else if (code === "revoked" || code === "not_granted" || code === "capability_disabled") { Store.db = null; Store.status = "local"; }
      else console.warn("db yazılamadı", path, code);
    }
  } while (e.again && Store.db);
  e.busy = false;
}
