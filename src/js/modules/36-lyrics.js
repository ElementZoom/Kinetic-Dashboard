// ---------- Lyrics (Media page) · LRCLIB, fetched by this browser; synced lines follow the song position ----------
const LY = { off: 0, key: "", ctl: "", sel: "", tabs: [], lines: null, plain: "", st: "", dbg: "", drawn: "", open: true, cache: {} };
try { LY.open = localStorage.getItem("dashLyr") !== "0"; LY.off = +localStorage.getItem("dashLyOff") || 0; } catch (_) {}
function lyrTracks() {   // every group that has a song (playing or paused), playing ones first
  const mk = (ctl, name) => { const s = states[ctl], a = s ? s.attributes : {}; return s && /^(playing|paused)$/.test(s.state) && a.media_title ? { ctl: ctl, play: s.state === "playing", name: name, title: a.media_title, artist: a.media_artist || "", album: a.media_album_name || "", dur: Math.round(a.media_duration || 0) } : null; };
  const L = mpGroups().map(g => mk(g.ctl, g.mem.map(fname).join(" + "))).filter(Boolean);
  if (!L.length) (CONFIG.lyricsFrom || []).forEach(id => {   // Spotify is only used when no speaker has a song (same account, so a speaker's track wins)   // e.g. Spotify playing on a computer or phone (not through a Sonos speaker)
    const t = mk(id, "Spotify" + ((states[id] || { attributes: {} }).attributes.source ? " · " + states[id].attributes.source : ""));
    if (t) L.push(t);
  });
  return L.sort((x, y) => (y.play ? 1 : 0) - (x.play ? 1 : 0));
}
function parseLrc(t) {
  const out = [];
  String(t || "").split(/\r?\n/).forEach(l => {
    const re = /\[(\d+):(\d+(?:\.\d+)?)\]/g, ts = []; let m;
    while ((m = re.exec(l))) ts.push(+m[1] * 60 + +m[2]);
    const tx = l.replace(/\[[^\]]*\]/g, "").trim();
    ts.forEach(x => out.push({ t: x, s: tx }));
  });
  return out.sort((a, b) => a.t - b.t);
}
async function lyrFetch(tr, dbg) {
  const q = o => Object.keys(o).filter(k => o[k]).map(k => k + "=" + encodeURIComponent(o[k])).join("&"), B = "https://lrclib.net/api/";
  const clean = tr.title.replace(/\s*[\(\[][^\)\]]*(remaster|version|live|mono|stereo|edit|deluxe|feat)[^\)\]]*[\)\]]/ig, "").replace(/\s+-\s+(remaster|\d{4}).*$/i, "").trim();
  const best = l => Array.isArray(l) ? (l.filter(x => x.syncedLyrics)[0] || l.filter(x => x.plainLyrics)[0] || null) : null;
  let r = await fetch(B + "get?" + q({ track_name: tr.title, artist_name: tr.artist, album_name: tr.album, duration: tr.dur }));
  dbg.push("get " + r.status); if (r.ok) return r.json();
  for (const u of ["search?" + q({ track_name: clean, artist_name: tr.artist }), "search?" + q({ q: (tr.artist + " " + clean).trim() })]) {
    r = await fetch(B + u); dbg.push(u.split("?")[0] + " " + r.status);
    if (r.ok) { const d = best(await r.json()); dbg[dbg.length - 1] += " " + (d ? "found" : "0 results"); if (d) return d; }
  }
  return null;
}
function lyrUpdate() {
  const L = lyrTracks(), el = $("#lyr"), ml = $(".mlay");
  if (!L.length) { el.style.display = "none"; ml.classList.remove("hasly"); LY.key = ""; return; }
  const tr = L.filter(x => x.ctl === LY.sel)[0] || L[0];   // your pick sticks while that group is still playing/paused
  LY.sel = tr.ctl; LY.tabs = L.length > 1 ? L.map(x => [x.ctl, x.name]) : [];
  el.style.display = ""; ml.classList.add("hasly"); LY.ctl = tr.ctl;
  const key = [tr.artist, tr.title, tr.dur].join("|");
  if (key !== LY.key) { LY.key = key; LY.lines = null; LY.plain = ""; LY.st = ""; LY.cur = -1; }
  const c = LY.cache[key];
  if (c && !(c.st === "err" && Date.now() - c.t > 60000)) Object.assign(LY, c);
  else if (LY.open && LY.busy !== key) { LY.busy = key; LY.st = "load"; lyrLoad(tr, key); }
  lyrDraw(tr);
}
function lyrLoad(tr, key) {
  const dbg = [];
  lyrFetch(tr, dbg).then(d => {
    const r = !d || d.instrumental && !d.syncedLyrics && !d.plainLyrics ? { st: d && d.instrumental ? "inst" : "none", lines: null, plain: "", dbg: dbg.join(" · ") }
      : d.syncedLyrics ? { st: "sync", lines: parseLrc(d.syncedLyrics), plain: "" } : { st: "plain", lines: null, plain: d.plainLyrics || "" };
    LY.busy = ""; LY.cache[key] = r; if (LY.key === key) { Object.assign(LY, r); lyrDraw(); }
  }).catch(e => { LY.busy = ""; LY.cache[key] = { st: "err", lines: null, plain: "", t: Date.now(), dbg: dbg.join(" · ") + " · " + String(e && e.message || e) }; if (LY.key === key) { Object.assign(LY, LY.cache[key]); lyrDraw(); } });
}
function lyrDraw(tr) {
  const el = $("#lyr"), k = [LY.key, LY.st, LY.open, LY.sel, LY.tabs.join(), LY.off].join("|"); if (k === LY.drawn) return; LY.drawn = k;
  const msg = { load: "Looking for lyrics…", none: "No lyrics found for this song.", inst: "Instrumental.", err: "Couldn’t reach the lyrics service (the device needs internet).", "": "" }[LY.st] || "";
  const body = !LY.open ? "" : LY.st === "sync" ? '<div class="lyb">' + LY.lines.map((l, i) => '<div class="ly" data-t="' + l.t + '" data-i="' + i + '">' + (esc(l.s) || "♪") + '</div>').join("") + '</div>'
    : LY.st === "plain" ? '<div class="lyb plain">' + esc(LY.plain) + '</div>' : '<div class="sm" style="margin-top:12px">' + msg + '</div><div class="sm lyd">' + esc((LY.key || "").replace(/\|/g, " · ") + (LY.dbg ? "  →  " + LY.dbg : "")) + '</div><button class="eb" style="margin-top:10px" data-ly="retry">TRY AGAIN</button>';
  el.innerHTML = '<div class="lbl lyh" data-ly="tog">' + mdi("music-note") + ' Lyrics' + (LY.st === "sync" ? ' · synced' : "") + (LY.st === "sync" && LY.open ? '<span class="lyo" title="Lyrics running late? press +. Too early? press −"><button class="chip" data-ly="off-">−</button><b>' + (LY.off > 0 ? "+" : "") + LY.off.toFixed(1) + 's</b><button class="chip" data-ly="off+">+</button></span>' : "") + '<span class="npch">' + mdi(LY.open ? "chevron-up" : "chevron-down") + '</span></div>' +
    (LY.open && LY.tabs.length ? '<div class="chips tabs lyt">' + LY.tabs.map(t => '<button class="chip' + (t[0] === LY.sel ? " on" : "") + '" data-ly="sel" data-c="' + t[0] + '">' + mdi("speaker") + esc(t[1]) + '</button>').join("") + '</div>' : "") + body;
  LY.cur = -1; lyrTick(true);
}
function lyrTick(jump) {
  if (curPg() !== "media" || !LY.open || LY.st !== "sync" || !LY.lines) return;
  const s = states[LY.ctl]; if (!s) return; const a = s.attributes;
  let p = mpPos(LY.ctl).pos;
  p += LY.off;
  let i = -1; for (let k = 0; k < LY.lines.length && LY.lines[k].t <= p + 0.25; k++) i = k;
  if (i === LY.cur) return; LY.cur = i;
  const box = $("#lyr .lyb"); if (!box) return;
  $$(".ly", box).forEach((x, k) => x.classList.toggle("on", k === i));
  const n = $$(".ly", box)[i]; if (n) box.scrollTo({ top: n.offsetTop - box.clientHeight / 2 + n.offsetHeight / 2, behavior: jump ? "auto" : "smooth" });
}
$("#lyr").onclick = e => {
  const of = e.target.closest('[data-ly="off-"],[data-ly="off+"]');
  if (of) { LY.off = Math.max(-10, Math.min(10, Math.round((LY.off + (of.dataset.ly === "off+" ? 0.5 : -0.5)) * 10) / 10)); try { localStorage.setItem("dashLyOff", LY.off); } catch (_) {} LY.drawn = ""; lyrDraw(); return; }
  const sb = e.target.closest("[data-ly=sel]"); if (sb) { LY.sel = sb.dataset.c; LY.drawn = ""; lyrUpdate(); return; }
  if (e.target.closest("[data-ly=retry]")) { delete LY.cache[LY.key]; LY.busy = ""; LY.drawn = ""; LY.st = ""; lyrUpdate(); return; }
  if (e.target.closest("[data-ly]")) { LY.open = !LY.open; try { localStorage.setItem("dashLyr", LY.open ? "1" : "0"); } catch (_) {} LY.drawn = ""; lyrUpdate(); return; }
  const l = e.target.closest(".ly"); if (l && LY.ctl) { mpSeek(LY.ctl); call("media_player", "media_seek", LY.ctl, { seek_position: +l.dataset.t }); }
};
setInterval(() => lyrTick(), 500);
$(".mlay").addEventListener("scroll", e => { const m = e.currentTarget, i = m.clientWidth ? Math.round(m.scrollLeft / (m.clientWidth + 12)) : 0; $$(".mdt i").forEach((d, k) => d.classList.toggle("on", k === i)); });
$(".mdt").onclick = e => { const d = e.target.closest("[data-pg]"); if (d) { const m = $(".mlay"); m.scrollTo({ left: +d.dataset.pg * (m.clientWidth + 12), behavior: "smooth" }); } };
// Where the song really is. HA's media_position can come back stale after a pause -> play (Sonos / Spotify Connect report an old
// position with a fresh timestamp), which made the bars and synced lyrics jump back. We keep our own running position per player and
// only accept HA's when it agrees, moves forward, the track changes, or a skip / seek just happened.
// phone sheets (Theme, Scenes): slide up like the Now Playing player, slide down on close, then the card rises back in like the Now Playing bar
const rmAfter = (el, k, ms) => { if (el) { el.classList.add(k); setTimeout(() => el.classList.remove(k), ms); } };
const shIn = (el, bk) => { if (!isMobile()) return; rmAfter(el, "sin", 420); rmAfter(bk, "sin", 360); };
const pillIn = el => { if (isMobile()) rmAfter(el, "pin", 450); };
function shShut(el, bk, fn) { if (!el || !isMobile()) return fn(); if (el.classList.contains("shut")) return; el.classList.add("shut"); if (bk) bk.classList.add("shut"); setTimeout(() => { el.classList.remove("shut"); if (bk) bk.classList.remove("shut"); fn(); }, 260); }
// a tab row that scrolls sideways always keeps the selected tab in view
const tabsSeen = new WeakMap();
let tabsQ = 0; new MutationObserver(() => { if (!tabsQ) tabsQ = requestAnimationFrame(tabsFix); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
function tabsFix() { tabsQ = 0; $$(".chips.tabs").forEach(t => { const on = t.querySelector(".chip.on"); if (!on || tabsSeen.get(t) === on || t.scrollWidth <= t.clientWidth + 1) return; tabsSeen.set(t, on); const l = on.offsetLeft - t.offsetLeft, r = l + on.offsetWidth; if (l < t.scrollLeft || r > t.scrollLeft + t.clientWidth) t.scrollLeft = Math.max(0, l - (t.clientWidth - on.offsetWidth) / 2); }); }
function scStripGo() { const t = $("#scenes .scstp"), on = t && $(".sc.on", t); if (on) t.scrollLeft = Math.max(0, on.offsetLeft - t.offsetLeft - (t.clientWidth - on.offsetWidth) / 2); }
const MPK = {};
function mpPos(id) {
  const s = states[id], now = srvNow(); if (!s) return { pos: 0, play: false, dur: 0 };
  const a = s.attributes, play = s.state === "playing", dur = +a.media_duration || 0, key = [a.media_title, a.media_artist, dur, a.media_content_id].join("|");
  const ru = a.media_position_updated_at || "", ruT = ru ? Date.parse(ru) : now, raw = Math.max(0, (+a.media_position || 0) + (play ? (now - ruT) / 1000 : 0));
  const m = MPK[id], same = m && m.key === key && !(m.seek && now - m.seek < 6000);
  let use = raw, ov = 0;
  if (same) {
    const mine = m.base + (m.play ? (now - m.t) / 1000 : 0);
    if ((m.ov && m.ov === ru) || (!m.play && play && raw < mine - 3 && !(dur && mine >= dur - 2))) { use = mine; ov = ru; }   // stale report on resume: keep counting until HA sends a fresh position
  }
  if (dur) use = Math.min(use, dur);
  MPK[id] = { key: key, play: play, base: use, t: now, ov: ov, seek: m && m.key === key ? m.seek : 0 };
  return { pos: use, play: play, dur: dur };
}
const mpData = id => { const q = mpPos(id); return 'data-pos="' + q.pos.toFixed(2) + '" data-upd="' + new Date(srvNow()).toISOString() + '" data-dur="' + q.dur + '" data-play="' + (q.play ? 1 : 0) + '"'; };
const mpSeek = id => { (MPK[id] = MPK[id] || {}).seek = srvNow(); };
function mpDo(m, id) {
  if (m === "prev" || m === "next") mpSeek(id);
  const a = (states[id] || {}).attributes || {}, ids = CONFIG.media;
  if (m === "pp") call("media_player", "media_play_pause", id);
  else if (m === "prev") call("media_player", "media_previous_track", id);
  else if (m === "next") call("media_player", "media_next_track", id);
  else if (m === "shuffle") call("media_player", "shuffle_set", id, { shuffle: !a.shuffle });
  else if (m === "repeat") call("media_player", "repeat_set", id, { repeat: !a.repeat || a.repeat === "off" ? "all" : a.repeat === "all" ? "one" : "off" });
  else if (m === "mute") call("media_player", "volume_mute", id, { is_volume_muted: !a.is_volume_muted });
  else if (m === "join") { const c = ids.filter(x => states[x] && states[x].state === "playing")[0] || ids[0]; call("media_player", "join", c, { group_members: ids.filter(x => x !== c) }); }
  else if (m === "unjoin") ids.forEach(x => call("media_player", "unjoin", x));
  else if (m === "voltog") { mpVo = !mpVo; drawMedia(); }
  else return false;
  return true;
}
$("#media").onclick = e => { const b = e.target.closest("[data-mp]"); if (b) mpDo(b.dataset.mp, b.dataset.e); };
$("#media").onchange = e => { const t = e.target; if (t.dataset.vol) call("media_player", "volume_set", t.dataset.vol, { volume_level: +t.value / 100 }); };

