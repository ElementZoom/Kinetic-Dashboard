// ---------- cameras: pinch to zoom, drag to move the picture ----------
// Works on the live picture of a full-screen camera card (Home / Security card, and the #view page) and on the recording players (camera Playback, Detections). Two fingers (or the mouse wheel) zoom,
// one finger moves the zoomed picture, a tap while zoomed puts it back (a tap on the unzoomed live picture still closes the card). Turn it off with  camZoom: false  in config.js.
const CZ = { pts: new Map(), el: null, s0: 1, d0: 0, x0: 0, y0: 0, fx: 0, fy: 0, px: 0, py: 0, moved: 0, t: 0, max: 6 };
const czOk = el => CONFIG.camZoom !== false && !!el && (el.classList.contains("fs") || el.classList.contains("vf")) && !el.classList.contains("pb") && !el.classList.contains("fclose");
const czRot = el => !!el.closest(".cam.ls");   // turned with CSS (not by the phone): the card's x axis runs down the screen
const czState = el => el._z || (el._z = { s: 1, x: 0, y: 0 });
function czApply(el, s, x, y) {
  const z = czState(el); s = Math.max(1, Math.min(CZ.max, s));
  const mx = (s - 1) * el.clientWidth / 2, my = (s - 1) * el.clientHeight / 2; x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
  if (s < 1.02) { czReset(el); return; }
  z.s = s; z.x = x; z.y = y; el.style.setProperty("--zs", s.toFixed(3)); el.style.setProperty("--zx", x.toFixed(1) + "px"); el.style.setProperty("--zy", y.toFixed(1) + "px"); el.classList.add("zm");
}
function czReset(el) { if (!el) return; el._z = null; el.classList.remove("zm"); el.style.removeProperty("--zs"); el.style.removeProperty("--zx"); el.style.removeProperty("--zy"); }
function czLocal(el, sx, sy) {   // a screen point as card-centred coordinates
  const r = el.getBoundingClientRect(), vx = sx - (r.left + r.width / 2), vy = sy - (r.top + r.height / 2); return czRot(el) ? { x: vy, y: -vx } : { x: vx, y: vy };
}
function czDelta(el, dx, dy) { return czRot(el) ? { x: dy, y: -dx } : { x: dx, y: dy }; }
function czBase(el) {   // (re)start from the fingers now down
  const z = czState(el), a = [...CZ.pts.values()]; CZ.s0 = z.s; CZ.x0 = z.x; CZ.y0 = z.y;
  if (a.length > 1) { CZ.d0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; const m = czLocal(el, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2); CZ.fx = m.x; CZ.fy = m.y; }
  else if (a.length) { CZ.px = a[0].x; CZ.py = a[0].y; }
}
const czTarget = e => {   // the card / player a touch landed on, or null
  const t = e.target; if (CONFIG.camZoom === false || !t || !t.closest || t.closest(".cpanel,button,.aud,.pbh,.pbf,.pbl,.dth")) return null;
  const v = t.closest("img,video"); if (!v) return null; const p = v.parentElement;
  if (p && (p.classList.contains("pbv") || p.classList.contains("dtv"))) {   // a recording player: not over its own play bar
    if (v.tagName !== "VIDEO" || !v.getAttribute("src")) return null; if (v.hasAttribute("controls") && e.clientY > p.getBoundingClientRect().bottom - 70) return null; return p;
  }
  const el = v.closest(".cam"); return el && v.parentElement === el && czOk(el) ? el : null;
};
document.addEventListener("pointerdown", e => {
  if (e.pointerType === "mouse") return;
  const el = czTarget(e); if (!el) return;
  if (CZ.el && CZ.el !== el) { CZ.pts.clear(); } CZ.el = el;
  CZ.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (CZ.pts.size === 1) CZ.moved = 0; else CZ.moved = 1;
  czBase(el);
}, true);
document.addEventListener("pointermove", e => {
  const el = CZ.el, p = el && CZ.pts.get(e.pointerId); if (!p || (el.classList.contains("cam") && !czOk(el))) return;
  const z = czState(el), prev = { x: p.x, y: p.y }; p.x = e.clientX; p.y = e.clientY;
  if (CZ.pts.size >= 2) {
    const a = [...CZ.pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, s = Math.max(1, Math.min(CZ.max, CZ.s0 * d / CZ.d0)), m = czLocal(el, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2);
    CZ.moved = 1; czApply(el, s, m.x - (CZ.fx - CZ.x0) * (s / CZ.s0), m.y - (CZ.fy - CZ.y0) * (s / CZ.s0)); e.preventDefault();
  } else if (z.s > 1) {
    const d = czDelta(el, p.x - prev.x, p.y - prev.y); if (Math.abs(p.x - CZ.px) + Math.abs(p.y - CZ.py) > 6) CZ.moved = 1; czApply(el, z.s, z.x + d.x, z.y + d.y); e.preventDefault();
  } else if (Math.abs(p.x - CZ.px) + Math.abs(p.y - CZ.py) > 10) CZ.moved = 1;
}, { capture: true, passive: false });
const czUp = e => {
  if (!CZ.pts.has(e.pointerId)) return; CZ.pts.delete(e.pointerId); if (CZ.moved) CZ.t = Date.now();   // a drag or pinch must not count as a tap that closes the card
  if (CZ.el) czBase(CZ.el); if (!CZ.pts.size) CZ.el = null;
};
document.addEventListener("pointerup", czUp, true); document.addEventListener("pointercancel", czUp, true);
document.addEventListener("click", e => {
  const el = czTarget(e); if (!el) return;
  if (Date.now() - CZ.t < 450) { e.stopPropagation(); e.preventDefault(); return; }
  if (el._z && el._z.s > 1) { czReset(el); e.stopPropagation(); e.preventDefault(); }   // tap while zoomed = back to normal
}, true);
["loadstart", "emptied"].forEach(n => document.addEventListener(n, e => { const p = e.target && e.target.tagName === "VIDEO" ? e.target.parentElement : null; if (p && p._z) czReset(p); }, true));   // a new recording starts unzoomed
document.addEventListener("wheel", e => {
  const el = czTarget(e); if (!el) return;
  const z = czState(el), s = Math.max(1, Math.min(CZ.max, z.s * Math.exp(-e.deltaY * .0015))), m = czLocal(el, e.clientX, e.clientY);
  e.preventDefault(); czApply(el, s, m.x - (m.x - z.x) * (s / z.s), m.y - (m.y - z.y) * (s / z.s));
}, { capture: true, passive: false });
addEventListener("resize", () => { document.querySelectorAll(".zm").forEach(czReset); }); addEventListener("hashchange", () => { document.querySelectorAll(".zm").forEach(czReset); });
