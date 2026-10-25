// ---------- weather ----------
let fcH = [];
function loadFcH() {
  send({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "hourly" }, target: { entity_id: W }, return_response: true },
    r => { fcH = r.response[W].forecast || []; if (curPg() === "weather") drawWeather(); else if (curPg() === "irrigation") drawIrr(); });
}
const CARD = d => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d / 22.5) % 16];
// ----- summary lines worked out from the hourly forecast (replaces the template sensors) -----
const wxWhen = x => { const t = new Date(x.datetime), td = t.toDateString() === new Date().toDateString(); return (td ? "today" : t.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })) + " at " + t.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", " ").replace(/ /, " "); };
const wxLine = t => t ? '<div class="sm" style="margin-top:6px">' + esc(t) + '</div>' : "";
function wxBeaufort(kmh) { const T = [[1, "Calm"], [6, "Light air"], [12, "Light breeze"], [20, "Gentle breeze"], [29, "Moderate breeze"], [39, "Fresh breeze"], [50, "Strong breeze"], [62, "Near gale"], [75, "Gale"], [89, "Strong gale"], [103, "Storm"], [118, "Violent storm"]]; let r = "Hurricane"; for (let i = 0; i < T.length; i++) if (kmh < T[i][0]) { r = T[i][1]; break; } return r; }
function wxSumWind(d, wu) {
  const w = d.slice(0, 24).filter(x => x.wind_speed != null); if (w.length < 2) return "";
  const k = /mph/i.test(wu) ? 1.609 : /m\/s/i.test(wu) ? 3.6 : /kn|kt/i.test(wu) ? 1.852 : 1, pk = w.reduce((p, x) => x.wind_speed > p.wind_speed ? x : p, w[0]);
  const C8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"], cnt = {}; w.forEach(x => { if (x.wind_bearing != null) { const c = C8[Math.round(x.wind_bearing / 45) % 8]; cnt[c] = (cnt[c] || 0) + 1; } });
  const dom = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  return "Winds: " + f1(pk.wind_speed) + " " + wu + " (" + wxBeaufort(pk.wind_speed * k) + ")" + (dom ? ", mostly from " + dom : "") + ", peaking " + wxWhen(pk) + ".";
}
function wxSumRain(d) {
  const w = d.slice(0, 24); if (w.length < 2) return [];
  const mm = x => +x.precipitation || 0, tot = w.reduce((p, x) => p + mm(x), 0), i = w.findIndex(x => mm(x) >= 0.1 || (+x.precipitation_probability || 0) >= 60), hv = w.reduce((p, x) => mm(x) > mm(p) ? x : p, w[0]), out = [];
  if (i < 0) out.push("No rain expected in the next 24 hours.");
  else out.push(i === 0 ? "Rain now or within the hour" + (mm(w[0]) ? " (" + f1(mm(w[0])) + " mm)" : "") + "." : "Next rain " + wxWhen(w[i]) + (mm(w[i]) ? " (" + f1(mm(w[i])) + " mm)" : "") + ((+w[i].precipitation_probability || 0) ? ", " + Math.round(w[i].precipitation_probability) + "% chance" : "") + ".");
  if (tot > 0) out.push("Next 24 hours: " + f1(tot) + " mm in total, heaviest " + f1(mm(hv)) + " mm at " + hr(hv) + ".");
  return out;
}
function wxSumUv(d) {
  const w = d.slice(0, 24), u = w.filter(x => x.uv_index != null), c = w.filter(x => x.cloud_coverage != null), out = [];
  const UL = v => v < 3 ? "Low" : v < 6 ? "Moderate" : v < 8 ? "High" : v < 11 ? "Very high" : "Extreme";
  if (u.length) { const pk = u.reduce((p, x) => x.uv_index > p.uv_index ? x : p, u[0]); out.push(pk.uv_index > 0 ? "UV peaks at " + f1(pk.uv_index) + " (" + UL(pk.uv_index) + ") " + wxWhen(pk) + "." : "No UV expected in the next 24 hours."); }
  if (c.length) { const av = c.reduce((p, x) => p + +x.cloud_coverage, 0) / c.length, cl = c.reduce((p, x) => +x.cloud_coverage < +p.cloud_coverage ? x : p, c[0]); out.push("Cloud averages " + Math.round(av) + "% over the next 24 hours, clearest around " + hr(cl) + " (" + Math.round(cl.cloud_coverage) + "%)."); }
  return out;
}
function wxSumTemp(d) {
  const w = d.slice(0, 24).filter(x => x.temperature != null); if (w.length < 2) return "";
  const hi = w.reduce((p, x) => +x.temperature > +p.temperature ? x : p, w[0]), lo = w.reduce((p, x) => +x.temperature < +p.temperature ? x : p, w[0]);
  return "Next 24 hours: warmest " + Math.round(hi.temperature) + "° " + wxWhen(hi) + ", coolest " + Math.round(lo.temperature) + "° " + wxWhen(lo) + ".";
}
// ----- hourly charts (wind / rain / UV share one look with the temperature chart) -----
const hcNow = () => { const now = Date.now(); return fcH.filter(x => Date.parse(x.datetime) > now - 3600000).slice(0, 36); };
function hcPath(pts) { let l = "M" + pts[0][0] + "," + pts[0][1]; for (let i = 1; i < pts.length; i++) { const m = (pts[i - 1][0] + pts[i][0]) / 2; l += " C" + m + "," + pts[i - 1][1] + " " + m + "," + pts[i][1] + " " + pts[i][0] + "," + pts[i][1]; } return l; }
function hcGrad(id, d, X, colFn) { return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + X(0) + '" x2="' + X(d.length - 1) + '" y1="0" y2="0">' + d.map((x, i) => '<stop offset="' + (i / Math.max(1, d.length - 1)).toFixed(3) + '" stop-color="' + colFn(x, i) + '"/>').join("") + '</linearGradient>'; }
function hcAxis(d, X, step, bot, icons) {
  const now = Date.now(); let g = "";
  d.forEach((x, i) => {
    const dt = new Date(x.datetime), nowi = i === 0;
    if (dt.getHours() === 0 && i) g += '<line x1="' + (X(i) - step / 2) + '" x2="' + (X(i) - step / 2) + '" y1="14" y2="' + (bot + 100) + '" stroke="currentColor" opacity=".14" stroke-dasharray="2 4"/><text x="' + (X(i) - step / 2 + 6) + '" y="12" font-size="10" fill="currentColor" opacity=".55" style="letter-spacing:.1em">' + dt.toLocaleDateString([], { weekday: "short" }).toUpperCase() + '</text>';
    g += '<text x="' + X(i) + '" y="' + (bot + 42) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity="' + (nowi ? 1 : .6) + '" style="letter-spacing:.06em">' + (nowi ? "NOW" : hr(x).toUpperCase()) + '</text>';
    if (icons) g += '<foreignObject x="' + (X(i) - 13) + '" y="' + (bot + 50) + '" width="26" height="26"><div xmlns="http://www.w3.org/1999/xhtml" class="hic">' + wic(x.condition) + '</div></foreignObject>';
  });
  return g;
}
function hcWrap(head, d, W, H, g, foot) { return head + hsw('<div class="hsc"><svg viewBox="0 0 ' + W + " " + H + '" style="display:block;width:' + W + 'px;height:' + H + 'px;color:var(--ink)">' + g + '</svg></div>') + '<div class="sm" style="margin-top:4px">' + foot + '</div>'; }
function windInner(a, wu) {
  const d = hcNow().filter(x => x.wind_speed != null), L1 = '<div class="lbl">' + mdi("weather-windy") + ' Hourly wind · ' + wu + '</div>';
  const cur = fcStats([["Now", a.wind_speed != null ? Math.round(a.wind_speed) + " " + wu + (a.wind_gust_speed != null ? " · gusts " + Math.round(a.wind_gust_speed) : "") : "--"]].concat((() => { const w24 = d.slice(0, 24); if (!w24.length) return []; const hiW = w24.reduce((p, x) => x.wind_speed > p.wind_speed ? x : p, w24[0]), loW = w24.reduce((p, x) => x.wind_speed < p.wind_speed ? x : p, w24[0]); return [["High", Math.round(hiW.wind_speed) + " " + wu + " · " + hr(hiW)], ["Low", Math.round(loW.wind_speed) + " " + wu + " · " + hr(loW)]]; })()));
  const sub = wxLine(wxSumWind(hcNow(), wu));
  if (d.length < 3) return L1 + sub + cur;
  const step = isMobile() ? 54 : 62, W = 40 + step * (d.length - 1) + 40, H = 252, top = 34, bot = 128, X = i => 40 + step * i;
  const mx = Math.max(20, Math.max.apply(null, d.map(x => Math.max(x.wind_speed, x.wind_gust_speed || 0)))), Y = v => bot - v / mx * (bot - top);
  const col = v => v < 20 ? "#6bb8ff" : v < 40 ? "#ffd34f" : v < 60 ? "#ff9a4d" : "#ff5a4d", gid = "wg" + (Date.now() % 1e5);
  const pts = d.map((x, i) => [X(i), Y(x.wind_speed)]), ln = hcPath(pts);
  let g = '<defs>' + hcGrad(gid + "l", d, X, x => col(x.wind_speed)) + '<linearGradient id="' + gid + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>';
  g += '<path d="' + ln + " L" + X(d.length - 1) + "," + (bot + 18) + " L" + X(0) + "," + (bot + 18) + 'Z" fill="url(#' + gid + 'a)"/>';
  if (d.some(x => x.wind_gust_speed != null)) g += '<path d="' + hcPath(d.map((x, i) => [X(i), Y(x.wind_gust_speed != null ? x.wind_gust_speed : x.wind_speed)])) + '" fill="none" stroke="#ff7a6b" stroke-width="1.8" stroke-dasharray="2 6" stroke-linecap="round" opacity=".8"/>';
  g += '<path d="' + ln + '" fill="none" stroke="url(#' + gid + 'l)" stroke-width="3.5" stroke-linecap="round"/>';
  d.forEach((x, i) => {
    const c = col(x.wind_speed), nowi = i === 0;
    g += '<circle cx="' + X(i) + '" cy="' + pts[i][1] + '" r="' + (nowi ? 6.5 : 4.5) + '" fill="' + (nowi ? c : "var(--bg2,#222)") + '" stroke="' + c + '" stroke-width="2.5"/><text x="' + X(i) + '" y="' + (pts[i][1] - 13) + '" text-anchor="middle" font-size="' + (nowi ? 15 : 13) + '" font-weight="' + (nowi ? 600 : 400) + '" fill="currentColor">' + Math.round(x.wind_speed) + '</text>';
    if (x.wind_bearing != null) g += '<path d="M0-9L6 7L0 3L-6 7Z" transform="translate(' + X(i).toFixed(1) + ',' + (bot + 66) + ') rotate(' + ((x.wind_bearing + 180) % 360) + ')" fill="' + c + '"/><text x="' + X(i) + '" y="' + (bot + 92) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">' + CARD(x.wind_bearing) + '</text>';
  });
  g += hcAxis(d, X, step, bot, false);
  const pk = d.reduce((p, x) => x.wind_speed > p.wind_speed ? x : p, d[0]);
  return hcWrap(L1 + sub + cur, d, W, H, g, "Peak " + Math.round(pk.wind_speed) + " " + wu + " around " + hr(pk) + " · arrows show where the wind is heading · dotted = gusts");
}
function rainInner(a) {
  const d = hcNow(), L1 = '<div class="lbl">' + mdi("weather-rainy") + ' Hourly rain</div>';
  const sm = wxSumRain(d).map(wxLine).join("");
  const nowR = fcH.length ? String(f1(+fcH[0].precipitation || 0)) : null, d24 = d.slice(0, 24), tot = d24.reduce((p, x) => p + (+x.precipitation || 0), 0), pk = d24.reduce((p, x) => (+x.precipitation || 0) > (+p.precipitation || 0) ? x : p, d24[0] || {}), pp = Math.max.apply(null, d24.map(x => +x.precipitation_probability || 0).concat(0));
  const st = fcStats([["Rain now", nowR != null ? esc(nowR) + " mm" : "--"], ["Next 24 h", f1(tot) + " mm"], [pp ? "Chance (peak)" : "Heaviest", pp ? Math.round(pp) + "%" : (+pk.precipitation > 0 ? f1(pk.precipitation) + " mm · " + hr(pk) : "dry")]]);
  if (d.length < 3) return L1 + sm + st;
  const step = isMobile() ? 54 : 62, W = 40 + step * (d.length - 1) + 40, H = 252, top = 40, bot = 128, X = i => 40 + step * i;
  const mx = Math.max(4, Math.max.apply(null, d.map(x => +x.precipitation || 0))), col = v => v < 0.5 ? "#7fd3f7" : v < 2.5 ? "#4FC3F7" : v < 7.6 ? "#2d8fe0" : "#1a5fb4", gid = "rg" + (Date.now() % 1e5), bw = Math.min(30, step * .5);
  let g = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ab7ff"/><stop offset="1" stop-color="#2d8fe0" stop-opacity=".55"/></linearGradient></defs><line x1="20" x2="' + (W - 20) + '" y1="' + bot + '" y2="' + bot + '" stroke="currentColor" opacity=".14"/>';
  d.forEach((x, i) => {
    const v = +x.precipitation || 0, h = v > 0 ? Math.max(6, v / mx * (bot - top)) : 0, nowi = i === 0;
    if (v > 0) g += '<rect x="' + (X(i) - bw / 2) + '" y="' + (bot - h) + '" width="' + bw + '" height="' + h + '" rx="9" fill="url(#' + gid + ')"/><text x="' + X(i) + '" y="' + (bot - h - 9) + '" text-anchor="middle" font-size="13" fill="currentColor" font-weight="' + (nowi ? 600 : 400) + '">' + (v < 10 ? v.toFixed(1) : Math.round(v)) + '</text>';
    else g += '<circle cx="' + X(i) + '" cy="' + (bot - 4) + '" r="3" fill="currentColor" opacity=".2"/>';
    const p = +x.precipitation_probability || 0; if (p) g += '<text x="' + X(i) + '" y="' + (bot + 92) + '" text-anchor="middle" font-size="11" fill="#6ab7ff">' + Math.round(p) + '%</text>';
  });
  g += hcAxis(d, X, step, bot, true);
  return hcWrap(L1 + sm + st, d, W, H, g, "Bars = rain (mm) · blue % = chance of rain · scroll sideways");
}
function uvInner(a) {
  const d = hcNow(), L1 = '<div class="lbl">' + mdi("weather-sunny-alert") + ' Hourly UV &amp; cloud</div>', sm = wxSumUv(d).map(wxLine).join("");
  const h0 = fcH[0] || {}, uv = a.uv_index != null ? +a.uv_index : parseFloat(h0.uv_index), cc = a.cloud_coverage != null ? +a.cloud_coverage : parseFloat(h0.cloud_coverage);
  const UL = v => v < 3 ? "Low" : v < 6 ? "Moderate" : v < 8 ? "High" : v < 11 ? "Very high" : "Extreme", UC = v => v < 3 ? "#5fd08a" : v < 6 ? "#ffd34f" : v < 8 ? "#ff9a4d" : v < 11 ? "#ff5a4d" : "#b06bff";
  const du = d.filter(x => x.uv_index != null), pk = du.reduce((p, x) => x.uv_index > p.uv_index ? x : p, du[0] || {});
  const st = fcStats([["UV now", isNaN(uv) ? "--" : f1(uv) + " · " + UL(uv)], ["Cloud now", isNaN(cc) ? "--" : Math.round(cc) + "%"], ["UV peak", du.length ? f1(pk.uv_index) + " · " + hr(pk) : "--"]]);
  if (d.length < 3) return L1 + sm + st;
  const step = isMobile() ? 54 : 62, W = 40 + step * (d.length - 1) + 40, H = 252, top = 34, bot = 128, X = i => 40 + step * i, gid = "ug" + (Date.now() % 1e5);
  const mx = Math.max(8, Math.ceil(Math.max.apply(null, du.map(x => +x.uv_index).concat(0)))), YU = v => bot - v / mx * (bot - top), YC = v => bot - v / 100 * (bot - top);
  const cl = d.map((x, i) => x.cloud_coverage != null ? [X(i), YC(+x.cloud_coverage)] : null).filter(Boolean);
  let g = '<defs>' + hcGrad(gid + "l", d, X, x => UC(+x.uv_index || 0)) + '</defs>';
  if (cl.length > 2) g += '<path d="' + hcPath(cl) + " L" + cl[cl.length - 1][0] + "," + bot + " L" + cl[0][0] + "," + bot + 'Z" fill="#90CAF9" opacity=".16"/><path d="' + hcPath(cl) + '" fill="none" stroke="#90CAF9" stroke-width="1.5" opacity=".5"/>';
  const pts = d.map((x, i) => [X(i), YU(+x.uv_index || 0)]);
  g += '<path d="' + hcPath(pts) + '" fill="none" stroke="url(#' + gid + 'l)" stroke-width="3.5" stroke-linecap="round"/>';
  d.forEach((x, i) => {
    const u = +x.uv_index || 0, c = UC(u), nowi = i === 0;
    if (u > 0 || nowi) g += '<circle cx="' + X(i) + '" cy="' + pts[i][1] + '" r="' + (nowi ? 6.5 : 4.5) + '" fill="' + (nowi ? c : "var(--bg2,#222)") + '" stroke="' + c + '" stroke-width="2.5"/><text x="' + X(i) + '" y="' + (pts[i][1] - 13) + '" text-anchor="middle" font-size="' + (nowi ? 15 : 13) + '" font-weight="' + (nowi ? 600 : 400) + '" fill="currentColor">' + (u % 1 ? u.toFixed(1) : u) + '</text>';
    if (x.cloud_coverage != null) g += '<text x="' + X(i) + '" y="' + (bot + 92) + '" text-anchor="middle" font-size="11" fill="#90CAF9">' + Math.round(x.cloud_coverage) + '%</text>';
  });
  g += hcAxis(d, X, step, bot, true);
  return hcWrap(L1 + sm + st, d, W, H, g, "Coloured line = UV index · blue shading and % = cloud cover · scroll sideways");
}
// forecast carousel: wind / rain / UV & cloud
let fcTab = 0;
const FCT = [["Temp", "thermometer"], ["Wind", "weather-windy"], ["Rain", "weather-rainy"], ["UV", "weather-sunny-alert"]];
const tcol = t => tempColor(t).replace(/,0\.7\)$/, ",1)");
function bentoHtml(l) {
  if (!l.length) return "";
  const L = d => d.templow != null ? d.templow : d.temperature;
  const lo = Math.min.apply(null, l.map(L)), hi = Math.max.apply(null, l.map(d => d.temperature)), rg = (hi - lo) || 1;
  return '<div class="bnt">' + l.map((d, i) => {
    const dt = new Date(d.datetime), td = i === 0 && dt.toDateString() === new Date().toDateString(), n = td ? "Today" : dt.toLocaleDateString([], { weekday: "short" }), l0 = L(d), h = d.temperature, p = d.precipitation_probability;
    return '<div class="bq' + (td ? " td" : "") + '" style="--hc:' + tcol(h) + ';--lc:' + tcol(l0) + '"><div class="bh"><span class="lbl">' + n + '</span><i class="wb">' + wic(d.condition) + '</i></div><b>' + Math.round(h) + '°</b><small>low ' + Math.round(l0) + '°' + (p != null && p >= 30 ? ' · ' + mdi("water") + p + '%' : '') + '</small>' +
      '<span class="tr"><u style="left:' + ((l0 - lo) / rg * 100) + '%;width:' + Math.max(8, (h - l0) / rg * 100) + '%"></u></span></div>';
  }).join("") + '</div>';
}
function tempInner(a) {
  const now = Date.now(), d = fcH.filter(x => Date.parse(x.datetime) > now - 3600000).slice(0, 36), L1 = '<div class="lbl">' + mdi("thermometer") + ' Hourly temperature</div>' + wxLine(wxSumTemp(fcH.filter(x => Date.parse(x.datetime) > now - 3600000)));
  if (d.length < 3) return L1 + '<div class="sm" style="margin-top:8px">Loading hourly forecast…</div>';
  const T = d.map(x => +x.temperature), mn = Math.min.apply(null, T), mx = Math.max.apply(null, T), step = isMobile() ? 54 : 62, W = 40 + step * (d.length - 1) + 40, H = 236, top = 34, bot = 128, rg = (mx - mn) || 1;
  const X = i => 40 + step * i, Y = t => bot - (t - mn) / rg * (bot - top);
  const pts = d.map((x, i) => [X(i), Y(T[i])]);
  let line = "M" + pts[0][0] + "," + pts[0][1]; for (let i = 1; i < pts.length; i++) { const m = (pts[i - 1][0] + pts[i][0]) / 2; line += " C" + m + "," + pts[i - 1][1] + " " + m + "," + pts[i][1] + " " + pts[i][0] + "," + pts[i][1]; }
  const gid = "tg" + (Date.now() % 1e5), stops = d.map((x, i) => '<stop offset="' + (i / (d.length - 1)).toFixed(3) + '" stop-color="' + tcol(T[i]) + '"/>').join("");
  let g = '<defs><linearGradient id="' + gid + 'l" gradientUnits="userSpaceOnUse" x1="' + X(0) + '" x2="' + X(d.length - 1) + '" y1="0" y2="0">' + stops + '</linearGradient><linearGradient id="' + gid + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>';
  g += '<path d="' + line + " L" + X(d.length - 1) + "," + (bot + 18) + " L" + X(0) + "," + (bot + 18) + 'Z" fill="url(#' + gid + 'a)"/><path d="' + line + '" fill="none" stroke="url(#' + gid + 'l)" stroke-width="3.5" stroke-linecap="round"/>';
  d.forEach((x, i) => {
    const dt = new Date(x.datetime), hh = dt.getHours(), c = tcol(T[i]), nowi = i === 0 || (Date.parse(x.datetime) <= now && Date.parse(d[i + 1] ? d[i + 1].datetime : x.datetime) > now);
    if (hh === 0 && i) g += '<line x1="' + (X(i) - step / 2) + '" x2="' + (X(i) - step / 2) + '" y1="14" y2="' + (H - 6) + '" stroke="currentColor" opacity=".14" stroke-dasharray="2 4"/><text x="' + (X(i) - step / 2 + 6) + '" y="12" font-size="10" fill="currentColor" opacity=".55" style="letter-spacing:.1em">' + dt.toLocaleDateString([], { weekday: "short" }).toUpperCase() + '</text>';
    g += '<circle cx="' + X(i) + '" cy="' + pts[i][1] + '" r="' + (nowi ? 6.5 : 4.5) + '" fill="' + (nowi ? c : "var(--bg2,#222)") + '" stroke="' + c + '" stroke-width="2.5"/>';
    g += '<text x="' + X(i) + '" y="' + (pts[i][1] - 13) + '" text-anchor="middle" font-size="' + (nowi ? 15 : 13) + '" font-weight="' + (nowi ? 600 : 400) + '" fill="currentColor">' + Math.round(T[i]) + '°</text>';
    g += '<text x="' + X(i) + '" y="' + (bot + 42) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity="' + (nowi ? 1 : .6) + '" style="letter-spacing:.06em">' + (nowi && i === 0 ? "NOW" : hr(x).toUpperCase()) + '</text>';
    g += '<foreignObject x="' + (X(i) - 13) + '" y="' + (bot + 50) + '" width="26" height="26"><div xmlns="http://www.w3.org/1999/xhtml" class="hic">' + wic(x.condition) + '</div></foreignObject>';
    const pr = +x.precipitation || 0, pp = +x.precipitation_probability || 0;
    if (pr > 0 || pp >= 40) g += '<text x="' + X(i) + '" y="' + (bot + 92) + '" text-anchor="middle" font-size="11" fill="#6ab7ff">' + (pr > 0 ? (pr < 10 ? pr.toFixed(1) : Math.round(pr)) + "mm" : Math.round(pp) + "%") + '</text>';
  });
  const d24 = d.slice(0, 24), hiX = d24.reduce((p, x) => +x.temperature > +p.temperature ? x : p, d24[0]), loX = d24.reduce((p, x) => +x.temperature < +p.temperature ? x : p, d24[0]), otS = sv(E("outdoorTemp")), nowT = otS != null && !isNaN(parseFloat(otS)) ? parseFloat(otS) : (a.temperature != null ? +a.temperature : +d[0].temperature);
  const st = fcStats([["Temp now", f1(nowT) + "°"], ["High", Math.round(hiX.temperature) + "° · " + hr(hiX)], ["Low", Math.round(loX.temperature) + "° · " + hr(loX)]]);
  return L1 + st + hsw('<div class="hsc"><svg viewBox="0 0 ' + W + " " + (H + 16) + '" style="display:block;width:' + W + 'px;height:' + (H + 16) + 'px;color:var(--ink)">' + g + '</svg></div>') + '<div class="sm" style="margin-top:4px">Next ' + d.length + ' hours · scroll sideways · blue = rain</div>';
}
const fcStats = r => '<div class="wg" style="margin:10px 0 14px">' + r.map(x => '<div class="ws"><span class="lbl">' + x[0] + '</span><b>' + x[1] + '</b></div>').join("") + '</div>';
const hr = x => new Date(x.datetime).toLocaleTimeString([], tmo({ hour: "numeric" })).replace(" ", "").toLowerCase();
function fcPanel(a, wu) {
  const sl = [tempInner(a), windInner(a, wu), rainInner(a), uvInner(a)];
  return '<div class="pn pg fcp">' + hsw('<div class="chips tabs fct">' + FCT.map((t, i) => '<button class="chip' + (i === fcTab ? " on" : "") + '" data-ft="' + i + '">' + mdi(t[1]) + '<span>' + t[0] + '</span></button>').join("") + '</div>') + '<div class="fcs">' + sl.map(x => '<div class="fcl">' + x + '</div>').join("") + '</div></div>';
}
function fcFit() { const s = $("#wx .fcs"); if (!s) return; let m = 0; Array.prototype.forEach.call(s.children, c => { m = Math.max(m, c.offsetHeight); }); if (m) s.style.height = m + "px"; }   // every tab gets the tallest height so the card never resizes or scrolls vertically
function fcSync() { const s = $("#wx .fcs"); if (s) s.scrollLeft = fcTab * s.clientWidth; fcFit(); setTimeout(fcFit, 350); }
$("#wx").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("wcols") || !g.clientWidth) return; wcI = Math.round(g.scrollLeft / (g.clientWidth + 12)); $$("#wx .wdots i").forEach((d, k) => d.classList.toggle("on", k === wcI)); }, true);
$("#wx").addEventListener("click", e => { const d = e.target.closest("[data-wi]"); if (!d) return; const g = $("#wx .wcols"); wcI = +d.dataset.wi; if (g) g.scrollTo({ left: wcI * (g.clientWidth + 12), behavior: "smooth" }); });
$("#wx").addEventListener("scroll", e => { const s = e.target; if (!s.classList || !s.classList.contains("fcs") || !s.clientWidth) return; const i = Math.round(s.scrollLeft / s.clientWidth); if (i !== fcTab) { fcTab = i; fcFit(); $$("#wx .fct .chip").forEach((c, k) => c.classList.toggle("on", k === i)); } }, true);
$("#wx").addEventListener("click", e => { const ad = e.target.closest("[data-ai]"); if (ad) { const r = $("#wx .alr"); alI = +ad.dataset.ai; if (r) r.scrollTo({ left: alI * (r.clientWidth + 10), behavior: "smooth" }); return; } const b = e.target.closest("[data-ft]"); if (!b) return; fcTab = +b.dataset.ft; fcFit(); const s = $("#wx .fcs"); $$("#wx .fct .chip").forEach((c, k) => c.classList.toggle("on", k === fcTab)); if (s) s.scrollTo({ left: fcTab * s.clientWidth, behavior: "smooth" }); });

