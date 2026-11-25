import type { Medal } from "../types";

export const ICON = {
  heart: (on: boolean): string => `<svg viewBox="0 0 24 24" class="${on ? "" : "off"}" aria-hidden="true"><path fill="var(--bad)" d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.5 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.5h2C14 6.1 15.4 5 17.4 5c3.4 0 5.4 3.5 4.1 6.7C19.5 16.4 12 21 12 21z"/></svg>`,
  medal: (kind: Medal): string => `<svg viewBox="0 0 24 24" class="badge" aria-label="${kind === "gold" ? "Altın rozet" : "Gümüş rozet"}"><circle cx="12" cy="12" r="10" fill="${kind === "gold" ? "var(--gold)" : "var(--muted)"}"/><path d="M12 6.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L12 15.1 8.6 16.9l.7-3.8-2.8-2.6 3.8-.5z" fill="var(--surface)"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="var(--flame)" d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 0 2 1 3 2 3-1-3 .5-6 .5-9z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>`
};
