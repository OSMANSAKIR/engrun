import { $, $$, $opt } from "./dom";

export interface ModalHandle { el: HTMLElement; close: () => void }

/** Ekranın ortasında pencere. sticky: dışına tıklayınca kapanmaz. */
export function modal(html: string, opts: { onClose?: () => void; sticky?: boolean } = {}): ModalHandle {
  const o = document.createElement("div"); o.className = "overlay";
  o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(o);
  const close = () => { o.remove(); opts.onClose?.(); };
  o.addEventListener("click", e => { if (e.target === o && !opts.sticky) close(); });
  $$("[data-close]", o).forEach(b => b.addEventListener("click", close));
  $opt("button", o)?.focus();
  return { el: o, close };
}

export function confirmBox(text: string, yes: string, no = "Vazgeç"): Promise<boolean> {
  return new Promise(res => {
    const m = modal(`<p style="font-size:17px;font-weight:700">${text}</p><div class="row"><button class="btn grow" data-no>${no}</button><button class="btn primary grow" data-yes>${yes}</button></div>`, { onClose: () => res(false) });
    $("[data-yes]", m.el).onclick = () => { m.el.remove(); res(true); };
    $("[data-no]", m.el).onclick = () => { m.el.remove(); res(false); };
  });
}
