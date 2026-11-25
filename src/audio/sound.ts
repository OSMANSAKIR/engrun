/* Ses: Web Audio ile prosedürel müzik ve efektler. Hiç ses dosyası yok; her şey kodla üretilir.
   Tarayıcılar sesi ilk kullanıcı dokunuşuna kadar başlatmaz; ensure() o anda çağrılır. */
import { DUCK_SECTIONS, type Section } from "../config/sections";
import { S } from "../core/store";

type ModeName = "major" | "dorian" | "mixo" | "minor" | "lydian" | "phryg";
const MODES: Record<ModeName, number[]> = { major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phryg: [0, 1, 3, 5, 7, 8, 10] };

interface Track { bpm: number; root: number; mode: ModeName; prog: number[]; kick: number[]; snare: number[]; hat: number; arp: number; swing: number; lead: OscillatorType }
export type TrackName = "lobby" | Section;

// Her bölümün kendi havası: tempo, mod, akor yürüyüşü, davul yoğunluğu, arpej yoğunluğu
const TRACKS: Record<TrackName, Track> = {
  lobby:           { bpm: 82,  root: 57, mode: "dorian", prog: [0, 3, 6, 4], kick: [0, 10], snare: [8], hat: 2, arp: .45, swing: .12, lead: "triangle" },
  vocab:           { bpm: 100, root: 60, mode: "major",  prog: [0, 5, 3, 4], kick: [0, 8], snare: [4, 12], hat: 2, arp: .7, swing: .08, lead: "square" },
  grammar:         { bpm: 118, root: 62, mode: "mixo",   prog: [0, 6, 3, 4], kick: [0, 6, 8, 14], snare: [4, 12], hat: 1, arp: .85, swing: 0, lead: "square" },
  cloze:           { bpm: 92,  root: 57, mode: "dorian", prog: [0, 3, 4, 3], kick: [0, 10], snare: [8], hat: 2, arp: .5, swing: .1, lead: "triangle" },
  sentence:        { bpm: 104, root: 55, mode: "minor",  prog: [0, 5, 2, 6], kick: [0, 8, 11], snare: [4, 12], hat: 2, arp: .65, swing: .06, lead: "square" },
  trans_en_tr:     { bpm: 78,  root: 60, mode: "lydian", prog: [0, 1, 4, 0], kick: [0], snare: [], hat: 4, arp: .35, swing: .1, lead: "sine" },
  trans_tr_en:     { bpm: 80,  root: 62, mode: "lydian", prog: [0, 4, 1, 0], kick: [0], snare: [], hat: 4, arp: .35, swing: .1, lead: "sine" },
  reading:         { bpm: 64,  root: 53, mode: "major",  prog: [0, 3, 5, 4], kick: [], snare: [], hat: 0, arp: .25, swing: 0, lead: "sine" },
  dialogue:        { bpm: 108, root: 64, mode: "major",  prog: [0, 4, 5, 3], kick: [0, 8], snare: [4, 12], hat: 2, arp: .7, swing: .05, lead: "square" },
  restatement:     { bpm: 74,  root: 57, mode: "dorian", prog: [0, 4, 3, 0], kick: [0], snare: [], hat: 4, arp: .3, swing: .1, lead: "sine" },
  para_completion: { bpm: 70,  root: 55, mode: "major",  prog: [0, 5, 3, 4], kick: [], snare: [], hat: 0, arp: .3, swing: 0, lead: "sine" },
  irrelevant:      { bpm: 88,  root: 52, mode: "phryg",  prog: [0, 1, 0, 6], kick: [0, 10], snare: [8], hat: 2, arp: .45, swing: .1, lead: "triangle" }
};

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// Ses grafiği: müzik → alçak geçiren filtre → kısma (duck) → ana ses; efektler doğrudan ana sese.
interface Graph { ctx: AudioContext; master: GainNode; music: GainNode; duck: GainNode; sfx: GainNode; noise: AudioBuffer }

class SoundEngine {
  private g: Graph | null = null;
  private track: TrackName = "lobby";
  private playing = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private next = 0;
  private step = 0;
  private bar = 0;
  examMute = false;                        // deneme modu tamamen sessiz

  get ready(): boolean { return !!this.g; }

