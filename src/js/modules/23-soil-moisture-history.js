// ---------- Soil moisture history (Irrigation page): 72 h from the HA recorder, resampled every 30 min ----------
const IH = { t: 0, d: null, busy: 0, sc: null };
function loadIrrH(force) {
  const zs = CONFIG.irrigation.filter(z => z.moist), srcOf = z => { const d = CONFIG.derived.soil[(z.zone || "")]; return d && d.moisture && d.moisture.length ? d.moisture : [z.moist]; };
  const ids = []; zs.forEach(z => srcOf(z).forEach(x => { if (ids.indexOf(x) < 0) ids.push(x); }));
  if (!ws || ws.readyState !== 1 || !ids.length || (IH.busy && Date.now() - IH.busy < 20000) || (!force && IH.d && Date.now() - IH.t < 600000)) return;
  IH.busy = Date.now(); const end = new Date(), st = new Date(end.getTime() - 72 * 3600000);
  send({ type: "history/history_during_period", start_time: st.toISOString(), end_time: end.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false }, r => {
    IH.busy = 0; if (!r) return; const t0 = st.getTime(), step = 1800000, n = 144, out = {}, one = {};
    ids.forEach(id => {
      const a = (r[id] || []).map(x => [(x.lu != null ? x.lu * 1000 : Date.parse(x.last_updated || x.last_changed)), parseFloat(x.s != null ? x.s : x.state)]).filter(x => !isNaN(x[0]) && !isNaN(x[1])).sort((p, q) => p[0] - q[0]);
      if (!a.length) return; const pts = []; let k = 0, cur = a[0][1];
      for (let i = 0; i <= n; i++) { const t = t0 + i * step; while (k < a.length && a[k][0] <= t) cur = a[k++][1]; pts.push(cur); }
      one[id] = pts;
    });
    zs.forEach(z => { const L = srcOf(z).map(x => one[x]).filter(Boolean); if (!L.length) return; out[z.moist] = L[0].map((_, i) => L.reduce((p, q) => p + q[i], 0) / L.length); });   // zone average worked out here from the individual probes
    IH.d = out; IH.t = Date.now(); if (curPg() === "irrigation") drawIrr();
  });
}
function irrMoist() {
  const Z = CONFIG.irrigation.filter(z => z.moist && IH.d && IH.d[z.moist]); if (!Z.length) return "";
  const PC = ["#2b8fd6", "#e0a21f", "#9a6bff", "#2fb67e"], mc = m => m < 15 ? "#a9a9a9" : m < 25 ? "#d9a400" : m < 45 ? "#3fb6b8" : "#2b8fd6";
  const n = IH.d[Z[0].moist].length, W = Math.max(Math.round((n - 1) * 5.4), (($("#irrigation").clientWidth || 360) / (innerWidth > 760 ? 2 : 1) - 100)), H = isMobile() ? irrHn : 150, y = v => H - Math.max(0, Math.min(100, v)) / 100 * H;
  const now = Z.map(z => { const a = IH.d[z.moist], v = parseFloat(sv(z.moist)); if (!isNaN(v)) a[a.length - 1] = v; return a[a.length - 1]; });
  const dl = Z.map((z, i) => now[i] - IH.d[z.moist][IH.d[z.moist].length - 49]).filter(x => !isNaN(x)), tr = dl.length ? dl.reduce((p, q) => p + q, 0) / dl.length : 0;
  const dry = Z.filter((z, i) => now[i] < 25), wet = now.every(v => v >= 45);
  const head = dry.length ? esc(dry.map(z => z.name).join(" and ")) + (dry.length > 1 ? " are" : " is") + " getting dry" : wet ? "Soil is still wet, no need to water yet" : "Soil moisture is comfortable";
  const PD = 14, path = a => a.map((v, i) => (i ? "L" : "M") + (PD + i / (a.length - 1) * (W - 2 * PD)).toFixed(1) + " " + y(v).toFixed(1)).join("");   // PD: a gap before the first and after the last point
  const t0 = Math.floor(Date.now() / 600000) * 600000 - 72 * 3600000, ticks = [];   // 10-minute steps, so a redraw with nothing new gives identical markup
  for (let t = Math.ceil(t0 / 86400000 / 1) * 86400000 - 13 * 3600000; t < Date.now(); t += 86400000) if (t > t0 + 3600000) ticks.push(t);
  const lx = t => (PD + (t - t0) / (72 * 3600000) * (W - 2 * PD));
  const svg = '<svg width="' + W + '" height="' + (H + 24) + '"><rect y="0" width="' + W + '" height="' + y(45) + '" fill="#2b8fd6" opacity=".07"/><rect y="' + y(45) + '" width="' + W + '" height="' + (y(25) - y(45)) + '" fill="#3fb6b8" opacity=".12"/><rect y="' + y(25) + '" width="' + W + '" height="' + (H - y(25)) + '" fill="#e0a21f" opacity=".1"/>' +
    [25, 45].map(v => '<line x1="0" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 4"/>').join("") +
    ticks.map(t => '<line x1="' + lx(t) + '" x2="' + lx(t) + '" y1="0" y2="' + H + '" stroke="currentColor" stroke-opacity=".08"/><text x="' + (lx(t) + 4) + '" y="' + (H + 17) + '" fill="currentColor" opacity=".55" font-size="11" font-family="monospace">' + new Date(t).toLocaleDateString([], { weekday: "short" }).toUpperCase() + '</text>').join("") +
    Z.map((z, i) => '<path d="' + path(IH.d[z.moist]) + '" fill="none" stroke="' + PC[i % 4] + '" stroke-width="2.4" stroke-linejoin="round"/><circle cx="' + (W - PD) + '" cy="' + y(now[i]) + '" r="4" fill="' + PC[i % 4] + '"/>').join("") + '</svg>';
  return '<div class="pn pg imc"><div class="lbl">' + mdi("water-percent") + ' Soil moisture · last 72 hours</div><div class="h3" style="margin:6px 0 10px">' + head + '</div>' +
    '<div class="wg">' + Z.map((z, i) => '<div class="ws"><span class="lbl">' + esc(z.name) + ' now</span><b style="color:' + mc(now[i]) + '">' + Math.round(now[i]) + '%</b></div>').join("") + '<div class="ws"><span class="lbl">Trend (24 h)</span><b' + (Math.abs(tr) < 1 ? "" : ' style="color:' + (tr < 0 ? "var(--heat)" : "var(--cool)") + '"') + '>' + (Math.abs(tr) < 1 ? "steady" : (tr < 0 ? "▼ " : "▲ ") + Math.abs(Math.round(tr)) + "%") + '</b></div></div>' +
    '<div class="imw"><div class="imy" style="height:' + H + 'px"><span>100</span><span>50</span><span>0</span></div>' + hsw('<div class="ims">' + svg + '</div>') + '</div>' +
    '<div class="iml">' + Z.map((z, i) => '<span><b style="color:' + PC[i % 4] + '">━</b> ' + esc(z.name) + '</span>').join("") + '<span>shaded: wet · moist · dry</span><span class="imh">swipe to look back →</span></div></div>';
}
let irrCi = 0, irrHn = 110, irrFitBusy = false;   // irrHn = height of the soil chart on a phone; irrFit() shrinks it only as far as needed
function irrFit() {   // phone: both cards share one height, short enough that the swipe dots end just above the floating bar, whatever the font size
  const pg = $("#irrigation"), g = $("#irrigation .irc"); if (!g) return;
  if (!isMobile()) { g.style.removeProperty("--irh"); pg.classList.remove("irtight"); return; }
  irrFitBusy = true;
  try {
    const navh = parseFloat(document.documentElement.style.getPropertyValue("--navh")) || 72, pillTop = innerHeight - (navh + 22) - 56;   // top of the floating bar (see --dock in 13-phone-nav.css)
    let over = 0;
    for (let k = 0; k < 5; k++) {
      const gg = $("#irrigation .irc"); if (!gg) return;
      const dots = $("#irrigation .irdots"), tail = dots ? dots.offsetHeight : 24, top = gg.getBoundingClientRect().top + (pg.scrollTop || 0) + (window.scrollY || 0);
      const avail = pillTop - 8 - tail - top, nat = gg.offsetHeight; over = nat - avail;
      if (over > 1 && irrHn > 64) { irrHn = Math.max(64, irrHn - Math.ceil(over)); drawIrr(); }
      else if (over < -6 && irrHn < 150 && gg.querySelector(".imc")) { const n = Math.min(150, irrHn + Math.floor(-over)); if (n === irrHn) break; irrHn = n; drawIrr(); }
      else break;
    }
    pg.classList.toggle("irtight", over > 1);   // even the smallest chart does not fit (a very short screen or huge text): the page may scroll, with room under the cards
  } finally { irrFitBusy = false; }
}
function irrPair() {   // rain + soil moisture side by side on a tablet, swipeable on a phone
  const c = [irrRain(), irrMoist()].filter(Boolean); if (c.length < 2) return c.join("");
  return '<div class="irc">' + c.join("") + '</div><div class="dots irdots">' + c.map((_, i) => '<i data-ci="' + i + '"' + (i === irrCi ? ' class="on"' : "") + '></i>').join("") + '</div>';
}
function irrZone(z) {
    let h = "";
    const sw = states[z.switch], on = !!sw && sw.state === "on", fl = parseFloat(sv(z.flow)) || 0, t = states[z.timer], act = !!t && t.state === "active";
    const fin = act && t.attributes.finishes_at ? Date.parse(t.attributes.finishes_at) : 0, dur = act ? (t.attributes.duration || "0:00:00").split(":").reduce((p, q) => p * 60 + +q, 0) * 1000 : 0;
    const mo = parseFloat(sv(z.moist)), tp = parseFloat(sv(z.stemp)), mc = mo < 15 ? "#a9a9a9" : mo < 25 ? "#ffd34f" : mo < 45 ? "#9fe7e8" : "#36a9e2";
    h += '<div class="pn zn" data-z="' + z.zone + '"><div class="zt"><b class="h3">' + mdi("sprinkler-variant") + ' ' + esc(z.name) + '</b></div>' +
      '<div class="zf' + (on ? " on" : "") + '" data-t="' + z.switch + '" style="--fc:' + FLOWC(fl) + '">' + irrWave(z.zone, on, fl) + '<span class="bi">' + mdi("water") + '</span><div><b class="h2">' + f1(fl) + ' m³/h</b><div class="lbl">' + (on ? (fl < .1 ? "minimal flow" : fl < .3 ? "low flow" : fl < .6 ? "moderate flow" : "high flow") : "off · tap to start") + '</div></div></div>' +
      (act ? '<div><div class="lbl tmr" data-fin="' + fin + '">--</div><div class="zb"><i data-dur="' + dur + '"></i></div></div>' : "") +
      '<div class="zd">' + [["5 m", "00:05:00"], ["15 m", "00:15:00"], ["30 m", "00:30:00"], ["1 hr", "01:00:00"], ["2 hr", "02:00:00"]].map(x => '<button class="chip" data-d="' + x[1] + '">' + x[0] + '</button>').join("") + '</div>' +
      (isNaN(mo) ? "" : '<div class="wg"><div class="ws"><span class="lbl">Soil moisture</span><b style="color:' + mc + '">' + f1(mo) + '%</b><span class="lbl">' + (mo < 15 ? "very dry" : mo < 25 ? "dry" : mo < 45 ? "moist" : "wet") + '</span></div>' + (isNaN(tp) ? "" : '<div class="ws"><span class="lbl">Soil temp</span><b>' + f1(tp) + '°</b></div>') + '</div>') + '</div>';
    return h;
}
let zSheet = false, zTab = 0;   // phone: the zones live in a floating bar that opens into a sheet (like Scenes)
function irrBar() {
  const Z = CONFIG.irrigation; if (!Z.length) return "";
  zTab = Math.min(zTab, Z.length - 1);
  const st = Z.map(z => { const sw = states[z.switch], on = !!sw && sw.state === "on", t = states[z.timer], fin = t && t.state === "active" && t.attributes.finishes_at ? Date.parse(t.attributes.finishes_at) : 0, left = fin ? Math.max(0, Math.ceil((fin - Date.now()) / 60000)) : 0; return { z: z, on: on, left: left, fl: parseFloat(sv(z.flow)) || 0 }; }),
    act = st.filter(x => x.on), col = !zSheet;
  const title = act.length ? act.map(x => x.z.name).join(" + ") : "All zones off", sum = act.length ? act.map(x => x.z.name + (x.left ? " · " + x.left + " min left" : " · " + f1(x.fl) + " m³/h")).join("  |  ") : Z.length + " zones · tap to water";
  return '<div class="zbk" data-zsh="1"></div><div class="pn zsx' + (col ? " col" : "") + '"><div class="sch" data-zsh="1"><i class="schi' + (act.length ? " on" : "") + '">' + mdi("sprinkler-variant") + '</i><div class="sck"><span class="lbl">Irrigation</span><b class="h3">' + esc(title) + '</b><div class="sm">Pick a zone, then start it or set a timer</div><div class="sm scsm">' + esc(sum) + '</div></div><span class="schc">' + mdi("chevron-down") + '<i class="schx">' + mdi("close") + '</i></span></div>' +
    '<div class="scb">' + hsw('<div class="chips tabs sctb">' + Z.map((z, i) => '<button class="chip' + (i === zTab ? " on" : "") + '" data-zt="' + i + '">' + mdi("sprinkler-variant") + '<span>' + esc(z.name) + '</span></button>').join("") + '</div>') + '<div class="zsb">' + irrZone(Z[zTab]) + '</div></div></div>';
}
function drawIrr() {
  loadIrrH();
  if (Date.now() - irrSc < 600) { if (!irrT) irrT = setTimeout(() => { irrT = 0; if (curPg() === "irrigation") drawIrr(); }, 650); return; }
  let h = '<div class="pn pg wrs"><div class="lbl">Water restriction</div><div class="h3">' + esc(sv("sensor.current_water_restriction") || "--") + '</div><div class="sm">' + esc(sv("sensor.current_water_restriction_description") || "") + '</div></div>' + irrPair();
  const bar = isMobile(), pg = $("#irrigation"), keep = bar ? $("#irrigation .zsx") : null, kst = keep ? keep.scrollTop : 0;
  if (bar) { h += irrBar(); pg.classList.toggle("zop", zSheet); document.body.classList.toggle("pill-open", zSheet); }
  else { h += '<div class="zg">' + CONFIG.irrigation.map(irrZone).join("") + '</div><div class="dots">' + CONFIG.irrigation.map((z, i) => '<i data-zi="' + i + '" title="' + esc(z.name) + '"' + (i === irrI ? ' class="on"' : "") + '></i>').join("") + '</div>'; pg.classList.remove("zop"); }
  const tmp = document.createElement("div"); tmp.innerHTML = h; for (const c of tmp.children) irrStamp(c); irrSync(pg, tmp); tickIrr();   // only the parts that changed are replaced
  { const z = $("#irrigation .zsx"); if (z && kst) z.scrollTop = kst; }
  if (!irrFitBusy) irrFit();
  const irc = $("#irrigation .irc"); if (irc && !irc._r) { irc._r = 1; if (irrCi && irc.clientWidth) irc.scrollLeft = irrCi * (irc.clientWidth + 12); }
  const ims = $("#irrigation .ims"); if (ims) { if (!ims._r) { ims._r = 1; ims.scrollLeft = IH.sc == null ? ims.scrollWidth : IH.sc; requestAnimationFrame(hsAll); } ims.onscroll = () => { IH.sc = ims.scrollLeft >= ims.scrollWidth - ims.clientWidth - 4 ? null : ims.scrollLeft; }; }
  const zg = $("#irrigation .zg"); if (zg && !zg._r) { zg._r = 1; if (irrI && zg.clientWidth) zg.scrollLeft = irrI * (zg.clientWidth + 14); }
}
// Redraws used to rebuild the whole page on every sensor change (the tap's own sensors update constantly), which made the pop-up, tabs, chart and
// wave flash and replay their animations. Now each piece is kept while its markup is unchanged; the wave's animation-delay is ignored when comparing.
const IRR_BOX = /(^|\s)(zsx|scb|zg)(\s|$)/;
function irrStamp(el) { el._k = el.outerHTML.replace(/animation-delay:-?[\d.]+m?s/g, ""); if (IRR_BOX.test(el.className)) for (const c of el.children) irrStamp(c); }
function irrSync(o, n) {
  const oc = [...o.children], nc = [...n.children];
  nc.forEach((c, i) => {
    const x = oc[i]; if (!x) { o.appendChild(c); return; }
    if (x._k === c._k) return;
    const box = IRR_BOX.exec(c.className), same = box && x.classList.contains(box[2]) && x.classList.contains("col") === c.classList.contains("col");
    if (same) { x._k = c._k; irrSync(x, c); } else x.replaceWith(c);
  });
  oc.slice(nc.length).forEach(x => x.remove());
}
function tickIrr() {
  $$(".tmr").forEach(el => {
    const ms = Math.max(0, +el.dataset.fin - Date.now()), b = $(".zb > i", el.parentNode) || $("i", el.parentNode);
    el.textContent = Math.floor(ms / 60000) + ":" + ("0" + Math.floor(ms % 60000 / 1000)).slice(-2) + " remaining";
    if (b && +b.dataset.dur) b.style.width = Math.min(100, ms / +b.dataset.dur * 100) + "%";
  });
}
$("#irrigation").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("irc") || !g.clientWidth) return; irrCi = Math.round(g.scrollLeft / (g.clientWidth + 12)); $$("#irrigation .irdots i").forEach((d, k) => d.classList.toggle("on", k === irrCi)); }, true);
$("#irrigation").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("zg") || !g.clientWidth) return; irrSc = Date.now(); irrI = Math.round(g.scrollLeft / (g.clientWidth + 14)); $$("#irrigation .dots i").forEach((d, k) => d.classList.toggle("on", k === irrI)); }, true);
$("#irrigation").onclick = e => {
  const ci = e.target.closest("[data-ci]"); if (ci) { const g = $("#irrigation .irc"); irrCi = +ci.dataset.ci; if (g) g.scrollTo({ left: irrCi * (g.clientWidth + 12), behavior: "smooth" }); return; }
  const zh = e.target.closest("[data-zsh]"), zt = e.target.closest("[data-zt]");
  if (zh) { const p0 = $("#irrigation .zsx"), c = !p0.classList.contains("col"); if (zh.classList.contains("zbk") && !c) return;   // same open / close as the Scenes sheet
    const ap = () => { const p = $("#irrigation .zsx"); if (!p) return; p.classList.toggle("col", c); $("#irrigation").classList.toggle("zop", !c); document.body.classList.toggle("pill-open", !c && isMobile()); zSheet = !c; if (c) pillIn(p); else shIn(p, $("#irrigation .zbk")); };
    if (!c) { const k = CONFIG.irrigation.findIndex(z => isOn(z.switch)); if (k > -1 && k !== zTab) { zTab = k; $("#irrigation .zbk").remove(); $("#irrigation .zsx").outerHTML = irrBar(); } }   // opening: start on a zone that is running
    if (c && isMobile()) shShut(p0, $("#irrigation .zbk"), ap); else ap(); return; }
  if (zt) { const old = zTab; zTab = +zt.dataset.zt; const k = $("#irrigation .zbk"); if (k) k.remove(); $("#irrigation .zsx").outerHTML = irrBar(); if (zTab !== old) txGo($("#irrigation .zsb"), zTab > old ? 1 : -1, true); tickIrr(); return; }
  const dt = e.target.closest("[data-zi]"); if (dt) { const g = $("#irrigation .zg"); irrI = +dt.dataset.zi; if (g) g.scrollTo({ left: irrI * (g.clientWidth + 14), behavior: "smooth" }); return; }
  const z = e.target.closest("[data-z]"); if (!z) return;
  const t = e.target.closest("[data-t]"), d = e.target.closest("[data-d]");
  if (d) {
    send({ type: "call_service", domain: "script", service: "start_sprinkler_timer", service_data: { zone: z.dataset.z.replace(/-/g, "_"), duration: d.dataset.d } });   // the script keys its zones driveway | backyard | right_walkway
    const zc = CONFIG.irrigation.find(x => x.zone === z.dataset.z), dur = d.dataset.d;   // safety net: if the script did not open the tap and start the timer within 4 s (wrong zone name, script error), do both directly
    if (zc) setTimeout(() => { const sw = states[zc.switch], tm = states[zc.timer]; if (!sw || sw.state !== "on") call("switch", "turn_on", zc.switch); if (zc.timer && (!tm || tm.state !== "active")) call("timer", "start", zc.timer, { duration: dur }); }, 4000);
  }
  else if (t) call("switch", "toggle", t.dataset.t);
};

