/* Açılış: olay dinleyicileri, kayıtların yüklenmesi, sorular, ilk ekran. */
import { Sound } from "./audio/sound";
import { setSample } from "./core/ai";
import { loadData, POOL } from "./core/pool";
import { bump, S, Store } from "./core/store";
import { G } from "./core/goal";
import { sleep } from "./lib/time";
import { refreshAiBox } from "./ui/ai-panel";
import { $, $$, $opt } from "./ui/dom";
import { EXAM } from "./ui/exam";
import { openGoal } from "./ui/goal-modal";
import { installMarking, MARK, markTarget } from "./ui/marking";
import { installPlayKeys, PLAY } from "./ui/play";
import { installExamScreen } from "./ui/screens/exam";
import { installPractice } from "./ui/screens/practice";
import { installReview } from "./ui/screens/review";
import { installRun } from "./ui/screens/run";
import { installToday } from "./ui/screens/today";
import { openSettings } from "./ui/settings";
import { applyTheme, go, main, render, updateTop } from "./ui/shell";

function installShell(): void {
  $$(".nav button").forEach(b => b.addEventListener("click", () => go(b.dataset.go || "today")));
  $("#btnSettings").addEventListener("click", openSettings);

  // Her tıklamada kısa bir "tık". Sonucu kendi sesiyle duyulan düğmeler (güven, kelime kartı şıkları,
  // kelime işaretleme) ve sessiz deneme modu hariç.
  document.addEventListener("click", e => {
    if (EXAM.active || !(e.target instanceof Element)) return;
    const t = e.target.closest("button, summary, a, select, .switch, [role=button], [data-gate]");
    if (!t || t.getAttribute("aria-disabled") === "true" || t.matches("[data-conf], #vOpts .opt")) return;
    if (MARK.on && e.target.closest(".w") && markTarget()) return;
    Sound.click();
  }, true);

  // Tarayıcılar sesi ancak ilk kullanıcı hareketinden sonra açar.
  const firstGesture = () => {
    document.removeEventListener("pointerdown", firstGesture, true);
    document.removeEventListener("keydown", firstGesture, true);
    if (Sound.ensure()) { Sound.setVolume(S().volume ?? .6); Sound.setTrack(PLAY.run ? PLAY.run.gate.section : "lobby"); Sound.sync(); }
  };
  document.addEventListener("pointerdown", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);
  document.addEventListener("visibilitychange", () => { if (!Sound.ready) return; if (document.hidden) Sound.suspend(); else Sound.resume(); });
}

async function boot(): Promise<void> {
  installShell(); installMarking(); installPlayKeys();
  installToday(); installRun(); installReview(); installPractice(); installExamScreen();

  Store.load(); applyTheme();
  const cl = window.claude;
  if (cl && typeof cl.use === "function") {
    Promise.race([cl.use("sample"), sleep(10000).then(() => null)]).then(s => { setSample(s || null); refreshAiBox(); }).catch(() => {});
  }
  const dbP = Store.connect();
  await loadData();
  render();
  if (!POOL.size) main.innerHTML = `<div class="wrap"><div class="empty">Soru verisi yüklenemedi. data/manifest.json dosyasını kontrol et.</div></div>`;
  await dbP;
  bump(); applyTheme();
  if (!PLAY.active && !EXAM.active) render(); else updateTop();
  if (!G() && !S().goalAsked && !PLAY.active && !EXAM.active && !$opt(".overlay")) openGoal(true);
}

void boot();
