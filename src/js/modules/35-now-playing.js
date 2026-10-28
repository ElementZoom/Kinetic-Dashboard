// ---------- Now Playing (Home card · mobile mini player · bottom sheet) ----------
const npPw = s => { const c = s.firstElementChild; return (c && c.offsetWidth) || s.clientWidth; };   // one page of the sideways pager (the scroller itself is 20 px wider, to leave room for the chips' shadow)
const fmtT = t => { t = Math.round(t); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); };
let npAnim = 0, npOpen = true, npSheet = false, npSeen = {}, npPage = 0, npHoldT = 0;   // npOpen = the Home card shows the player + lyrics pages (false = one slim row)
try { npOpen = localStorage.getItem("dashNp") !== "0"; } catch (_) {}
let npsPage = 0, npsName = ""; const SL = { lines: null, ctl: "", cur: -2 };
const slLn = (L, i) => { let h = ""; for (let k = i - 3; k <= i + 3; k++) { const t = k >= 0 && k < L.length ? (L[k].s || "♪") : (k === i ? "♪" : ""); h += '<div' + (k === i ? ' class="on"' : "") + (Math.abs(k - i) > 1 ? ' style="opacity:.4"' : "") + '>' + esc(t) + '</div>'; } return h; };
const HL = { busy: "", lines: null, ctl: "", cur: -2 };   // lyrics for the Home card: same LRCLIB fetch and cache as the Media page
const hlLn = (L, i) => { const t = k => k >= 0 && k < L.length ? (L[k].s || "♪") : ""; return '<div>' + esc(t(i - 1)) + '</div><div class="on">' + esc(i < 0 ? "♪" : t(i)) + '</div><div>' + esc(t(i + 1)) + '</div>'; };
function hlIdx(LN, CT) {
  LN = LN || HL.lines; const s = states[CT || HL.ctl]; if (!s || !LN) return -1; let p = mpPos(CT || HL.ctl).pos;
  p += LY.off; let i = -1; for (let k = 0; k < LN.length && LN[k].t <= p + 0.25; k++) i = k; return i;
}
function hlState(g) {
  const t = lyrTracks().filter(x => x.ctl === g.ctl)[0]; if (!t) return null; const key = [t.artist, t.title, t.dur].join("|"), c = LY.cache[key];
  if (c && !(c.st === "err" && Date.now() - c.t > 60000)) return { st: c.st, lines: c.lines };
  if (HL.busy !== key) {
    HL.busy = key; const dbg = [];
    lyrFetch(t, dbg).then(d => {
      LY.cache[key] = !d || d.instrumental && !d.syncedLyrics && !d.plainLyrics ? { st: d && d.instrumental ? "inst" : "none", lines: null, plain: "", dbg: dbg.join(" · ") } : d.syncedLyrics ? { st: "sync", lines: parseLrc(d.syncedLyrics), plain: "" } : { st: "plain", lines: null, plain: d.plainLyrics || "" };
      HL.busy = ""; queueNp();
    }).catch(e => { LY.cache[key] = { st: "err", lines: null, plain: "", t: Date.now(), dbg: String(e && e.message || e) }; HL.busy = ""; });
  }
  return { st: "load" };
}
function npActive() {   // groups that are playing, or paused for under 5 minutes
  const now = Date.now();
  return mpGroups().filter(g => {
    const st = (states[g.ctl] || {}).state;
    if (st === "playing") { npSeen[g.ctl] = now; return true; }
    if (st === "paused" && npSeen[g.ctl] && now - npSeen[g.ctl] < 300000) return true;
    return false;
  });
}
function npPlay(g, big) {
  const s = states[g.ctl] || { state: "idle", attributes: {} }, a = s.attributes, play = s.state === "playing", pic = a.entity_picture;
  const art = mpArt(a, s.state, pic);
  const spk = g.mem.map(fname).join(" · "), title = mpTitle(a, "playing") || "Playing";
  const bt = (m, i, on) => '<button class="rnd' + (on ? " on" : "") + '" data-mp="' + m + '" data-e="' + g.ctl + '">' + i + '</button>';
  const prog = '<div class="mpb" ' + mpData(g.ctl) + '><i></i></div>';
  if (!big) return { art: art, title: title, sub: (a.media_artist ? esc(a.media_artist) + " · " : "") + esc(spk), pp: bt("pp", mdi(play ? "pause" : "play")), prog: mpPos(g.ctl).dur > 0 ? prog : "" };   // no bar (and no empty strip under the row) for a stream without a length, so the row sits in the middle of the card
  const vols = g.mem.map(x => { const v = states[x] ? states[x].attributes : {}; return '<div class="mv"><span>' + esc(fname(x)) + '</span><input type="range" min="0" max="100" data-vol="' + x + '" value="' + Math.round((v.volume_level || 0) * 100) + '"><button class="rnd s" data-mp="mute" data-e="' + x + '">' + mdi(v.is_volume_muted ? "volume-off" : "volume-high") + '</button></div>'; }).join("");
  return '<div class="npx"><div class="npa"><span data-np="media" title="Open Media" style="display:contents;cursor:pointer">' + art + '</span><div><b>' + esc(title) + '</b><div>' + aiLink(a.media_artist) + '</div><small>' + esc(a.media_album_name || "") + '</small></div></div>' +
    '<div class="npp">' + prog + '<div class="npts"><span>0:00</span><span>0:00</span></div></div>' +
    '<div class="mpt">' + bt("shuffle", mdi("shuffle-variant"), a.shuffle) + bt("prev", mdi("skip-previous")) + bt("pp", mdi(play ? "pause" : "play")) + bt("next", mdi("skip-next")) + bt("repeat", mdi(a.repeat === "one" ? "repeat-once" : a.repeat === "all" ? "repeat" : "repeat-off"), a.repeat && a.repeat !== "off") + '</div>' +
    vols + '<div class="chips npsp">' + g.mem.map(x => '<span class="chip on">' + mdi("speaker") + esc(fname(x)) + '</span>').join("") + '</div></div>';
}
function npRender() {
  if (!CONFIG.media || !CONFIG.media.length) return;
  const act = npActive(), w = $("#npw"), mi = $("#npmini"), sh = $("#npsheet"), hn0 = $("#hnp"), dragging = document.activeElement && document.activeElement.type === "range" && (w.contains(document.activeElement) || sh.contains(document.activeElement) || hn0.contains(document.activeElement));
  document.body.classList.toggle("np-on", !!act.length);
  const onMed = curPg() === "media";
  document.body.classList.toggle("np-fab", !!act.length && isMobile() && ["scenes", "irrigation"].indexOf(curPg()) > -1);   // pages with a floating pill: the music bar becomes a round button beside it
  document.body.classList.toggle("np-home", onHome()); document.body.classList.toggle("np-media", onMed); document.body.classList.toggle("np-hdr", !!act.length && !onMed && !isMobile());
  w.classList.toggle("npoff", !act.length); mi.classList.toggle("npoff", !act.length || onMed); hn0.classList.toggle("npoff", !act.length || onMed);
  if (!act.length) { npSheet = false; document.body.classList.remove("nps-open"); w.innerHTML = mi.innerHTML = hn0.innerHTML = ""; return; }
  if (dragging) return;
  if (Date.now() < npHoldT) { setTimeout(queueNp, npHoldT - Date.now() + 30); return; }   // not while a swipe is in progress
  const g = act[0], c = npPlay(g, false), more = act.length > 1 ? '<a class="npmore" href="#media">+' + (act.length - 1) + ' more</a>' : "";
  w.classList.toggle("open", npOpen);
  const hs = npOpen && onHome() ? hlState(g) : null, hasLy = !!(hs && hs.st === "sync" && hs.lines && hs.lines.length);
  HL.lines = hasLy ? hs.lines : null; HL.ctl = g.ctl; HL.cur = -2; if (!hasLy) npPage = 0;
  const rowH = '<div class="npr"><div class="npart" data-np="media">' + c.art + '</div><div class="npi"><b>' + esc(c.title) + '</b><small>' + c.sub + '</small></div>' + c.pp + '</div>';
  const gs = (states[g.ctl] || { attributes: {} }), ga = gs.attributes, gp = gs.state === "playing", bt2 = (m, i, on) => '<button class="rnd' + (on ? " on" : "") + '" data-mp="' + m + '" data-e="' + g.ctl + '">' + i + '</button>';
  const rowX = '<div class="npr"><div class="npart" data-np="media">' + c.art + '</div><div class="npi"><b>' + esc(c.title) + '</b><small>' + c.sub + '</small></div></div>';
  const ctl = '<div class="mpt npc">' + bt2("shuffle", mdi("shuffle-variant"), ga.shuffle) + bt2("prev", mdi("skip-previous")) + bt2("pp", mdi(gp ? "pause" : "play")) + bt2("next", mdi("skip-next")) + bt2("repeat", mdi(ga.repeat === "one" ? "repeat-once" : ga.repeat === "all" ? "repeat" : "repeat-off"), ga.repeat && ga.repeat !== "off") + '</div>';
  const aH = npAnim; npAnim = 0;
  w.innerHTML = '<div class="nph"><button class="npl" data-np="media"><span class="nptx">' + (npPage ? "Lyrics" : "Now playing") + '</span>' + (act.length > 1 ? '<span class="npn">+' + (act.length - 1) + '</span>' : "") + mdi("chevron-right") + '</button><button class="npt2" data-np="tog" aria-label="' + (npOpen ? "Collapse" : "Expand") + '">' + mdi(npOpen ? "chevron-up" : "chevron-down") + '</button></div>' +
    (npOpen ? '<div class="nps"><div class="npg">' + rowX + c.prog + ctl + '</div>' + (hasLy ? '<div class="npg"><div class="nply">' + hlLn(HL.lines, hlIdx()) + '</div></div>' : "") + '</div>' + (hasLy ? '<div class="npdt"><i data-npg="0"' + (npPage ? "" : ' class="on"') + '></i><i data-npg="1"' + (npPage ? ' class="on"' : "") + '></i></div>' : "") : rowH + c.prog);
  { const sl = $(".nps", w); if (sl && npPage) sl.scrollLeft = npPage * npPw(sl); }
  if (aH && w.animate && !matchMedia("(prefers-reduced-motion:reduce)").matches) {   // smooth expand / collapse
    const nh = w.offsetHeight, ease = "cubic-bezier(.2,.8,.2,1)";
    if (Math.abs(nh - aH) > 4) {
      w.animate([{ height: aH + "px" }, { height: nh + "px" }], { duration: 380, easing: ease });
      const body = $(".nps", w) || $(".npr", w); if (body) body.animate(npOpen ? [{ opacity: 0, transform: "translateY(-14px)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: ease });
      const dt = $(".npdt", w); if (dt) dt.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 120, easing: "ease", fill: "backwards" });
    }
  }
  { const s0 = states[g.ctl] || { attributes: {} }, a0 = s0.attributes, pl0 = s0.state === "playing";
    $("#npfab").innerHTML = '<div class="nfa" role="button" aria-label="Now playing: tap the centre to play or pause, the edge to open the player"><div class="nfart">' + c.art + '</div><svg class="nfr" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26.5"/><circle class="mpr" cx="28" cy="28" r="26.5" ' + mpData(g.ctl) + '/></svg><i class="nfpp">' + mdi(pl0 ? "pause" : "play") + '</i></div>';
    const fa = $("#npfab .nfa"); fa.dataset.e = g.ctl;
    fa.onclick = e => { e.stopPropagation(); const r = fa.getBoundingClientRect(), d = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
      if (d < 15) mpDo("pp", fa.dataset.e); else { npSheet = true; npRender(); } }; }   // one tap target: centre = play / pause, the ring of artwork around it = open the player
  mi.innerHTML = '<div class="npr" data-np="sheet"><div class="npart" data-np="media" title="Open Media">' + c.art + '</div><div class="npi"><b>' + esc(c.title) + '</b><small>' + c.sub + '</small></div>' + c.pp + '</div>' + c.prog;
  document.body.classList.toggle("nps-open", npSheet);
  if (npSheet) {
    clearTimeout(npbT);
    const ss = hlState(g), sh = !!(ss && ss.st === "sync" && ss.lines && ss.lines.length), PG = [["Now playing", npPlay(g, true)]];
    SL.lines = sh ? ss.lines : null; SL.ctl = g.ctl; SL.cur = -2;
    if (sh) PG.push(["Lyrics", '<div class="shly">' + slLn(SL.lines, hlIdx(SL.lines, SL.ctl)) + '</div>']);
    if (aiOn() && ga.media_artist) PG.push(["Artist", aiHtml(g.ctl)]);   // swipe pages: Now playing · Lyrics (when synced lyrics exist) · Artist
    { const ix = PG.map(x => x[0]).indexOf(npsName); npsPage = ix < 0 ? 0 : ix; npsName = PG[npsPage][0]; }
    const arOld = $("#npbody .ar"), arTop = arOld ? arOld.scrollTop : 0;
    $("#npbody").innerHTML = '<div class="lbl"><span class="nptx">' + PG[npsPage][0] + '</span>' + '<button class="rnd s npq' + (npsName === "Lyrics" ? " on" : "") + (sh ? "" : " off") + '" data-np="lyr" ' + (sh ? "" : 'aria-disabled="true" ') + 'aria-label="' + (!sh ? "No synced lyrics for this song" : npsName === "Lyrics" ? "Back to the player" : "Lyrics") + '">' + mdi("lyrics") + '</button>' + '<button class="rnd s" data-np="close">' + mdi("close") + '</button></div>' +
      (PG.length > 1 ? '<div class="nps" data-pn="' + PG.map(x => x[0]).join("|") + '">' + PG.map(x => '<div class="npg">' + x[1] + '</div>').join("") + '</div><div class="npdt">' + PG.map((x, i) => '<i data-npg="' + i + '"' + (i === npsPage ? ' class="on"' : "") + '></i>').join("") + '</div><div class="npdl">' + PG.map((x, i) => '<span data-npg="' + i + '"' + (i === npsPage ? ' class="on"' : "") + '>' + x[0] + '</span>').join("") + '</div>' : PG[0][1]);
    { const sl = $("#npbody .nps"); if (sl && npsPage) sl.scrollLeft = npsPage * npPw(sl); const ar = $("#npbody .ar"); if (ar && arTop) ar.scrollTop = arTop; }
  } else { clearTimeout(npbT); npbT = setTimeout(() => { if (!npSheet) $("#npbody").innerHTML = ""; }, 420); }
  const hn = $("#hnp");
  if (isMobile() || onMed) hn.innerHTML = "";
  else {
    const s = states[g.ctl] || { attributes: {} }, a = s.attributes, play = s.state === "playing", pic = a.entity_picture;
    const art = mpArt(a, s.state, pic);
    const vs = g.mem.map(x => ((states[x] || {}).attributes || {}).volume_level || 0), av = Math.round(vs.reduce((x, y) => x + y, 0) / vs.length * 100);
    const bt = (m, i, big) => '<button class="rnd' + (big ? " big" : "") + '" data-mp="' + m + '" data-e="' + g.ctl + '">' + i + '</button>';
    hn.innerHTML = '<div class="hnpi" data-np="media" title="Open Media"><div class="npart">' + art + '</div><div class="npi"><b>' + esc(mpTitle(a, "playing") || "Playing") + '</b><small>' + esc([a.media_artist, a.media_album_name].filter(Boolean).join(" · ")) + '</small><small>' + esc(g.mem.map(fname).join(" · ")) + '</small></div></div>' +
      '<div class="hnpc">' + bt("prev", mdi("skip-previous")) + bt("pp", mdi(play ? "pause" : "play"), 1) + bt("next", mdi("skip-next")) + '</div>' +
      '<div class="hnpv">' + mdi("volume-high") + '<input type="range" min="0" max="100" data-hvol="' + g.mem.join(",") + '" value="' + av + '"></div>' +
      '<div class="mpb" ' + mpData(g.ctl) + '><i></i></div>';
  }
  tickMedia();
}
let npbT = 0, npq = 0; const queueNp = () => { if (!npq) npq = requestAnimationFrame(() => { npq = 0; try { npRender(); } catch (e) {} }); };
function npClick(e) {
  const n = e.target.closest("[data-np]"), b = e.target.closest("[data-mp]");
  if (b) { e.stopPropagation(); mpDo(b.dataset.mp, b.dataset.e); return; }
  const dg = e.target.closest("[data-npg]"); if (dg) { const sl = $(dg.closest("#npbody") ? "#npbody .nps" : "#npw .nps"); if (sl) sl.scrollTo({ left: +dg.dataset.npg * npPw(sl), behavior: "smooth" }); return; }
  if (!n) return;
  const k = n.dataset.np;
  if (k === "tog") { npAnim = $("#npw").offsetHeight; npOpen = !npOpen; try { localStorage.setItem("dashNp", npOpen ? "1" : "0"); } catch (_) {} }
  else if (k === "media") { if (npSheet) { npSheet = false; npRender(); } location.hash = "#media"; return; }
  else if (k === "sheet") npSheet = true;
  else if (k === "close") npSheet = false;
  else if (k === "lyr") { if (!SL.lines) return; npsName = npsName === "Lyrics" ? "Now playing" : "Lyrics"; }
  npRender();
}
$("#npw").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("nps") || !g.clientWidth) return; npHoldT = Date.now() + 700; const i = Math.round(g.scrollLeft / npPw(g)); npPage = i; $$("#npw .npdt i").forEach((d, k) => d.classList.toggle("on", k === i)); const t = $("#npw .nptx"); if (t) t.textContent = i ? "Lyrics" : "Now playing"; }, true);
$("#npbody").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("nps") || !g.clientWidth) return; npHoldT = Date.now() + 700; const i = Math.round(g.scrollLeft / npPw(g)), pn = (g.dataset.pn || "Now playing").split("|"); npsPage = i; npsName = pn[i] || pn[0]; $$("#npbody .npdt i, #npbody .npdl span").forEach((d, k) => d.classList.toggle("on", k === i)); const t = $("#npbody .nptx"); if (t) t.textContent = npsName; }, true);
setInterval(() => { if (!SL.lines || !npSheet) return; const i = hlIdx(SL.lines, SL.ctl); if (i === SL.cur) return; SL.cur = i; const el = $("#npbody .shly"); if (el) el.innerHTML = slLn(SL.lines, i); }, 500);
setInterval(() => { if (!HL.lines || !npOpen || curPg() !== "home") return; const i = hlIdx(); if (i === HL.cur) return; HL.cur = i; const el = $("#npw .nply"); if (el) el.innerHTML = hlLn(HL.lines, i); }, 500);
$("#npw").onclick = $("#npmini").onclick = $("#npsheet").onclick = $("#hnp").onclick = $("#npfab").onclick = npClick;
$("#hnp").onchange = e => {   // header slider = group volume: scale every speaker so the balance between them is kept
  const t = e.target; if (!t.dataset.hvol) return;
  const ids = t.dataset.hvol.split(","), cur = ids.map(x => ((states[x] || {}).attributes || {}).volume_level || 0), av = cur.reduce((x, y) => x + y, 0) / cur.length, nv = +t.value / 100;
  ids.forEach((x, i) => call("media_player", "volume_set", x, { volume_level: Math.max(0, Math.min(1, av > 0 ? cur[i] * nv / av : nv)) }));
};
$("#npw").onchange = $("#npsheet").onchange = e => { const t = e.target; if (t.dataset.vol) call("media_player", "volume_set", t.dataset.vol, { volume_level: +t.value / 100 }); };

