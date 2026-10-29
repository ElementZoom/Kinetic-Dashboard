// ---------- recent detections card (Security page): person / vehicle clips from every camera, last few days ----------
const DT_R = [[24, 2, "24 HOURS"], [72, 4, "3 DAYS"], [168, 8, "7 DAYS"]];   // [hours back, day folders to read, label]
const DT = { days: [], cache: {}, items: [], busy: false, range: 1, types: { Person: true, Vehicle: true, Animal: false, Motion: false }, cam: "all", show: 24, t0: 0, th: {}, snapOf: {}, snapUrl: {}, q: [], run: 0, loaded: 0 };
const thPar = () => { const d = CONFIG.detections, n = d && typeof d === "object" ? +d.previewParallel : 0; return n > 0 ? Math.min(6, n) : isMobile() ? 3 : 4; };   // how many preview pictures are grabbed at once (config.js: detections: { previewParallel: 4 })
// remembers the preview pictures on this device (IndexedDB), so each clip is only ever decoded once
const THDB = (() => {
  let ready = null; const open = () => ready || (ready = new Promise(res => { try { const rq = indexedDB.open("dashThumbs", 1); rq.onupgradeneeded = () => rq.result.createObjectStore("t"); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } }));
  return {
    load: () => open().then(d => !d ? 0 : new Promise(res => { const old = []; let n = 0; const rq = d.transaction("t").objectStore("t").openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { if (Date.now() - c.value.t > 14 * 864e5) old.push(c.key); else { if (DT.th[c.key] == null) { DT.th[c.key] = c.value.u; n++; } } c.continue(); } else { if (old.length) try { const st = d.transaction("t", "readwrite").objectStore("t"); old.forEach(k => st.delete(k)); } catch (e) {} res(n); } }; rq.onerror = () => res(0); })),
    put: (k, u) => open().then(d => { if (d) try { d.transaction("t", "readwrite").objectStore("t").put({ u: u, t: Date.now() }, k); } catch (e) {} })
  };
})();
const thBlack = (cx, w, h) => { try { const d = cx.getImageData(0, 0, w, h).data; let t = 0, n = 0; for (let i = 0; i < d.length; i += 160) { t += d[i] + d[i + 1] + d[i + 2]; n += 3; } return t / n < 9; } catch (e) { return false; } };
const snapRoot = () => { const d = CONFIG.detections; return d && typeof d === "object" && d.snapshots ? String(d.snapshots).replace(/\/$/, "") : ""; };
const snapTs = t => { const m = /(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/.exec(String(t)); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0; };
const dtCams = () => Object.keys(CONFIG.playback || {});
const dtName = id => { const f = CONFIG.security.concat(CONFIG.cameras).filter(c => c.id === id)[0]; return f ? f.name : calName ? id.replace(/^camera\./, "").replace(/_/g, " ") : id; };
const dtDay = t => { const m = /(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/.exec(String(t)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
function dtPace(fn, list, n) { let i = 0, run = 0; return new Promise(res => { const go = () => { if (i >= list.length && !run) return res(); while (run < n && i < list.length) { const x = list[i++]; run++; fn(x).catch(() => {}).then(() => { run--; go(); }); } }; go(); }); }
const dtBrowse = id => new Promise((ok, no) => { let t = setTimeout(() => no(new Error("timeout")), 25000); send({ type: "media_source/browse_media", media_content_id: id }, r => { clearTimeout(t); r ? ok(r) : no(new Error("none")); }); });
async function dtLoad(force) {
  if (DT.busy) { DT.again = DT.again || !!force || 1; return; } if (!dtCams().length) return; DT.busy = true; const want = (DT_R[DT.range - 1] || DT_R[0])[1], now = Date.now();
  if (force) { DT.cache = {}; DT.days = []; DT.loaded = 0; } dtDraw();
  try {
    // 1) the day folders of every camera
    await dtPace(async id => { const k = "d|" + id; if (!DT.cache[k] || force) DT.cache[k] = await dtBrowse(CONFIG.playback[id]).then(r => (r.children || []).map(x => ({ d: dtDay(x.title || ""), id: x.media_content_id })).filter(x => x.d).sort((a, b) => b.d - a.d)).catch(() => []); }, dtCams(), 3);
    // 2) the newest `want` days of each
    const jobs = []; dtCams().forEach(id => (DT.cache["d|" + id] || []).slice(0, want).forEach(day => { const k = "c|" + day.id; if (!DT.cache[k] || (Date.now() - DT.cache[k].t > 600000 && Date.now() - day.d < 2 * 864e5)) jobs.push({ cam: id, day: day }); }));
    if (snapRoot()) await dtPace(async id => { const k = "s|" + id; if (DT.cache[k] && Date.now() - DT.cache[k].t < 60000 && !force) return; const r = await dtBrowse(snapRoot() + "/" + id.replace(/^camera\./, "")).catch(() => null); DT.cache[k] = { t: Date.now(), l: r ? (r.children || []).map(x => ({ ts: snapTs(x.title || x.media_content_id), id: x.media_content_id })).filter(x => x.ts).sort((a, b) => a.ts - b.ts) : [] }; }, dtCams(), 3);
    await dtPace(async j => { const r = await dtBrowse(j.day.id).catch(() => null); if (r) DT.cache["c|" + j.day.id] = { t: Date.now(), kids: r.children || [] }; DT.loaded++; dtDraw(true); }, jobs, 3);
  } finally { DT.busy = false; DT.t0 = Date.now(); dtDraw(); if (DT.again) { const f = DT.again === true; DT.again = 0; dtLoad(f); } }
}
function dtItems() {
  const R0 = DT_R[DT.range - 1] || DT_R[0], want = R0[1], since = Date.now() - R0[0] * 36e5, out = [];
  dtCams().forEach(id => {
    const sn = DT.cache["s|" + id] ? DT.cache["s|" + id].l : [];
    (DT.cache["d|" + id] || []).slice(0, want).forEach(day => { const c = DT.cache["c|" + day.id]; if (!c) return; c.kids.forEach(x => {
      if (x.can_expand) return; const p = pbParse(x.title); if (!p) return;
      const tm = p.time.split(":").map(Number), ts = new Date(day.d.getFullYear(), day.d.getMonth(), day.d.getDate(), tm[0], tm[1], tm[2] || 0).getTime(); if (ts < since) return;
      let snap = ""; for (let i = 0; i < sn.length; i++) { if (sn[i].ts >= ts - 30000 && sn[i].ts <= ts + p.secs * 1000 + 30000) { snap = sn[i].id; break; } }   // HA's own snapshot taken when the detection started
      if (snap) DT.snapOf[x.media_content_id] = snap;
      out.push({ cam: id, mc: x.media_content_id, p: p, ts: ts, th: x.thumbnail || "" });
    }); });
  });
  return out.sort((a, b) => b.ts - a.ts);
}
const dtWhen = ts => { const d = new Date(ts), n = new Date(), df = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5), tm = d.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase(); return (df === 0 ? "Today" : df === 1 ? "Yesterday" : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })) + " · " + tm; };
// the picture shown for a clip, the same everywhere: HA's own snapshot from when the detection began, else the frame cut from the clip, else the browse thumbnail
function dtThumbUrl(x) { const su = DT.snapUrl[x.mc]; return su && Date.now() - su.t < 3000000 ? su.u : DT.th[x.mc] || (x.th ? (x.th.indexOf("/") === 0 ? CONFIG.url : "") + x.th : ""); }
const dtWanted = () => location.hash === "#security/detections";   // the loader runs for the Detections tab
function dtDraw(soft) {
  const P = $("#dtp"); if (!P) return; if (!dtCams().length || CONFIG.detections === false) { P.style.display = "none"; return; } P.style.display = "";
  const all = dtItems(), tyOn = k => DT.types[k], vis = all.filter(x => (DT.cam === "all" || x.cam === DT.cam) && x.p.tags.some(t => tyOn(t)));
  const cnt = k => all.filter(x => x.p.tags.indexOf(k) > -1 && (DT.cam === "all" || x.cam === DT.cam)).length;
  const body = vis.slice(0, DT.show).map((x, i) => { const th = dtThumbUrl(x); return '<div class="dti" data-dt="play" data-k="' + esc(x.mc) + '" data-cam="' + esc(x.cam) + '" data-ts="' + x.ts + '" data-tg="' + esc(x.p.tags.join(",")) + '"><div class="pbth" data-dth="' + esc(x.mc) + '">' + (th ? '<img alt="" src="' + esc(th) + '">' : "") + '<b>' + mdi("play") + '</b><u>' + esc(x.p.len) + '</u></div><div class="pbx"><strong>' + esc(dtName(x.cam)) + '</strong><span>' + esc(dtWhen(x.ts)) + '</span><div>' + x.p.tags.map(t => '<i class="pbt2 ' + t.toLowerCase() + '">' + t + '</i>').join("") + '</div></div></div>'; }).join("");
  const loading = DT.busy ? '<div class="pbn">Looking through the recordings' + (DT.loaded ? " · " + DT.loaded : "") + '…</div>' : "";
  P.innerHTML = '<div class="lbl dthd">Recent detections<button class="eb" data-dt="refresh" aria-label="Refresh">' + mdi("refresh") + '</button></div>' +
    '<div class="pbc dtf">' + [["Person", "PERSON"], ["Vehicle", "VEHICLE"], ["Animal", "ANIMAL"], ["Motion", "OTHER MOTION"]].map(x => '<button class="chip' + (DT.types[x[0]] ? " on" : "") + '" data-dt="type" data-v="' + x[0] + '">' + x[1] + (all.length ? " · " + cnt(x[0]) : "") + '</button>').join("") + '</div>' +
    '<div class="pbc dtf"><button class="chip' + (DT.cam === "all" ? " on" : "") + '" data-dt="cam" data-v="all">ALL CAMERAS</button>' + dtCams().map(id => '<button class="chip' + (DT.cam === id ? " on" : "") + '" data-dt="cam" data-v="' + esc(id) + '">' + esc(dtName(id)).toUpperCase() + '</button>').join("") + '</div>' +
    '<div class="pbc dtf">' + DT_R.map((x, i) => '<button class="chip' + (DT.range === i + 1 ? " on" : "") + '" data-dt="range" data-v="' + (i + 1) + '">' + x[2] + '</button>').join("") + '</div>' +
    '<div class="dtg">' + (body || (DT.busy ? "" : '<div class="pbn">Nothing detected for these filters</div>')) + '</div>' + loading +
    (vis.length > DT.show ? '<button class="eb dtmore" data-dt="more">SHOW MORE · ' + (vis.length - DT.show) + '</button>' : "");
  dtThumbs();
}
function dtThumbs() {
  const P = $("#dtp"); if (!P || !("IntersectionObserver" in window)) return; if (DT.io) DT.io.disconnect();
  const need = $$("[data-dth]", P).filter(n => !n.querySelector("img") && (DT.snapOf[n.dataset.dth] || DT.th[n.dataset.dth] == null)); if (!need.length) return;
  DT.io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { DT.io.unobserve(en.target); DT.q.push(en.target.dataset.dth); dtNext(); } }), { rootMargin: "500px" });   // start a little before a card scrolls into view
  need.forEach(n => DT.io.observe(n));
}
function dtNext() {
  if (!dtWanted()) return;
  while (DT.run < thPar() && DT.q.length) dtOne(DT.q.shift());
}
function dtOne(mc) {
  const put = u => { const n = $$("[data-dth]", $("#dtp")).filter(x => x.dataset.dth === mc)[0]; if (n && !n.querySelector("img")) { const im = document.createElement("img"); im.alt = ""; im.src = u; n.insertBefore(im, n.firstChild); } };
  const sid = DT.snapOf[mc];
  if (sid) {   // a picture HA saved at the time: just fetch it, nothing to decode
    const su = DT.snapUrl[mc]; if (su && Date.now() - su.t < 3000000) { put(su.u); return; }
    DT.run++; send({ type: "media_source/resolve_media", media_content_id: sid, expires: 3600 }, r => { DT.run--; if (r && r.url) { const u = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url; DT.snapUrl[mc] = { u: u, t: Date.now() }; put(u); } else { delete DT.snapOf[mc]; DT.q.push(mc); } dtNext(); });
    return;
  }
  if (DT.th[mc] != null) { if (DT.th[mc]) put(DT.th[mc]); return; }
  DT.run++; let done = false, tries = 0; const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.crossOrigin = "anonymous";
  const fin = ok => { if (done) return; done = true; clearTimeout(tm); v.removeAttribute("src"); try { v.load(); } catch (e) {} DT.run--; if (!ok) DT.th[mc] = ""; dtNext(); };
  const tm = setTimeout(() => fin(false), 12000);
  send({ type: "media_source/resolve_media", media_content_id: mc, expires: 3600 }, r => {
    if (!r || !r.url) return fin(false);
    v.onloadeddata = () => { try { v.currentTime = Math.min(.5, (v.duration || 1) / 3); } catch (e) { fin(false); } };
    v.onseeked = () => { try {
      const cv = document.createElement("canvas"), w = 320, h = Math.round(w * (v.videoHeight || 9) / (v.videoWidth || 16)); cv.width = w; cv.height = h; const cx = cv.getContext("2d"); cx.drawImage(v, 0, 0, w, h);
      if (thBlack(cx, w, h)) { if (tries++ < 2 && v.duration > 1) { v.currentTime = Math.min(v.duration * (tries === 1 ? .5 : .8), v.duration - .1); return; } fin(false); return; }   // a black frame: look a bit further into the clip, never keep it
      const u = cv.toDataURL("image/jpeg", .6); DT.th[mc] = u; THDB.put(mc, u); put(u); fin(true);
    } catch (e) { fin(false); } };
    v.onerror = () => fin(false); v.src = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url;
  });
}
function secTab(t) {   // Security page: LIVE (alarm + cameras) or DETECTIONS (loaded only when opened)
  const pg = $("#security"), tb = $("#stabs"), has = dtCams().length && CONFIG.detections !== false && ruSec("detections"); pg.dataset.tab = has ? t : "live";
  tb.style.display = has ? "" : "none"; tb.innerHTML = has ? [["live", "LIVE", "#security"], ["det", "DETECTIONS", "#security/detections"]].map(x => '<button class="chip' + (pg.dataset.tab === x[0] ? " on" : "") + '" data-st="' + x[2] + '">' + x[1] + '</button>').join("") : "";
  if (pg.dataset.tab === "det") { stopCams(); dtInit(); } else drawAlarm();
  if (secPrev && secPrev !== pg.dataset.tab) { const d = pg.dataset.tab === "det" ? 1 : -1; ["#alp", "#scams", "#dtp"].forEach(q => txGo($(q), d, true)); }   // same slide as the Rooms tabs
  secPrev = pg.dataset.tab;
}
let secPrev = "";
$("#stabs").onclick = e => { const b = e.target.closest("[data-st]"); if (b && location.hash !== b.dataset.st) location.hash = b.dataset.st; };
function dtInit() { if (mkAiOn()) mkAiLoad(); if (!dtCams().length || CONFIG.detections === false || !ruSec("detections")) return; if (!DT.stored) { DT.stored = 1; THDB.load().then(n => { if (n && location.hash === "#security/detections") dtDraw(true); }); } dtDraw(); if (!DT.t0 || Date.now() - DT.t0 > 5 * 60000) dtLoad(); }
function dtClose() { const m = $("#dtm"), v = $("#dtm video"); m.classList.remove("on"); v.pause(); v.removeAttribute("src"); try { v.load(); } catch (e) {} }
$("#dtm .evx").innerHTML = mdi("close"); $("#dtm").addEventListener("click", e => { if (e.target.closest("[data-dt=close]") || e.target.id === "dtm") dtClose(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#dtm").classList.contains("on")) dtClose(); });
$("#dtp").addEventListener("click", e => {
  const b = e.target.closest("[data-dt]"); if (!b) return; const k = b.dataset.dt;
  if (k === "type") { DT.types[b.dataset.v] = !DT.types[b.dataset.v]; DT.show = 24; dtDraw(); txGo($("#dtp .dtg"), 0, true); }
  else if (k === "cam") { DT.cam = b.dataset.v; DT.show = 24; dtDraw(); txGo($("#dtp .dtg"), 0, true); }
  else if (k === "range") { DT.range = +b.dataset.v; DT.show = 24; dtDraw(); txGo($("#dtp .dtg"), 0, true); dtLoad(); }
  else if (k === "more") { DT.show += 24; dtDraw(); }
  else if (k === "refresh") dtLoad(true);
  else if (k === "play") dtPlay(b.dataset.k, b.dataset.cam, +b.dataset.ts, (b.dataset.tg || "").split(","));
});
// open the viewer on one exact clip (Detections tab): fades in, resolves the recording, plays it, adds the detection marks
function dtPlay(mc, cam, ts, tags) {
  const m = $("#dtm"), v = $("#dtm video"); m.classList.add("on"); $("#dtm .dtt").textContent = dtName(cam) + " · " + dtWhen(ts); $("#dtm .dte").textContent = "Loading…"; v.removeAttribute("src");
  send({ type: "media_source/resolve_media", media_content_id: mc, expires: 3600 }, r => { if (!m.classList.contains("on")) return; if (!r || !r.url) { $("#dtm .dte").textContent = "Could not open this recording"; return; } $("#dtm .dte").textContent = ""; v.removeAttribute("crossorigin"); v.src = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url; v.play().catch(() => {}); mkAttach($("#dtm .dtv"), tags); });
}
$("#dtm video").onerror = () => { if ($("#dtm").classList.contains("on") && $("#dtm video").getAttribute("src")) $("#dtm .dte").textContent = "This browser can't play this recording"; };

