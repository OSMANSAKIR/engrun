import { REDUCED } from "./dom";

interface Piece { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string }

// Kendi konfetimiz: sayfa API anahtarı tutabildiği için dışarıdan script yüklenmiyor.
export function confettiBurst(big: boolean): void {
  if (REDUCED) return;
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); if (!g) { cv.remove(); return; }
  g.scale(dpr, dpr);
  const colors = ["#3fd8f7", "#ff4f9b", "#ffc847", "#45e3a4"];
  const ps: Piece[] = Array.from({ length: big ? 160 : 80 }, () => {
    const a = -Math.PI / 2 + (Math.random() - .5) * (big ? 1.9 : 1.3), v = 9 + Math.random() * (big ? 10 : 7);
    return { x: W / 2, y: H * .6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 5, h: 3 + Math.random() * 4, c: colors[Math.random() * colors.length | 0]! };
  });
  const t0 = performance.now(), life = 2.6;
  const frame = (t: number) => {
    const k = (t - t0) / 1000; g.clearRect(0, 0, W, H); g.globalAlpha = Math.max(0, 1 - k / life);
    for (const p of ps) {
      p.vy += .35; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (k < life) requestAnimationFrame(frame); else cv.remove();
  };
  frame(t0);
}