  ensure(): boolean {
    if (!this.g) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      const ctx = new AC();
      const master = ctx.createGain(); master.gain.value = S().volume ?? .6; master.connect(ctx.destination);
      const music = ctx.createGain(); music.gain.value = .55;
      const duck = ctx.createGain(); duck.gain.value = 1;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200; lp.Q.value = .4;
      music.connect(lp); lp.connect(duck); duck.connect(master);
      const sfx = ctx.createGain(); sfx.gain.value = .9; sfx.connect(master);
      const len = ctx.sampleRate; const noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.g = { ctx, master, music, duck, sfx, noise };
    }
    if (this.g.ctx.state === "suspended") void this.g.ctx.resume();
    return true;
  }

  suspend(): void { void this.g?.ctx.suspend(); }
  resume(): void { void this.g?.ctx.resume(); }
  setVolume(v: number): void { const g = this.g; if (g) g.master.gain.setTargetAtTime(v, g.ctx.currentTime, .05); }

  setTrack(name: TrackName): void {
    this.track = TRACKS[name] ? name : "lobby";
    const g = this.g; if (g) g.duck.gain.setTargetAtTime(DUCK_SECTIONS.has(name) ? .3 : 1, g.ctx.currentTime, .4);
  }

  /** Ayarlara ve moda göre müziği aç/kapa. */
  sync(): void {
    const want = S().music && !this.examMute;
    if (want && this.g && !this.playing) this.start();
    else if (!want && this.playing) this.stop();
  }

  private start(): void {
    if (!this.ensure() || this.playing || !this.g) return;
    const { ctx, music } = this.g;
    this.playing = true; this.next = ctx.currentTime + .1; this.step = 0;
    music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setValueAtTime(0, ctx.currentTime); music.gain.linearRampToValueAtTime(.55, ctx.currentTime + 1.2);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private stop(): void {
    if (!this.playing) return;
    this.playing = false; clearInterval(this.timer);
    const g = this.g; if (g) { g.music.gain.cancelScheduledValues(g.ctx.currentTime); g.music.gain.setTargetAtTime(0, g.ctx.currentTime, .15); }
  }

  // 25 ms'de bir uyanıp önümüzdeki 120 ms'nin notalarını önceden planlar (zamanlama kaymasın diye).
  private schedule(): void {
    const g = this.g; if (!g) return;
    while (this.next < g.ctx.currentTime + .12) { this.playStep(g, this.step, this.next); this.advance(); }
  }

  private advance(): void {
    const t = TRACKS[this.track]; const s16 = 60 / t.bpm / 4;
    const sw = (this.step % 2 === 0) ? s16 * (1 + t.swing) : s16 * (1 - t.swing);
    this.next += sw; this.step = (this.step + 1) % 16; if (this.step === 0) this.bar = (this.bar + 1) % 4;
  }

  private chord(): number[] {
    const t = TRACKS[this.track]; const sc = MODES[t.mode]; const deg = t.prog[this.bar % t.prog.length]!;
    const note = (i: number) => { const k = deg + i; return t.root + sc[k % 7]! + 12 * Math.floor(k / 7); };
    return [note(0), note(2), note(4), note(6)];
  }

  private playStep(g: Graph, st: number, time: number): void {
    const t = TRACKS[this.track]; const ch = this.chord(); const barLen = 60 / t.bpm * 4;
    if (t.kick.includes(st)) this.kick(g, time);
    if (t.snare.includes(st)) this.noiseHit(g, time, .16, .12, "bandpass", 1800, g.music);
    if (t.hat && st % t.hat === (t.hat > 1 ? t.hat / 2 : 0)) this.noiseHit(g, time, .04, st % 4 === 2 ? .05 : .03, "highpass", 7000, g.music);
    if (st === 0) { this.pad(g, ch, time, barLen); this.bass(g, ch[0]! - 24, time, barLen * .45); }
    if (st === 8 && t.kick.length) this.bass(g, ch[0]! - 24, time, barLen * .4);
    if (st % 2 === 0) {
      const h = (this.bar * 16 + st) * 2654435761 % 100 / 100;  // deterministik "rastgele"
      if (h < t.arp) { const idx = [0, 1, 2, 3, 2, 1, 0, 2][(st / 2) % 8]!; this.osc(g, t.lead, mtof(ch[idx]! + 12), time, .16, .045, g.music); }
    }
  }

  private osc(g: Graph, type: OscillatorType, f: number, t0: number, dur: number, gain: number, dest: AudioNode, attack = .005): OscillatorNode {
    const o = g.ctx.createOscillator(); const v = g.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(gain, t0 + attack); v.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(v); v.connect(dest); o.start(t0); o.stop(t0 + dur + .05);
    return o;
  }

  private kick(g: Graph, t0: number): void { const o = this.osc(g, "sine", 120, t0, .32, .55, g.music); o.frequency.exponentialRampToValueAtTime(42, t0 + .18); }

  private noiseHit(g: Graph, t0: number, dur: number, gain: number, ft: BiquadFilterType, ff: number, dest: AudioNode): void {
    const s = g.ctx.createBufferSource(); s.buffer = g.noise;
    const f = g.ctx.createBiquadFilter(); f.type = ft; f.frequency.value = ff; const v = g.ctx.createGain();
    v.gain.setValueAtTime(gain, t0); v.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f); f.connect(v); v.connect(dest); s.start(t0, Math.random() * .5); s.stop(t0 + dur + .02);
  }

  private bass(g: Graph, m: number, t0: number, dur: number): void {
    const o = g.ctx.createOscillator(); const f = g.ctx.createBiquadFilter(); const v = g.ctx.createGain();
    o.type = "triangle"; o.frequency.value = mtof(m); f.type = "lowpass"; f.frequency.value = 500;
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(.22, t0 + .02); v.gain.setTargetAtTime(0, t0 + dur * .7, .08);
    o.connect(f); f.connect(v); v.connect(g.music); o.start(t0); o.stop(t0 + dur + .4);
  }

  private pad(g: Graph, ch: number[], t0: number, dur: number): void {
    const f = g.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; const v = g.ctx.createGain();
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(.05, t0 + dur * .3); v.gain.linearRampToValueAtTime(0, t0 + dur * 1.02);
    f.connect(v); v.connect(g.music);
    for (const m of ch.slice(0, 3)) for (const det of [-6, 6]) {
      const o = g.ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t0); o.stop(t0 + dur + .1);
    }
  }

  /* ---- efektler ---- */
  private fx(fn: (g: Graph, t: number) => void): void {
    if (!S().sfx || !this.ensure() || !this.g) return;
    try { fn(this.g, this.g.ctx.currentTime + .01); } catch { /* ses kritik değil */ }
  }
  correct(combo = 0): void { this.fx((g, t) => { const base = 72 + Math.min(combo, 12); this.osc(g, "triangle", mtof(base), t, .18, .22, g.sfx); this.osc(g, "triangle", mtof(base + 7), t + .08, .3, .2, g.sfx); this.osc(g, "sine", mtof(base + 19), t + .08, .25, .06, g.sfx); }); }
  wrong(): void { this.fx((g, t) => { const o = this.osc(g, "sawtooth", 150, t, .28, .16, g.sfx); o.frequency.linearRampToValueAtTime(85, t + .25); this.osc(g, "square", 75, t, .22, .06, g.sfx); }); }
  heart(): void { this.fx((g, t) => { this.noiseHit(g, t, .25, .25, "bandpass", 900, g.sfx); const o = this.osc(g, "sine", 520, t + .05, .45, .2, g.sfx); o.frequency.exponentialRampToValueAtTime(110, t + .45); }); }
  fanfare(): void { this.fx((g, t) => { [0, 4, 7, 12].forEach((n, i) => this.osc(g, "square", mtof(67 + n), t + i * .11, .22, .09, g.sfx)); [0, 4, 7].forEach(n => this.osc(g, "triangle", mtof(79 + n), t + .48, .9, .1, g.sfx)); }); }
  tick(i = 0): void { this.fx((g, t) => this.osc(g, "square", 1400 + i * 60, t, .03, .05, g.sfx)); }
  flip(): void { this.fx((g, t) => this.noiseHit(g, t, .18, .12, "highpass", 2500, g.sfx)); }
  click(): void { this.fx((g, t) => { this.osc(g, "triangle", 1250, t, .045, .07, g.sfx); this.noiseHit(g, t, .015, .03, "highpass", 5000, g.sfx); }); }
  mark(): void { this.fx((g, t) => { const o = this.osc(g, "sine", 660, t, .13, .13, g.sfx); o.frequency.exponentialRampToValueAtTime(1180, t + .08); }); }
  unmark(): void { this.fx((g, t) => { const o = this.osc(g, "sine", 1000, t, .1, .09, g.sfx); o.frequency.exponentialRampToValueAtTime(520, t + .08); }); }
  unlock(): void { this.fx((g, t) => { [0, 5, 9, 12, 17].forEach((n, i) => this.osc(g, "triangle", mtof(72 + n), t + i * .07, .25, .12, g.sfx)); }); }
}

export const Sound = new SoundEngine();
