// ---------- first-load gate ----------
// Until the first data is in (states, forecast, who is signed in) the page stays hidden (html.boot); then every block fades in, top to bottom.
// Safety nets: 1.4 s after the states arrive, 4.5 s after load, straight away on the login screen, and on a JS error (window.onerror above).
const bootNeed = { s: 1, f: 1 }; if (!userKnown) bootNeed.u = 1; let bootDone = false;
function bootMark(k) { delete bootNeed[k]; if (!Object.keys(bootNeed).length) bootGo(); }
function bootGo() {
  if (bootDone) return; bootDone = true;
  const fin = () => requestAnimationFrame(() => requestAnimationFrame(bootShow));   // two frames: the queued home()/render() redraws have run
  const hold = () => {   // brand: the intro, or a logo that has already started to show, stays up for a minimum time so it never just blinks
    const t0 = window.__brandT0, now = performance.now(), B = CONFIG.brand || {};
    let end = window.__introEnd || 0;
    if (!end && t0 && !window.__noHold && now > t0 + 450) end = t0 + 450 + (B.minShow != null ? B.minShow : 1000);
    const w = end - now; if (w > 0) setTimeout(fin, w); else fin();
  };
  try { Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(hold, hold); } catch (_) { hold(); }
}
function bootShow() {
  const root = document.documentElement, vh = innerHeight;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh; };
  const chrome = [".main>header", "nav", "#btab"].map(q => $(q)).filter(e => e && vis(e));
  const pg = $(".page.on"), all = pg ? $$(".pn,.card,a.rc,.cam,.tl,.chips,.eh,.cg", pg) : [];
  const blk = all.filter(e => !all.some(o => o !== e && o.contains(e)) && vis(e));   // outermost blocks only
  if (pg) Array.prototype.forEach.call(pg.children, c => { if (vis(c) && !blk.some(b => c.contains(b) || b.contains(c))) blk.push(c); });
  const pos = e => { const r = e.getBoundingClientRect(); return [Math.round(r.top / 30), r.left]; };
  blk.sort((a, b) => { const p = pos(a), q = pos(b); return p[0] - q[0] || p[1] - q[1]; });   // reading order: top to bottom, then left to right
  const step = Math.min(90, 540 / Math.max(1, blk.length - 1)), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go = (e, d, y) => { try { e.animate([{ opacity: 0, transform: "translateY(" + y + "px)", offset: 0 }], { duration: 460, delay: d, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" }); } catch (_) {} };
  root.classList.remove("boot");
  const bl = $("#bootld");   // brand logo: fade it out while the page appears (only if it was actually on screen)
  if (bl && root.classList.contains("brand")) {
    const shown = root.classList.contains("intro") || performance.now() - (window.__brandT0 || 0) > 450;
    if (shown && !still && bl.animate) { bl.style.display = "grid"; const a = bl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: "forwards" }), done = () => { try { a.cancel(); } catch (_) {} bl.remove(); }; a.onfinish = done; setTimeout(done, 700); }
    else bl.remove();
  }
  if (still || !Element.prototype.animate) return;
  chrome.forEach(e => go(e, 0, 0));
  blk.forEach((e, i) => go(e, 80 + i * step, 14));
}
setTimeout(bootGo, 4500);
const brandOn = () => !!(CONFIG.brand && window.brandLogo());
const brandBlock = (cls, sfx, extra) => { if (!brandOn()) return ""; const lk = window.brandLogo().lockup; return '<div class="' + cls + '">' + window.brandMark(sfx) + '<div>' + (lk ? "" : '<b>' + esc(CONFIG.brand.name || "") + '</b><small>' + esc(CONFIG.brand.tag || "") + '</small>') + (extra || "") + '</div></div>'; };

