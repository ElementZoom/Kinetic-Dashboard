// ---------- camera playback (Reolink recordings through HA's media browser) ----------
function openPb(c) {
  const el = c.o.el, k = $(".pbk", el);
  clearTimeout(c.rt); stopCam(c);
  if (!k.dataset.b) {
    k.dataset.b = 1;
    k.innerHTML = '<div class="pbh"><button class="eb" data-pb="up">' + mdi("chevron-left") + ' BACK</button><b class="pbt">Recordings</b><button class="eb" data-pb="live">' + mdi("circle") + ' LIVE</button></div><div class="pbm"><div class="pbw"><div class="pbf"></div><div class="pbl"></div></div><div class="pbv"><video controls playsinline></video><div class="pbe"></div></div></div>';
    k.onclick = e => {
      e.stopPropagation();   // the list redraws on tap; don't let the click fall through and close the camera
      const b = e.target.closest("[data-pb]"), it = e.target.closest(".pbi"), pb = el.pb, f = e.target.closest("[data-pf]"), vw = e.target.closest("[data-pview]");
      if (f) { pb.filter = f.dataset.pf; pbList(c); }
      else if (vw) { pb.view = pb.view === "list" ? "grid" : "list"; try { localStorage.dashPbView = pb.view; } catch (x) {} pbList(c); }
      else if (b && b.dataset.pb === "up" && pb.st.length > 1) { pb.st.pop(); pb.tx = -1; const p = pb.st[pb.st.length - 1]; pbBrowse(c, p.id, p.t, false); }
      else if (b) closePb(c, true);
      else if (it) { const x = pb.items[+it.dataset.i]; if (x.can_expand) { pb.tx = 1; pbBrowse(c, x.media_content_id, x.title, true); } else if (x.can_play) pbPlay(c, x, it); }
    };
    $("video", k).onloadeddata = () => { const q = el.pb; if (q) { q.hold = 0; if (q.nx) q.nx(); } };   // clip is up: preview pictures carry on
    $("video", k).onerror = () => { if ($(".pbv", k).classList.contains("has")) $(".pbe", k).textContent = "This browser can't play this recording"; };
  }
  let view = "grid"; try { view = localStorage.dashPbView === "list" ? "list" : "grid"; } catch (x) {}
  if (!DT.stored) { DT.stored = 1; THDB.load(); }
  el.pb = { st: [], items: [], filter: "all", view: view, thumbs: DT.th, bad: {} }; el.classList.add("pb");
  $(".pbv", k).classList.remove("has"); $(".pbe", k).textContent = "";
  pbBrowse(c, CONFIG.playback[c.id], "Recordings", true, true);
}
function closePb(c, resume) {
  const el = c.o.el, v = $(".pbk video", el);
  if (v) { v.pause(); v.removeAttribute("src"); try { v.load(); } catch (x) {} }
  if (el.pb) el.pb.hold = 0;
  el.classList.remove("pb"); if (resume && (el.classList.contains("fs") || el.classList.contains("vf"))) liveCam(c);
}
// browsing the recordings is slow on the camera side (every folder is read from the camera / NVR), so folders are remembered for a minute and the camera's newest day is fetched in the background as soon as the camera goes full screen
const PBC = {};
// HA saves a picture when a detection starts (the same folder the Detections page reads): playback previews use those instead of decoding each video
function pbSnapLoad(cam) {
  const k = "s|" + cam, h = DT.cache[k]; if (!snapRoot() || (h && h.l && Date.now() - h.t < 120000)) return Promise.resolve();
  if (h && h.p) return h.p;
  const pr = dtBrowse(snapRoot() + "/" + cam.replace(/^camera\./, "")).catch(() => null).then(r => { DT.cache[k] = { t: Date.now(), l: r ? (r.children || []).map(x => ({ ts: snapTs(x.title || x.media_content_id), id: x.media_content_id })).filter(x => x.ts).sort((a, b) => a.ts - b.ts) : [] }; });
  DT.cache[k] = Object.assign({}, h, { p: pr }); return pr;
}
function pbSnap(c, x) {
  const pb = c.o.el.pb, L = DT.cache["s|" + c.id], p = pbParse(x.title), d = pb.day; if (!L || !L.l || !p || !d || pb.bad[x.media_content_id]) return "";
  const tm = p.time.split(":").map(Number), ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), tm[0], tm[1], tm[2] || 0).getTime();
  for (let i = 0; i < L.l.length; i++) if (L.l[i].ts >= ts - 30000 && L.l[i].ts <= ts + p.secs * 1000 + 30000) return L.l[i].id;
  return "";
}
function pbGet(id, cb, fresh) {
  const h = PBC[id];
  if (h && h.r && !fresh && Date.now() - h.t < 90000) return cb(h.r);
  if (h && h.w) return h.w.push(cb);
  const w = PBC[id] = { w: [cb], t: 0, r: h && h.r }; let done = false;
  const fin = r => { if (done) return; done = true; clearTimeout(tm); if (r) { w.r = r; w.t = Date.now(); } const q = w.w; w.w = null; q.forEach(f => f(r || null)); };
  const tm = setTimeout(() => fin(null), 25000);
  send({ type: "media_source/browse_media", media_content_id: id }, fin);
}
function pbPre(c) {
  const id = CONFIG.playback && CONFIG.playback[c.id]; if (!id || !ruSec("playback")) return;
  if (!DT.stored) { DT.stored = 1; THDB.load(); }   // saved preview pictures, so they show at once
  pbSnapLoad(c.id);
  pbGet(id, r => { const d = r && (r.children || []).slice().reverse()[0]; if (d && d.can_expand) pbGet(d.media_content_id, () => {}); });
}
const pbT = t => String(t == null ? "" : t).replace(/\b(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/g, (m, y, mo, d) => ("0" + d).slice(-2) + "/" + ("0" + mo).slice(-2) + "/" + y);   // dd/mm/yyyy
// "20:03:41 0:00:28 Motion Vehicle Crossline" -> time, length, what it saw
function pbParse(t) {
  const m = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d+:\d{2}:\d{2}|\d+:\d{2})\s+(.*)$/.exec(String(t || "").trim()); if (!m) return null;
  const w = m[3].split(/\s+/).filter(Boolean), has = k => w.some(x => x.toLowerCase() === k), tags = [];
  if (has("person")) tags.push("Person"); if (has("vehicle")) tags.push("Vehicle"); if (has("animal") || has("pet") || has("dog_cat")) tags.push("Animal"); if (has("face")) tags.push("Face");
  if (!tags.length) tags.push("Motion");
  const len = m[2].split(":").map(Number), secs = len.length === 3 ? len[0] * 3600 + len[1] * 60 + len[2] : len[0] * 60 + len[1];
  return { time: m[1], secs: secs, len: secs >= 3600 ? Math.floor(secs / 3600) + "h " + Math.floor(secs % 3600 / 60) + "m" : secs >= 60 ? Math.floor(secs / 60) + "m " + ("0" + secs % 60).slice(-2) + "s" : secs + "s", tags: tags, line: w.indexOf("Crossline") > -1 };
}
function pbList(c) {
  const el = c.o.el, pb = el.pb, l = $(".pbl", el), f = $(".pbf", el), pm = t => '<div class="pbn">' + t + '</div>';
  const playable = pb.items.some(x => !x.can_expand), P = pb.items.map(x => pbParse(x.title));
  const kinds = ["Person", "Vehicle", "Animal"].filter(k => P.some(p => p && p.tags.indexOf(k) > -1));
  if (pb.filter !== "all" && kinds.indexOf(pb.filter) < 0) pb.filter = "all";
  f.style.display = playable ? "" : "none";
  f.innerHTML = playable ? '<div class="pbc">' + ["all"].concat(kinds).map(k => '<button class="chip' + (pb.filter === k ? " on" : "") + '" data-pf="' + k + '">' + (k === "all" ? "ALL" : k.toUpperCase()) + '</button>').join("") + '</div><button class="eb pbvw" data-pview="1" aria-label="Change layout">' + mdi(pb.view === "grid" ? "format-list-bulleted" : "view-grid") + '</button>' : "";
  l.className = "pbl" + (playable && pb.view === "grid" ? " pbg" : "");
  const rows = pb.items.map((x, i) => {
    const p = P[i]; if (pb.filter !== "all" && !(p && p.tags.indexOf(pb.filter) > -1)) return "";
    if (x.can_expand) return '<div class="pbi" data-i="' + i + '"><span>' + esc(pbDay(x.title)) + '</span><em>' + mdi("chevron-right") + '</em></div>';
    const tg = p ? p.tags.map(t => '<i class="pbt2 ' + t.toLowerCase() + '">' + t + '</i>').join("") : "", th = pb.thumbs[x.media_content_id] || (DT.snapUrl[x.media_content_id] && Date.now() - DT.snapUrl[x.media_content_id].t < 3000000 ? DT.snapUrl[x.media_content_id].u : "") || (x.thumbnail ? (x.thumbnail.indexOf("/") === 0 ? CONFIG.url : "") + x.thumbnail : "");
    const img = '<div class="pbth" data-th="' + i + '">' + (th ? '<img alt="" src="' + esc(th) + '">' : "") + '<b>' + mdi("play") + '</b>' + (p ? '<u>' + esc(p.len) + '</u>' : "") + '</div>';
    return '<div class="pbi pbc2" data-i="' + i + '">' + img + '<div class="pbx"><strong>' + esc(p ? pbClock(p.time) : pbT(x.title)) + '</strong><div>' + tg + '</div></div></div>';
  }).join("");
  l.innerHTML = rows || pm(pb.items.length ? "Nothing matches this filter" : "No recordings");
  txGo(l, pb.tx || 0, true); pb.tx = 0;   // same slide / fade the rest of the dashboard uses
  pbThumbs(c);
}
const pbClock = t => { const p = t.split(":").map(Number), h = p[0] % 12 || 12; return h + ":" + ("0" + p[1]).slice(-2) + (p.length > 2 ? ":" + ("0" + p[2]).slice(-2) : "") + " " + (p[0] < 12 ? "am" : "pm"); };
const pbDay = t => { const m = /(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/.exec(String(t)); if (!m) return pbT(t); const d = new Date(+m[1], +m[2] - 1, +m[3]), n = new Date(), a = new Date(n.getFullYear(), n.getMonth(), n.getDate()), df = Math.round((a - d) / 864e5); return (df === 0 ? "Today · " : df === 1 ? "Yesterday · " : "") + d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" }); };
// preview pictures: use HA's thumbnail when it sends one, otherwise grab one frame from each clip as it scrolls into view (one at a time, remembered until the page is reloaded)
function pbThumbs(c) {
  const el = c.o.el, pb = el.pb, l = $(".pbl", el); if (pb.io) pb.io.disconnect();
  const need = $$(".pbth", l).filter(n => !n.querySelector("img")); if (!need.length || !("IntersectionObserver" in window)) return;
  pb.q = []; pb.busy = 0; pb.sw = 0;
  if (snapRoot() && !(DT.cache["s|" + c.id] && DT.cache["s|" + c.id].l && Date.now() - DT.cache["s|" + c.id].t < 120000)) { pb.sw = 1; pbSnapLoad(c.id).then(() => { pb.sw = 0; if (pb.nx) pb.nx(); }); }
  const next = () => { while (!pb.hold && !pb.sw && pb.busy < (DT.cache["s|" + c.id] && DT.cache["s|" + c.id].l && DT.cache["s|" + c.id].l.length ? thPar() : Math.min(2, thPar())) && pb.q.length && el.classList.contains("pb")) one(pb.q.shift()); };
  pb.nx = next;
  const one = n => {
    const i = +n.dataset.th, x = pb.items[i];
    if (!x || !n.isConnected || pb.thumbs[x.media_content_id] != null) return;
    const sid = pbSnap(c, x);
    if (sid) {   // HA's saved picture: nothing to decode
      const put = u => { if (n.isConnected && !n.querySelector("img")) { const im = document.createElement("img"); im.alt = ""; im.src = u; n.insertBefore(im, n.firstChild); } }, su = DT.snapUrl[x.media_content_id];
      if (su && Date.now() - su.t < 3000000) { put(su.u); return; }
      pb.busy++; send({ type: "media_source/resolve_media", media_content_id: sid, expires: 3600 }, r => { pb.busy--; if (r && r.url) { const u = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url; DT.snapOf[x.media_content_id] = sid; DT.snapUrl[x.media_content_id] = { u: u, t: Date.now() }; put(u); } else { pb.bad[x.media_content_id] = 1; pb.q.unshift(n); } next(); });
      return;
    }
    pb.busy++; let done = false; const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.crossOrigin = "anonymous";
    const fin = ok => { if (done) return; done = true; clearTimeout(tm); v.removeAttribute("src"); try { v.load(); } catch (e) {} pb.busy--; if (!ok) pb.thumbs[x.media_content_id] = ""; next(); };
    const tm = setTimeout(() => fin(false), 12000);
    send({ type: "media_source/resolve_media", media_content_id: x.media_content_id, expires: 3600 }, r => {
      if (!r || !r.url) return fin(false);
      v.onloadeddata = () => { try { v.currentTime = Math.min(.5, (v.duration || 1) / 3); } catch (e) { fin(false); } };
      v.onseeked = () => { try { const cv = document.createElement("canvas"), w = 320, h = Math.round(w * (v.videoHeight || 9) / (v.videoWidth || 16)); cv.width = w; cv.height = h; const cx0 = cv.getContext("2d"); cx0.drawImage(v, 0, 0, w, h); if (thBlack(cx0, w, h)) return fin(false); const u = cv.toDataURL("image/jpeg", .6); pb.thumbs[x.media_content_id] = u; THDB.put(x.media_content_id, u); if (n.isConnected) { const im = document.createElement("img"); im.alt = ""; im.src = u; n.insertBefore(im, n.firstChild); } fin(true); } catch (e) { fin(false); } };
      v.onerror = () => fin(false); v.src = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url;
    });
  };
  pb.io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) { pb.io.unobserve(en.target); pb.q.push(en.target); } }); next(); }, { root: l, rootMargin: "120px" });
  need.forEach(n => pb.io.observe(n));
}
function pbBrowse(c, id, ttl, push, auto) {
  const el = c.o.el, pb = el.pb, l = $(".pbl", el), pm = t => '<div class="pbn">' + t + '</div>';
  pb.hold = 0; if (pb.io) pb.io.disconnect(); $(".pbf", el).style.display = "none"; l.className = "pbl"; l.innerHTML = pm("Loading…");
  pbGet(id, r => {
    if (!r) { l.innerHTML = pm("Could not load recordings"); return; }
    if (!el.classList.contains("pb")) return;
    if (push) pb.st.push({ id: id, t: r.title || ttl });
    pb.items = (r.children || []).slice().reverse();   // newest first
    pb.day = dtDay(r.title || ttl); pb.filter = "all"; $(".pbt", el).textContent = pbT(r.title || ttl);
    if (auto && pb.items.length && pb.items[0].can_expand) { const x = pb.items[0]; pbBrowse(c, x.media_content_id, x.title, true); return; }   // opening: go straight to the newest day
    pbList(c);
  });
}
function pbPlay(c, x, it) {
  const el = c.o.el, v = $(".pbk video", el), e = $(".pbe", el), pv = $(".pbv", el); pv.classList.add("has"); e.textContent = "Loading…"; el.pb.hold = 1;   // preview pictures wait, so the clip gets the whole connection
  $$(".pbi", el).forEach(n => n.classList.toggle("on", n === it));
  send({ type: "media_source/resolve_media", media_content_id: x.media_content_id, expires: 3600 }, r => {
    if (!r || !r.url) { e.textContent = "Could not open this recording"; return; }
    e.textContent = ""; v.removeAttribute("crossorigin"); v.src = (r.url.indexOf("http") === 0 ? "" : CONFIG.url) + r.url; v.play().catch(() => {});
  });
}

