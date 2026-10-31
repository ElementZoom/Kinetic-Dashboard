// ---------- Climate page: the House card's 24-hour graph, and the line under a room's temperature ----------
// the graph is the average temperature of the rooms over the last 24 hours (the rooms' own climate sensors, from the Home Assistant recorder);
// config climateGraph: ["climate.a", "climate.b"] picks the rooms, otherwise every room except the heat pump
const CHZ = { t: 0, pts: null, busy: 0 };
function hzIds() { const g = CONFIG.climateGraph; if (Array.isArray(g) && g.length) return g.filter(x => typeof x === "string" && !entHidden(x)); return CONFIG.rooms.filter(r => !r.main && !entHidden(r.id)).map(r => r.id); }
function hzLoad(force) {
  const ids = hzIds(); if (!ids.length || typeof ws === "undefined" || !ws || ws.readyState !== 1) return;
  if ((CHZ.busy && Date.now() - CHZ.busy < 20000) || (!force && CHZ.pts && Date.now() - CHZ.t < 600000)) return;
  CHZ.busy = Date.now(); const end = new Date(), st = new Date(end.getTime() - 24 * 3600000);
  send({ type: "history/history_during_period", start_time: st.toISOString(), end_time: end.toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false }, r => {
    CHZ.busy = 0; if (!r) return; const t0 = st.getTime(), step = 1800000, n = 48, all = [];
    ids.forEach(id => {
      const a = (r[id] || []).map(x => { const at = x.a || x.attributes || {}; return [(x.lu != null ? x.lu * 1000 : Date.parse(x.last_updated || x.last_changed)), parseFloat(at.current_temperature)]; }).filter(x => !isNaN(x[0]) && !isNaN(x[1])).sort((p, q) => p[0] - q[0]);
      if (!a.length) return; const pts = []; let k = 0, cur = a[0][1];
      for (let i = 0; i <= n; i++) { const t = t0 + i * step; while (k < a.length && a[k][0] <= t) cur = a[k++][1]; pts.push(cur); }
      all.push(pts);
    });
    if (!all.length) return; CHZ.pts = all[0].map((_, i) => all.reduce((p, q) => p + q[i], 0) / all.length); CHZ.t = Date.now(); hzDraw();
  });
}
function hzDraw() {
  const c = cards[MAIN]; if (!c) return; const g = $(".czg", c.el); if (!g) return; const p = CHZ.pts;
  if (!p || p.length < 3) { g.hidden = true; return; }
  const mn = Math.min.apply(null, p), mx = Math.max.apply(null, p), pad = Math.max(0.6, (mx - mn) * 0.25), lo = mn - pad, hi = mx + pad, W = 300, H = 84, X = i => i / (p.length - 1) * W, Y = v => H - 6 - (v - lo) / (hi - lo) * (H - 14);
  let d = "M" + X(0) + " " + Y(p[0]).toFixed(1); for (let i = 1; i < p.length; i++) { const mx2 = (X(i - 1) + X(i)) / 2, my = (Y(p[i - 1]) + Y(p[i])) / 2; d += " Q" + X(i - 1).toFixed(1) + " " + Y(p[i - 1]).toFixed(1) + " " + mx2.toFixed(1) + " " + my.toFixed(1); }
  d += " T" + W + " " + Y(p[p.length - 1]).toFixed(1);
  const cs = [12, 14.5, 17.5, 20.5, 23, 25.5, 28], pc = PAL.temp.map(x => rgbOf(x).split(",").map(Number));   // the room cards' temperature colours, blended between their bands so the line shifts hue smoothly
  const col = t => { if (t <= cs[0]) return pc[0]; if (t >= cs[6]) return pc[6]; let k = 0; while (t > cs[k + 1]) k++; const f = (t - cs[k]) / (cs[k + 1] - cs[k]); return pc[k].map((v, n) => Math.round(v + (pc[k + 1][n] - v) * f)); };
  const stops = p.map((v, i) => '<stop offset="' + (i / (p.length - 1)).toFixed(3) + '" stop-color="rgb(' + col(v).join(",") + ')"/>').join("");
  $("svg", g).innerHTML = '<defs><linearGradient id="hzh" x1="0" y1="0" x2="1" y2="0">' + stops + '</linearGradient><linearGradient id="hzv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="hzk" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '"><rect width="' + W + '" height="' + H + '" fill="url(#hzv)"/></mask></defs><path d="' + d + ' L' + W + " " + H + " L0 " + H + ' Z" fill="url(#hzh)" mask="url(#hzk)"/><path d="' + d + '" fill="none" stroke="url(#hzh)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round"/>';
  $("small", g).textContent = "LAST 24 HOURS · " + f1(mn) + "–" + f1(mx) + "°"; g.hidden = false;
}
setInterval(() => { if (typeof curPg === "function" && curPg() === "climate" && !document.hidden) hzLoad(true); }, 600000);
function clSub(id) {   // "Target 21° · humidity 55%" (shown in the phone sheet)
  const c = cards[id]; if (!c || c.r.main) return; const s = $(".sub", c.el); if (!s) return; const a = (states[id] || {}).attributes || {}, tg = $(".tgt", c.el).textContent, hu = a.current_humidity;
  const t = "Target " + tg + (hu != null && !isNaN(parseFloat(hu)) ? " · humidity " + Math.round(hu) + "%" : ""); if (s.textContent !== t) s.textContent = t;
}
