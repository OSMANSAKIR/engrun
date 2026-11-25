// claude.ai içinde Artifact olarak açılınca sayfaya eklenen köprü (window.claude).
// GitHub Pages'te ya da yerelde yoktur; kod her zaman yokluğuna hazırlıklıdır.

export interface ClaudeDocData { [k: string]: unknown; u?: number }

export interface ClaudeSnapshot {
  docs: { id: string; data(): ClaudeDocData }[];
  size: number;
}

export interface ClaudeQuery {
  where(field: string, op: "<" | "<=" | "==" | ">=" | ">", value: unknown): ClaudeQuery;
  orderBy(field: string, dir?: "asc" | "desc"): ClaudeQuery;
  limit(n: number): ClaudeQuery;
  get(): Promise<ClaudeSnapshot>;
}

export interface ClaudeDb {
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): ClaudeDocData }>;
    set(data: unknown): Promise<void>;
  };
  collection(name: string): ClaudeQuery;
}

export interface SampleTextOptions { signal?: AbortSignal; onText?: (p: { text: string; delta: string }) => void }
export interface SampleFn {
  (prompt: string, opts?: SampleTextOptions): Promise<{ text: string }>;
  json(prompt: string, opts?: { signal?: AbortSignal; modelTier?: "quick" }): Promise<unknown>;
}

export interface ClaudeBridge {
  use(cap: "db"): Promise<ClaudeDb>;
  use(cap: "sample"): Promise<SampleFn>;
}

declare global {
  interface Window {
    claude?: ClaudeBridge;
    webkitAudioContext?: typeof AudioContext;
  }
}
