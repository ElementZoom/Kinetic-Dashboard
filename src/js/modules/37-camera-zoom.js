// ---------- cameras: pinch to zoom, drag to move the picture ----------
// Works on the live picture of a full-screen camera card (Home / Security card, and the #view page) and on the recording players (camera Playback, Detections). Two fingers (or the mouse wheel) zoom,
// one finger moves the zoomed picture, a tap while zoomed puts it back (a tap on the unzoomed live picture still closes the card; on a zoomed recording a tap shows the round play / pause button and a double tap puts it back). Turn it off with  camZoom: false  in config.js.
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
const czPlayer = el => !!el && (el.classList.contains("pbv") || el.classList.contains("dtv"));
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
  const t = e.target; if (CONFIG.camZoom === false || !t || !t.closest || t.closest(".cpanel,button,.aud,.pbh,.pbf,.pbl,.dth,.zbar")) return null;
  const gc = t.closest(".zgc"); if (gc) { const q = gc.parentElement; return q.querySelector("video").getAttribute("src") ? q : null; }   // the clear layer over a recording player
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
  if (czPlayer(el)) {   // a recording: a tap shows / hides the controls, a double tap on a zoomed picture puts it back
    e.stopPropagation(); e.preventDefault(); const n = Date.now(); if (el._z && el._z.s > 1 && n - (el._zlast || 0) < 320) { el._zlast = 0; czReset(el); return; } el._zlast = n; czPpShow(el, !el._zshow); return;
  }
  if (el._z && el._z.s > 1) { czReset(el); e.stopPropagation(); e.preventDefault(); }   // tap while zoomed = back to normal
}, true);
["loadstart", "emptied"].forEach(n => document.addEventListener(n, e => { const p = e.target && e.target.tagName === "VIDEO" ? e.target.parentElement : null; if (p && p._z) czReset(p); }, true));   // a new recording starts unzoomed
document.addEventListener("wheel", e => {
  const el = czTarget(e); if (!el) return;
  const z = czState(el), s = Math.max(1, Math.min(CZ.max, z.s * Math.exp(-e.deltaY * .0015))), m = czLocal(el, e.clientX, e.clientY);
  e.preventDefault(); czApply(el, s, m.x - (m.x - z.x) * (s / z.s), m.y - (m.y - z.y) * (s / z.s));
}, { capture: true, passive: false });
addEventListener("resize", () => { document.querySelectorAll(".zm").forEach(czReset); }); addEventListener("hashchange", () => { document.querySelectorAll(".zm").forEach(czReset); });

