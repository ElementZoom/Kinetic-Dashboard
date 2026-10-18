// ---------- dominant colour of the album art, used for the Now playing glow ----------
const ARTC = {};
function artColor(pic) {
  if (!pic) return null; if (pic in ARTC) return ARTC[pic];
  ARTC[pic] = null; const im = new Image();
  im.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = c.height = 24; const x = c.getContext("2d"); x.drawImage(im, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data; let r = 0, g = 0, b = 0, w = 0, ar = 0, ag = 0, ab = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0, wt = sat * sat * (0.25 + mx / 255) + 0.001;
        r += R * wt; g += G * wt; b += B * wt; w += wt; ar += R; ag += G; ab += B;
      }
      let col = [r / w, g / w, b / w]; const n = d.length / 4, mx = Math.max.apply(null, col), mn = Math.min.apply(null, col);
      if (mx - mn < 18) col = [ar / n, ag / n, ab / n];   // greyscale art: use the plain average
      const m = Math.max.apply(null, col) || 1, k = m < 150 ? 150 / m : 1;   // keep it bright enough to glow
      ARTC[pic] = col.map(v => Math.round(Math.min(255, v * k))).join(",");
      if (curPg() === "media") drawMedia();
    } catch (e) { ARTC[pic] = ""; }
  };
  im.onerror = () => { ARTC[pic] = ""; };
  im.src = (pic.charAt(0) === "/" ? CONFIG.url : "") + pic;
  return null;
}
function mpArt(a, st, pic) {
  const t = mpTitle(a, st), map = CONFIG.mediaArt || {};
  if (!pic) for (const k in map) if (t && t.toLowerCase().indexOf(k.toLowerCase()) > -1) { pic = map[k]; break; }
  if (pic) return '<img alt="" src="' + (pic.charAt(0) === "/" ? CONFIG.url : "") + esc(pic) + '">';
  const H = [26, 44, 64, 38, 78, 52, 70, 34, 56, 30], bars = H.map((h, i) => '<rect x="' + (9 + i * 8.4) + '" y="' + (50 - h / 2) + '" width="4.6" height="' + h + '" rx="2.3"/>').join("");
  return '<div class="ph gen"><svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">' + bars + '</svg></div>';
}
// local files (e.g. white noise .m4a) report no media_title: fall back to the file name
function mpTitle(a, st) {
  if (a.media_title) return a.media_title;
  if (!/^(playing|paused|buffering)$/.test(st) || !a.media_content_id || /^spotify:/.test(a.media_content_id)) return "";
  try { const f = decodeURIComponent(String(a.media_content_id).split("?")[0].split("/").pop() || ""); return f.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_]+/g, " "); } catch (e) { return ""; }
}
let mpVo = false;   // phone: volume sliders are tucked behind the speaker button
function mpCard(mem, ctl) {
  const s = states[ctl] || { state: "unavailable", attributes: {} }, a = s.attributes, play = s.state === "playing", pic = a.entity_picture, title = mem.map(fname).join(" + ");
  const art = mpArt(a, s.state, pic);
  const mt = mpTitle(a, s.state), info = mt ? '<b>' + esc(mt) + '</b><div>' + esc(a.media_artist || "") + '</div><small>' + esc(a.media_album_name || "") + '</small>' : '<b>' + (s.state === "off" || s.state === "unavailable" ? esc(title) + " is " + (s.state === "off" ? "off" : "unavailable") : "Nothing playing") + '</b>';
  const bt = (m, i, on) => '<button class="rnd' + (on ? " on" : "") + '" data-mp="' + m + '" data-e="' + ctl + '">' + i + '</button>';
  const vols = mem.map(x => { const v = states[x] ? states[x].attributes : {}; return '<div class="mv"><span>' + esc(fname(x)) + '</span><input type="range" min="0" max="100" data-vol="' + x + '" value="' + Math.round((v.volume_level || 0) * 100) + '"><button class="rnd s" data-mp="mute" data-e="' + x + '">' + mdi(v.is_volume_muted ? "volume-off" : "volume-high") + '</button></div>'; }).join("");
  const mg = artColor(pic);
  return '<div class="pn mpc' + (/^(playing|paused)$/.test(s.state) ? "" : " idle") + (play ? " pl" : "") + (mpVo ? " vo" : "") + '"' + (mg ? ' style="--mg:' + mg + '"' : "") + '><div class="lbl">' + esc(title) + ' · ' + esc(s.state) + (a.source ? " · " + esc(a.source) : "") + '</div><div class="mpa">' + art + '<div>' + info + '</div></div>' +
    '<div class="mpb" ' + mpData(ctl) + '><i></i></div>' +
    '<div class="mpt">' + bt("shuffle", mdi("shuffle-variant"), a.shuffle) + bt("prev", mdi("skip-previous")) + bt("pp", mdi(play ? "pause" : "play")) + bt("next", mdi("skip-next")) + bt("repeat", mdi(a.repeat === "one" ? "repeat-once" : a.repeat === "all" ? "repeat" : "repeat-off"), a.repeat && a.repeat !== "off") + '<button class="rnd mvt' + (mpVo ? " on" : "") + '" data-mp="voltog">' + mdi("volume-high") + '</button></div>' +
    '<div class="mvs">' + vols + '</div></div>';
}
function mpGroups() {   // Sonos lists the group coordinator first
  const ids = CONFIG.media || [], seen = {}, out = [];
  ids.forEach(id => {
    if (seen[id]) return;
    const gm = (states[id] && states[id].attributes.group_members) || [id], mem = ids.filter(x => gm.indexOf(x) > -1);
    if (mem.indexOf(id) < 0) mem.unshift(id);
    mem.forEach(x => { seen[x] = 1; });
    out.push({ mem: mem, ctl: gm.indexOf(gm[0]) > -1 && ids.indexOf(gm[0]) > -1 ? gm[0] : id });
  });
  return out;
}
function drawMedia() {
  const ae = document.activeElement; if (ae && ae.type === "range" && $("#media").contains(ae)) return;
  const ids = CONFIG.media, rk = g => ({ playing: 0, paused: 1 }[(states[g.ctl] || {}).state] ?? 2), cards = mpGroups().map((g, i) => [rk(g), i, mpCard(g.mem, g.ctl)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  $("#mp").innerHTML = '<div class="mpg">' + cards.join("") + '</div>' + (ids.length > 1 ? '<div style="margin-top:14px"><button class="eb" data-mp="' + (cards.length > 1 ? "join" : "unjoin") + '">' + (cards.length > 1 ? "GROUP SPEAKERS" : "UNGROUP") + '</button></div>' : "");
  tickMedia(); lyrUpdate();
}
function tickMedia() {
  $$("#npfab .mpr").forEach(el => { const d = +el.dataset.dur; let p = +el.dataset.pos || 0; if (el.dataset.play === "1" && el.dataset.upd) p += (srvNow() - Date.parse(el.dataset.upd)) / 1000; const f = d ? Math.max(0, Math.min(1, p / d)) : 0, C = 2 * Math.PI * 26.5; el.style.strokeDasharray = C; el.style.strokeDashoffset = C * (1 - f); });
  $$("#mp .mpb, #npw .mpb, #npsheet .mpb, #npmini .mpb, #hnp .mpb").forEach(el => {
    const d = +el.dataset.dur, ts = el.nextElementSibling && el.nextElementSibling.classList.contains("npts") ? el.nextElementSibling : null;
    el.style.visibility = d ? "" : "hidden"; if (ts) ts.style.visibility = d ? "" : "hidden"; if (!d) return;   // "" (not "visible"), so it stays hidden behind the start-up logo
    let p = +el.dataset.pos || 0; if (el.dataset.play === "1" && el.dataset.upd) p += (srvNow() - Date.parse(el.dataset.upd)) / 1000;
    p = Math.max(0, Math.min(d, p));
    $("i", el).style.width = p / d * 100 + "%";
    if (ts) { ts.firstChild.textContent = fmtT(p); ts.lastChild.textContent = fmtT(d); }
  });
}