let wcI = 0, alI = 0;
function drawWeather() {
  const w = states[W], a = w ? w.attributes : {}, cd = w ? (COND[w.state] || ["☁️", w.state]) : ["", ""], ot = sv(E("outdoorTemp"));
  const st = (l, v) => '<div class="ws"><span class="lbl">' + l + '</span><b>' + v + '</b></div>', n = (v, u) => v != null ? Math.round(v) + (u ? " " + u : "") : "--", wu = a.wind_speed_unit || "km/h";
  let h = '<div class="wcols"><div class="pn"><div class="lbl">Now · ' + cd[1] + '</div><div class="row" style="justify-content:flex-start;gap:20px;margin:10px 0 16px"><span class="big2">' + f1(ot != null ? ot : a.temperature) + '°</span><span class="wbig">' + wic(w && w.state) + '</span></div><div class="wg">' +
    st("Indoor", sv(CONFIG.indoor) != null ? f1(sv(CONFIG.indoor)) + "°" : "--") + st("Humidity", n(a.humidity, "%")) + st("Pressure", n(a.pressure, a.pressure_unit)) + st("Wind", n(a.wind_speed, wu)) + st("Gusts", n(a.wind_gust_speed, wu)) + st("UV", a.uv_index != null ? a.uv_index : "--") + st("Cloud", n(a.cloud_coverage, "%")) +
    st("Rain now", fcH.length ? f1(+fcH[0].precipitation || 0) + " mm" : "--") + st("Air quality", esc(sv(E("airQuality")) || "--")) + '</div></div>' +
    '<div class="pn"><div class="lbl">Next 7 days</div>' + bentoHtml(fc.slice(0, 7)) + '</div></div><div class="dots wdots"><i data-wi="0"' + (wcI === 0 ? ' class="on"' : "") + '></i><i data-wi="1"' + (wcI === 1 ? ' class="on"' : "") + '></i></div>';
  h += fcPanel(a, wu);
  const wr = states[E("weatherWarnings")];
  const AL = [];
  if (wr && sv(E("weatherWarnings")) && wr.attributes.warnings) AL.push('<div class="alert w"><div class="lbl">Weather warning · MetService</div>' + esc(wr.attributes.warnings) + '</div>');
  AL.push.apply(AL, volcHtml()); AL.push.apply(AL, (quakeHtml() || "").split(/(?=<div class="alert q")/).filter(Boolean));
  if (alI >= AL.length) alI = 0;
  const al = AL.length > 1 ? '<div class="alc"><div class="alr">' + AL.join("") + '</div><div class="dots aldots">' + AL.map((x, i) => '<i data-ai="' + i + '"' + (i === alI ? ' class="on"' : "") + '></i>').join("") + '</div></div>' : AL.join("");   // several warnings: swipe left / right
  $("#wx").innerHTML = al + h; fcSync();
  { const r = $("#wx .alr"); if (r) { if (alI && r.clientWidth) r.scrollLeft = alI * (r.clientWidth + 10); r.onscroll = () => { if (!r.clientWidth) return; alI = Math.round(r.scrollLeft / (r.clientWidth + 10)); $$("#wx .aldots i").forEach((d, i) => d.classList.toggle("on", i === alI)); }; } }
  const wc = $("#wx .wcols"); if (wc && wcI && wc.clientWidth) wc.scrollLeft = wcI * (wc.clientWidth + 12);
}