// ---------- recording players: one set of controls of our own ----------
// The browser's own controls sit inside the <video>, so they grew, slid around and doubled up (a second play button) when the picture was zoomed or the player went full screen.
// Camera Playback and Detections now use: a clear layer over the picture (it catches the pinch, the drag and the taps), one round play / pause button in the middle that never changes size, and a bar
// with the seek line, the time, sound and full screen. Full screen is the player itself, so zooming works there too, in both orientations. Turn it all off with  camZoom: false.
const CZI = { play: '<svg viewBox="0 0 24 24" width="34" height="34"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>', pause: '<svg viewBox="0 0 24 24" width="34" height="34"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.4 2.4c.1-.2.1-.4.1-.6zM19 12c0 .9-.2 1.8-.5 2.600l1.500 1.500A9 9 0 0 0 21 12a9 9 0 0 0-7-8.800v2.100A7 7 0 0 1 19 12zM4.300 3 3 4.300 7.700 9H3v6h4l5 5v-6.700l4.200 4.200c-.7.500-1.400.9-2.200 1.100v2.100a9 9 0 0 0 3.600-1.800l2.100 2.100 1.300-1.300L4.300 3zM12 4 9.900 6.100 12 8.200z"/></svg>',
  full: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/></svg>',
  exit: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>' };
const czFmt = t => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); };
const czFsNow = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function czUi(el) {
  const v = el.querySelector("video"), show = v.paused || !!el._zshow;
  el._zpp.classList.toggle("on", show); el._zbar.classList.toggle("on", show); el._zpp.innerHTML = v.paused ? CZI.play : CZI.pause;
  el._zmu.innerHTML = v.muted || v.volume === 0 ? CZI.mute : CZI.vol; el._zfs.innerHTML = (czFsNow() === el || el.classList.contains("zfull")) ? CZI.exit : CZI.full;
  if (!el._zdrag) { const d = v.duration || 0; el._zr.value = d ? Math.round(v.currentTime / d * 1000) : 0; el._zt.textContent = czFmt(v.currentTime) + " / " + czFmt(d); }
}
function czPpShow(el, on) { if (!el._zui) return; clearTimeout(el._ztm); el._zshow = on; czUi(el); const v = el.querySelector("video"); if (on && !v.paused) el._ztm = setTimeout(() => { el._zshow = false; czUi(el); }, 3000); }
function czFull(el) {
  if (czFsNow() === el) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (el.classList.contains("zfull")) { el.classList.remove("zfull"); czReset(el); czUi(el); return; }
  const rf = el.requestFullscreen || el.webkitRequestFullscreen; let p; if (rf) { try { p = rf.call(el); } catch (x) { p = Promise.reject(x); } }
  const pseudo = () => { el.classList.add("zfull"); czReset(el); czUi(el); };   // no real full screen here (an iPhone, an iframe that does not allow it): fill the page instead
  if (!rf) pseudo(); else Promise.resolve(p).catch(pseudo);
}
function czEnhance(el) {
  if (el._zui || CONFIG.camZoom === false) return; const v = el.querySelector("video"); if (!v) return; el._zui = 1;
  v.removeAttribute("controls"); el.classList.add("zc");
  const mk = (tag, cls, html) => { const n = document.createElement(tag); n.className = cls; if (html) n.innerHTML = html; if (tag === "button") n.type = "button"; return n; };
  const gc = mk("div", "zgc"), pp = mk("button", "zpp"), bar = mk("div", "zbar"), tm = mk("span", "zt", "0:00 / 0:00"), rg = mk("input", "zr"), mu = mk("button", "zbt"), fs = mk("button", "zbt");
  rg.type = "range"; rg.min = 0; rg.max = 1000; rg.value = 0; pp.setAttribute("aria-label", "Play or pause"); mu.setAttribute("aria-label", "Sound"); fs.setAttribute("aria-label", "Full screen");
  bar.append(tm, rg, mu, fs); el.append(gc, pp, bar); Object.assign(el, { _zpp: pp, _zbar: bar, _zt: tm, _zr: rg, _zmu: mu, _zfs: fs });
  pp.onclick = e => { e.stopPropagation(); if (v.paused) v.play().catch(() => {}); else v.pause(); czPpShow(el, true); };
  mu.onclick = e => { e.stopPropagation(); v.muted = !v.muted; czPpShow(el, true); };
  fs.onclick = e => { e.stopPropagation(); czFull(el); czPpShow(el, true); };
  rg.oninput = () => { if (v.duration) v.currentTime = rg.value / 1000 * v.duration; el._zt.textContent = czFmt(v.currentTime) + " / " + czFmt(v.duration); clearTimeout(el._ztm); };
  rg.addEventListener("pointerdown", () => { el._zdrag = 1; }); ["pointerup", "pointercancel", "change"].forEach(n => rg.addEventListener(n, () => { el._zdrag = 0; czPpShow(el, true); }));
  ["play", "pause", "ended", "timeupdate", "durationchange", "loadedmetadata", "volumechange", "emptied"].forEach(n => v.addEventListener(n, () => czUi(el)));
  v.addEventListener("play", () => czPpShow(el, true)); czUi(el);
}
const czScan = () => document.querySelectorAll(".pbv,.dtv").forEach(czEnhance);
czScan(); if (window.MutationObserver) { let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; czScan(); }); }).observe(document.body, { childList: true, subtree: true }); }
["loadstart"].forEach(n => document.addEventListener(n, e => { const p = e.target && e.target.tagName === "VIDEO" ? e.target.parentElement : null; if (p && czPlayer(p)) czEnhance(p); }, true));
["fullscreenchange", "webkitfullscreenchange"].forEach(n => document.addEventListener(n, () => { document.querySelectorAll(".zm").forEach(czReset); document.querySelectorAll(".zc").forEach(e => { if (e._zui) czUi(e); }); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".zc.zfull").forEach(czFull); });
