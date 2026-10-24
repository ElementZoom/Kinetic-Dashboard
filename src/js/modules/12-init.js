// ---------- init ----------
CONFIG.rooms.forEach(r => $("#grid").appendChild(build(r)));
let gI = 0;
$("#gdots").innerHTML = CONFIG.rooms.map((r, i) => '<i data-i="' + i + '" title="' + esc(r.name || "") + '"' + (i ? "" : ' class="on"') + '></i>').join("");
$("#grid").addEventListener("scroll", () => { const g = $("#grid"); if (!g.clientWidth) return; gI = Math.round(g.scrollLeft / (g.clientWidth + 14)); $$("#gdots i").forEach((d, k) => d.classList.toggle("on", k === gI)); });
$("#grid").addEventListener("click", e => { const l = e.target.closest(".lbl.il"), c = l && l.parentNode; if (c && !c.classList.contains("main2") && isMobile()) { if (c.dataset.open) delete c.dataset.open; else c.dataset.open = "1"; } });
$("#mini").addEventListener("click", e => { if (!e.target.closest("button")) location.hash = "#climate"; });
$("#gdots").onclick = e => { const d = e.target.closest("[data-i]"); if (d) { const g = $("#grid"); g.scrollTo({ left: +d.dataset.i * (g.clientWidth + 14), behavior: "smooth" }); } };
CONFIG.house.forEach(r => Object.keys(r.counts || {}).forEach(k => { sensorIds[r.counts[k]] = 1; }));
CONFIG.tiles.forEach(t => {
  [t.climate, t.temp, t.hum].forEach(x => { if (x) sensorIds[x.split("#")[0]] = 1; });
  const el = document.createElement("a"); el.className = "rc"; el.href = "#rooms/" + (t.room || "");
  el.innerHTML = cardHtml(t.name, t.icon);
  $("#rooms").className = "rooms s-" + CONFIG.tileStyle; $("#rooms").appendChild(el); tileEls.push({ el: el, t: t });
});
const camIO = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { e.target._vis = e.isIntersecting; if (isMobile() && camPage()) { const c = camList().filter(x => x.o && x.o.el === e.target)[0]; if (c) { if (e.isIntersecting) { if (!c.live) { if (CONFIG.mobileLive !== false) liveCam(c); else camSnap(c); } } else if (CONFIG.mobileLive !== false && !e.target.classList.contains("fs")) { clearTimeout(c.rt); stopCam(c); } } } }), { rootMargin: "150px" }) : null;
const CAMREG = [], DETHOLD = {};
function detOf(id) { const b = id.replace(/^camera\./, "binary_sensor.").replace(/_(clear|fluent|sub|main)$/, ""); return { person: b + "_person", vehicle: b + "_vehicle" }; }
function detApply(el, id) {
  const d = detOf(id), now = Date.now(), hold = ((CONFIG.view && CONFIG.view.detHold) || 0) * 1000, on = {};
  ["person", "vehicle"].forEach(k => { if (isOn(d[k])) DETHOLD[d[k]] = now; on[k] = isOn(d[k]) || (hold > 0 && now - (DETHOLD[d[k]] || 0) < hold); });
  const m = on.person && on.vehicle ? "both" : on.person ? "person" : on.vehicle ? "vehicle" : "";
  if ((el.dataset.det || "") === m) return;
  if (m) { el.dataset.det = m; el.style.setProperty("--dcl", { person: "#d8a266", vehicle: "#d9726f", both: "#a58be0" }[m] || "#d8a266"); const l = el.querySelector(".dl"); if (l) l.textContent = m === "both" ? "PERSON · VEHICLE" : m.toUpperCase(); } else delete el.dataset.det;
}
function detAll() { CAMREG.forEach(c => detApply(c.el, c.id)); document.querySelectorAll(".snap[data-cam]").forEach(e => detApply(e, e.dataset.cam)); }
setInterval(() => { try { detAll(); } catch (e) {} }, 3000);
// phone: full screen. Tapping a camera card on a phone goes straight to REAL full screen (status + navigation bars hidden), no floating card first.
// The page (not the card) is made full screen: Chrome's own :fullscreen style would force the card's size and stop a CSS turn from showing.
// The expand button then turns it to landscape: lock the screen to landscape where allowed, else rotate the card with CSS (inside the real full screen).
// Where real full screen is refused or missing (iframe not allowed, desktop, old browser) the card stays the floating full-screen card, as before.
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const reducedMotion = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
function camNative(el) {   // ask for real full screen; "nfs" = full-bleed look straight away, taken off again if the browser says no
  const root = document.documentElement, rf = root.requestFullscreen || root.webkitRequestFullscreen; if (!rf) return false;
  if (fsEl()) { el.classList.add("nfs"); return true; }
  el.classList.add("nfs");
  let p; try { p = rf.call(root, { navigationUI: "hide" }); } catch (e) { p = Promise.reject(e); }
  Promise.resolve(p).catch(() => el.classList.remove("nfs"));
  return true;
}
function camNativeOff() { try { screen.orientation.unlock(); } catch (_) {} if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) {} } }
function camSwap(el, fn) {   // landscape <-> portrait like a native app: fade out over black, switch with no animation, fade back in
  if (el._sw) return;
  if (reducedMotion()) { fn(); return; }
  const h = document.documentElement; el._sw = 1; czReset(el); h.classList.add("camsw"); el.classList.add("lf");
  setTimeout(() => { fn(); requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.remove("lf"); setTimeout(() => { h.classList.remove("camsw"); el._sw = 0; }, 200); })); }, 130);
}
function camLandOff(el, now) {   // back to portrait (stays in full screen)
  const off = () => { document.documentElement.classList.remove("camls"); el.classList.remove("ls"); };
  if (el.classList.contains("lk")) { el.classList.remove("lk"); try { screen.orientation.unlock(); } catch (_) {} }
  if (now || !el.classList.contains("ls")) { off(); return; }
  camSwap(el, off);
}
function camLand(el) {
  if (el._sw) return;
  if (el.classList.contains("lk") || el.classList.contains("ls")) { camLandOff(el); return; }
  const css = () => { if (innerHeight > innerWidth && !el.classList.contains("ls")) camSwap(el, () => { el.classList.add("ls"); document.documentElement.classList.add("camls"); }); };   // still portrait after the lock attempt
  const go = () => {
    const o = screen.orientation;
    if (o && o.lock && fsEl()) { try { o.lock("landscape").then(() => el.classList.add("lk"), () => {}); } catch (_) {} setTimeout(css, 350); }   // the Companion webview may never answer, so do not wait for it: still portrait after 350 ms means turn the card with CSS instead
    else css();
  };
  if (fsEl()) go(); else if (camNative(el)) setTimeout(go, 500); else go();
}
// The #view page (opened from a notification, or a camera link): on a phone it fills the screen like a Security camera does.
// Real full screen needs a touch in some browsers, so when the first request is refused the first tap on the page asks again.
const VWF = { on: 0, arm: 0 };
function vwFull() {
  if (!isMobile()) return;
  document.body.classList.add("vwm");
  const root = document.documentElement, rf = root.requestFullscreen || root.webkitRequestFullscreen; if (!rf || fsEl()) return;
  const ask = retry => { let p; try { p = rf.call(root, { navigationUI: "hide" }); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(() => { VWF.on = 1; }, () => { if (retry && !VWF.arm) { VWF.arm = 1; $("#vw").addEventListener("pointerdown", () => { VWF.arm = 0; if (onView() && !fsEl()) ask(false); }, { once: true }); } }); };
  ask(true);
}
function vwFullOff() { document.body.classList.remove("vwm"); if (VWF.on) { VWF.on = 0; if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) {} } try { screen.orientation.unlock(); } catch (_) {} } }
const camSwapReset = el => { el._sw = 0; el.classList.remove("lf"); document.documentElement.classList.remove("camsw"); };
function camClose(el, done) {   // smooth close: leave full screen, fade + shrink out, then the card is back in the page and fades in
  if (el.classList.contains("fclose")) return;
  if (reducedMotion() || !el.classList.contains("fs")) { camNativeOff(); czReset(el); camSwapReset(el); camLandOff(el, true); el.classList.remove("nfs"); done(); return; }
  el.classList.add("fclose");   // the real full screen is left after the fade: leaving first blanked the whole screen for a moment
  setTimeout(() => {
    el.classList.remove("fclose", "nfs", "lk"); czReset(el); camSwapReset(el); camLandOff(el, true); done(); camNativeOff();
    el.classList.add("fopen"); setTimeout(() => el.classList.remove("fopen"), 340);
  }, 240);
}
addEventListener("resize", () => { const el = document.querySelector(".cam.ls"); if (el && innerWidth > innerHeight) { el.classList.remove("ls"); document.documentElement.classList.remove("camls"); } });
const fsChange = () => {
  const n = fsEl(), el = document.querySelector(".cam.nfs");
  if (n) { if (el) el._nfsSeen = 1; return; }
  if (el && el._nfsSeen && !el.classList.contains("fclose")) { el._nfsSeen = 0; el.click(); }   // left full screen with the system gesture: close the card the same way
  try { screen.orientation.unlock(); } catch (_) {}
};
document.addEventListener("fullscreenchange", fsChange); document.addEventListener("webkitfullscreenchange", fsChange);
const AUD = {
  on: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3m13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4M14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6"/></svg>',
  off: '<svg viewBox="0 0 24 24"><path d="M12 4 9.9 6.1 12 8.2M3.3 2 2 3.3 6.7 8H3v6h4l5 5v-6.7l4.2 4.2c-.7.5-1.4.9-2.2 1.1v2.1a9 9 0 0 0 3.5-1.7l2 2 1.3-1.3L3.3 2M19 12a7 7 0 0 0-2-4.9l1.4-1.4A9 9 0 0 1 21 12c0 1.4-.3 2.7-.9 3.9l-1.5-1.5c.3-.7.4-1.5.4-2.4m-3 0a4.5 4.5 0 0 0-1.9-3.7V10l1.9 1.9V12"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3m5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2"/></svg>'
};
function micOff(c) { if (c.mic) { c.mic.getTracks().forEach(t => t.stop()); c.mic = null; } c.talk = false; const b = c.o && $(".mic", c.o.el); if (b) b.classList.remove("on"); }
function mkCam(c, host) {
  const el = document.createElement("div"); el.className = "cam";
  el.innerHTML = '<div class="lbl">' + esc(c.name) + '</div><span class="lv">' + mdi("circle") + ' LIVE</span><img alt=""><video muted autoplay playsinline></video><button class="fsb" aria-label="Landscape"><svg viewBox="0 0 24 24"><path d="M5 5h5v2H7v3H5V5m9 0h5v5h-2V7h-3V5M5 14h2v3h3v2H5v-5m12 0h2v5h-5v-2h3v-3"/></svg></button><button class="cx" aria-label="Close">' + mdi("close") + '</button><button class="px">' + mdi("play") + ' PLAYBACK</button><span class="dl"></span><div class="aud"><button class="snd" aria-label="Sound">' + AUD.off + '</button><button class="mic" aria-label="Talk">' + AUD.mic + '</button></div><div class="cpanel"></div><div class="pbk"></div><div class="gal" role="status" aria-live="polite"></div>';
  CAMREG.push({ el: el, id: c.id });
  const px = $(".px", el); if (CONFIG.playback[c.id]) px.onclick = e => { e.stopPropagation(); openPb(c); }; else px.remove();
  const o = c.o = { el: el, img: $("img", el), vid: $("video", el) }; if (camIO) camIO.observe(el);
  { const m = camMem.get(c.id); if (m) o.img.src = m; }   // last picture this device saw, shown instantly while the stream connects
  const snd = $(".snd", el), mic = $(".mic", el);
  snd.onclick = e => { e.stopPropagation(); c.snd = !c.snd; o.vid.muted = !c.snd; snd.classList.toggle("on", c.snd); snd.innerHTML = c.snd ? AUD.on : AUD.off; if (c.snd) o.vid.play().catch(() => {}); };
  mic.onclick = async e => {
    e.stopPropagation();
    if (c.talk) { if (c.mic) c.mic.getAudioTracks().forEach(t => { t.enabled = false; }); c.talk = false; mic.classList.remove("on"); return; }
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { mic.dataset.e = "Mic unavailable (needs HTTPS)"; mic.classList.add("err"); setTimeout(() => mic.classList.remove("err"), 4500); return; }
    try {
      const fresh = !c.mic; if (fresh) c.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      c.mic.getAudioTracks().forEach(t => { t.enabled = true; }); c.talk = true; mic.classList.add("on");
      if (fresh) { c.snd = true; o.vid.muted = false; snd.classList.add("on"); snd.innerHTML = AUD.on; liveCam(c); }   // reconnect once with a send channel
    } catch (x) { mic.dataset.e = "Mic blocked: " + (x && x.name || "error"); mic.classList.add("err"); setTimeout(() => mic.classList.remove("err"), 4500); }
  };
  o.vid.onplaying = () => { c.live = true; el.classList.add("live"); o.vid.classList.add("on"); camLiveSync(); setTimeout(() => { if (c.live) camMem.put(c.id, o.vid); }, 1500); };
  { const ar = m => { const w = m.videoWidth || m.naturalWidth, h = m.videoHeight || m.naturalHeight; if (w > 0 && h > 0) el.style.setProperty("--ar", w + " / " + h); };   // the two-feed landscape view sizes each picture from this
    o.img.addEventListener("load", () => { if (!c.live) ar(o.img); }); o.vid.addEventListener("loadedmetadata", () => ar(o.vid)); o.vid.addEventListener("resize", () => ar(o.vid)); }
  const cp = $(".cpanel", el); cp.onclick = tapH; cp.onchange = chgH;
  if (host.id === "vw") {   // the camera view's top controls share one wrapper, so the layout can put them in one row (tablets) or two (phones)
    const vh = document.createElement("div"); vh.className = "vh"; ["lbl", "dl", "lv", "aud", "px", "cx", "fsb"].forEach(k => { const n = el.querySelector("." + k); if (n) vh.appendChild(n); }); el.appendChild(vh); el.dataset.k = c.k;
  }
  if (host.id === "vw") { el.classList.add("vf"); setTimeout(() => pbPre(c), 600); const ctl = camCtl(c.id); if (ctl) { cp.innerHTML = '<div class="tg3">' + ctl.map(tileHtml).join("") + '</div>'; cp.dataset.b = 1; } el.onclick = e => { if (e.target.closest(".fsb")) camLand(el); else if (e.target.closest(".cx")) vwClose(); }; return host.appendChild(el); }   // phones: the card has the same X as a Security camera (the tablet keeps the round X above the pictures)
  el.onclick = e => {
    if (e.target.closest(".cpanel, .pbk, .px")) return;
    if (e.target.closest(".fsb")) { camLand(el); return; }
    if (el.classList.contains("fs")) {   // close
      closePb(c, false); c.snd = false; micOff(c); snd.classList.remove("on"); snd.innerHTML = AUD.off; o.vid.muted = true;
      camClose(el, () => { el.classList.remove("fs"); if (el._ph) { el._ph.remove(); el._ph = null; } if (isMobile() && CONFIG.mobileLive === false) { clearTimeout(c.rt); stopCam(c); } else liveCam(c); });
      return;
    }
    if (!el._ph && el.parentNode && el.parentNode.id !== "vw") { const cs = getComputedStyle(el), ph = document.createElement("div"); ph.className = "camph"; ph.style.height = el.offsetHeight + "px"; ph.style.gridColumn = cs.gridColumnStart + " / " + cs.gridColumnEnd; ph.style.margin = cs.margin; el.parentNode.insertBefore(ph, el); el._ph = ph; }   // the card leaves the page layout while full screen: this holds its place so the page behind does not jump during the fade
    el.classList.add("fs"); pbPre(c);
    if (isMobile()) camNative(el);   // phones: straight to real full screen
    const ctl = camCtl(c.id);
    if (ctl && !cp.dataset.b) { cp.innerHTML = '<div class="tg3">' + ctl.map(tileHtml).join("") + '</div>'; cp.dataset.b = 1; }
    updTiles(); liveCam(c); };
  host.appendChild(el);
}
CONFIG.cameras.forEach(c => mkCam(c, $("#cams")));
CONFIG.security.forEach(c => mkCam(c, $("#scams")));
// full-screen view (driveway + garage)
const VW = { mode: "", hold: { driveway: 0, garage: 0 }, seen: false, back: "#home" };
["driveway", "garage"].forEach(k => { const c = Object.assign({ k: k }, CONFIG.view[k]); VWC.push(c); mkCam(c, $("#vw")); });
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");   // "Right walkway" -> right-walkway
CONFIG.security.forEach(s => { const c = { k: "cam:" + slug(s.name), id: s.id, name: s.name }; VWC.push(c); mkCam(c, $("#vw")); });
function vwClose() { location.hash = VW.back && VW.back.indexOf("#view") !== 0 ? VW.back : "#home"; }
(() => { const b = document.createElement("button"); b.className = "vwx"; b.setAttribute("aria-label", "Close"); b.innerHTML = mdi("close"); b.onclick = vwClose; $("#vw").appendChild(b); })();
const viewTrig = k => [].concat(CONFIG.view[k].trig || []).some(isOn);
// seconds a feed stays on screen after its trigger turns off: view.garage.hold / view.driveway.hold, else view.hold, else 20
const holdOf = k => { const V = CONFIG.view, x = V[k] && V[k].hold != null ? V[k].hold : V.hold; return (x != null ? x : 20) * 1000; };
function viewMode() {
  const m = location.hash.split("/")[1] || "auto"; if (m === "driveway" || m === "garage" || m === "both") return m;
  if (/^#camera/.test(location.hash) || (/^#view/.test(location.hash) && m !== "auto")) { const k = "cam:" + slug(m), c = VWC.filter(x => x.k === k)[0] || VWC.filter(x => x.id.indexOf("camera." + m.replace(/-/g, "_")) === 0)[0]; return c ? c.k : "garage"; }
  const now = Date.now(); ["driveway", "garage"].forEach(k => { if (viewTrig(k)) { VW.hold[k] = now; VW.seen = true; } });
  const d = now - VW.hold.driveway < holdOf("driveway"), g = now - VW.hold.garage < holdOf("garage");
  // look again exactly when the next hold runs out (the 5 s interval below is only a backstop), so the switch happens right on time
  clearTimeout(VW.tm); const left = ["driveway", "garage"].map(k => holdOf(k) - (now - VW.hold[k])).filter(x => x > 0);
  if (left.length) VW.tm = setTimeout(applyView, Math.min.apply(null, left) + 40);
  return d && g ? "both" : g ? "garage" : "driveway";
}
function applyView() {
  if (!onView()) return; const m = viewMode(); if (m === VW.mode) return; VW.mode = m;
  const vw = $("#vw"); vw.className = "on " + (m === "both" ? "two" : "one");
  VWC.forEach(c => { const vis = m === "both" ? (c.k === "driveway" || c.k === "garage") : m === c.k; c.o.el.style.display = vis ? "" : "none"; if (vis) { liveCam(c); const s = states[c.id], pc = s && s.attributes.entity_picture; if (pc) c.o.img.src = CONFIG.url + pc + (pc.indexOf("?") > -1 ? "&" : "?") + "t=" + Date.now(); } else { clearTimeout(c.rt); stopCam(c); } });
  updTiles();
}
setInterval(() => { const V = CONFIG.view; if (onView() && V.returnAfter && VW.seen && /^#view(\/auto)?$/.test(location.hash) && Date.now() - Math.max(VW.hold.driveway, VW.hold.garage) > V.returnAfter * 1000) location.hash = "#home"; applyView(); }, 5000);
$$("#mini .rnd").forEach(b => b.onclick = () => bump(MAIN, +b.dataset.d));
$("#mm").onclick = e => {
  const m = e.target.dataset.m, hp = states[MAIN]; if (!m) return;
  if (m === "pwr") call("climate", hp && hp.state === "off" ? "turn_on" : "turn_off", MAIN);
  else call("climate", "set_hvac_mode", MAIN, { hvac_mode: m });
};