function volcHtml() {
  return (CONFIG.volcanoes || []).filter(e => parseFloat(sv(e)) > 0).map(e => {
    const v = states[e].attributes, t = v.feed_last_update ? new Date(v.feed_last_update).toLocaleString([], tmo({ day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })) : "";
    return '<div class="alert v" data-go="#hazards" style="--qc:' + (HZ_VAL[Math.max(0, Math.min(5, Math.round(parseFloat(sv(e)) || 0)))] || HZ_VAL[1])[1] + '"><div class="lbl">' + mdi("volcano") + ' ' + esc(v.friendly_name || e) + '</div><b>' + esc(v.activity || "No warnings") + '</b><div>' + t + ' · GeoNet</div></div>';
  });
}
function quakeHtml() {   // Weather page + notifications: real quakes within hazards.alertKm (default 100 km) in the last 24 h; the rest live on the Hazards page
  const km = +((CONFIG.hazards || {}).alertKm) || hzFocus(), mn = hzMin();
  const q = Object.keys(states).map(k => states[k]).filter(x => x.entity_id.indexOf("geo_location.") === 0 && x.attributes.source === "geonetnz_quakes" && x.attributes.quality !== "deleted" && parseFloat(x.state) <= km && (+x.attributes.magnitude || 0) >= mn && x.attributes.time && Date.now() - new Date(x.attributes.time).getTime() < 864e5).sort((x, y) => new Date(y.attributes.time) - new Date(x.attributes.time));
  return q.slice(0, 2).map(x => { const a = x.attributes, M = hzMag(+a.magnitude || 0); return '<div class="alert q" data-go="#hazards" style="--qc:' + M[1] + '"><div class="lbl">' + mdi("alert-circle") + ' Earthquake · ' + M[2] + '</div><b>Magnitude ' + f1(a.magnitude) + ' · ' + Math.round(parseFloat(x.state)) + ' km away</b><div>' + esc(a.locality || "") + (a.mmi != null && a.mmi !== "" ? " · MMI " + a.mmi + " " + hzMMI(+a.mmi).toLowerCase() + " shaking" : "") + ' · ' + new Date(a.time).toLocaleString([], tmo({ weekday: "short", hour: "numeric", minute: "2-digit" })) + '</div></div>'; }).join("");
}

