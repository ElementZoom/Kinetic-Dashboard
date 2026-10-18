// ---------- keep looping animations in one shared rhythm ----------
// Re-drawing a card (new data, re-sorting) creates its animation again, which used to restart the glow from zero (a visible "glitch").
// Every endless animation is pinned to the page clock instead, so a re-created card simply carries on where it would have been.
(function () {
  if (!document.getAnimations || typeof CSSAnimation === "undefined") return;
  let q = 0;
  const pin = () => { q = 0; document.getAnimations().forEach(a => { try { if (a instanceof CSSAnimation && a.effect && a.effect.getComputedTiming().iterations === Infinity && !/^zwv$/.test(a.animationName) && a.startTime !== 0) a.startTime = 0; } catch (_) {} }); };
  const sched = () => { if (!q) q = setTimeout(pin, 60); };
  new MutationObserver(sched).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  sched();
})();
