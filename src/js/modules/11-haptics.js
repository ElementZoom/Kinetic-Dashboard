// ---------- haptics: a short buzz on taps (Vibration API; silently does nothing where unsupported) ----------
(function () {
  if (!navigator.vibrate) return;
  const HIT = "#ttl.bk,button,a,[role=button],[data-k],[data-i],[data-p],[data-pg],[data-ly],.tl,.bd,.chip,.eb,.rc,.card,.cd,.pk,.sty,.spb,.kpb,.rnd,.snap,.cam,.seg>*,#btab *,nav *,#mshe *,summary,label";
  let last = 0;
  const buzz = ms => { const n = Date.now(); if (n - last < 40 || CONFIG.haptics === false) return; last = n; try { navigator.vibrate(ms); } catch (_) {} };
  document.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    const t = e.target.closest && e.target.closest(HIT); if (!t) return;
    const ms = +CONFIG.hapticMs || 35; buzz(t.matches("#btab *,nav *,#mshe *") ? Math.round(ms * .7) : ms);
  }, { passive: true, capture: true });
  let sl = 0;
  document.addEventListener("input", e => { if (e.target.type === "range" && Date.now() - sl > 70) { sl = Date.now(); buzz(Math.round((+CONFIG.hapticMs || 35) * .35)); } }, { passive: true, capture: true });
})();
