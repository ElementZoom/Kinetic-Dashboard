// ---------- Weather page extras: feels like, dew point, pressure trend, frost risk, sun and moon ----------
// Everything comes from what Home Assistant already has: the weather entity (apparent_temperature / dew_point when it gives them, otherwise worked out from
// temperature, humidity and wind), its recent pressure history, the hourly forecast, and sun.sun. Nothing to configure; config.js can set frostBelow (default 2 °C).
Object.assign(MDI, { "snowflake-alert": "M6.2,5.1L7.9,6.9L6.6,8.2L5.3,7L4.1,8.3L3.2,7.4L4.5,6.1L3.2,4.8L4.1,3.9L5.4,5.2M13,3H11V7.7L8.3,5L6.9,6.4L11,10.5V11H10.5L6.4,6.9L5,8.3L7.7,11H3V13H7.7L5,15.7L6.4,17.1L10.5,13H11V13.5L6.9,17.6L8.3,19L11,16.3V21H13V16.3L15.7,19L17.1,17.6L13,13.5V13H13.5L17.6,17.1L19,15.7L16.3,13H21V11H16.3L19,8.3L17.6,6.9L13.5,11H13V10.5L17.1,6.4L15.7,5L13,7.7V3Z", "weather-sunset": "M3,12H7A5,5 0 0,1 12,7A5,5 0 0,1 17,12H21A1,1 0 0,1 22,13A1,1 0 0,1 21,14H3A1,1 0 0,1 2,13A1,1 0 0,1 3,12M5,16H19A1,1 0 0,1 20,17A1,1 0 0,1 19,18H5A1,1 0 0,1 4,17A1,1 0 0,1 5,16M17,20A1,1 0 0,1 18,21A1,1 0 0,1 17,22H7A1,1 0 0,1 6,21A1,1 0 0,1 7,20H17M12,2L14.4,4.4L12,6.8L9.6,4.4L12,2Z" });
const wxC = a => /f/i.test(a.temperature_unit || "") ? "F" : "C";
const wxToC = (v, u) => u === "F" ? (v - 32) * 5 / 9 : v, wxFromC = (v, u) => u === "F" ? v * 9 / 5 + 32 : v;
function wxFeels(a, t, wu) {   // [feels-like, dew point], both in the weather entity's temperature unit; null when it cannot be known
  const u = wxC(a); let fl = a.apparent_temperature != null ? +a.apparent_temperature : null, dp = a.dew_point != null ? +a.dew_point : null;
  const tc = t != null ? wxToC(+t, u) : null, rh = a.humidity != null ? +a.humidity : null;
  if (dp == null && tc != null && rh > 0) { const g = Math.log(rh / 100) + 17.27 * tc / (237.3 + tc); dp = wxFromC(237.3 * g / (17.27 - g), u); }
  if (fl == null && tc != null && rh != null && a.wind_speed != null) { const k = /mph/i.test(wu) ? 0.447 : /km/i.test(wu) ? 0.2778 : /kn|kt/i.test(wu) ? 0.5144 : 1, e = rh / 100 * 6.105 * Math.exp(17.27 * tc / (237.7 + tc)); fl = wxFromC(tc + 0.33 * e - 0.70 * a.wind_speed * k - 4.0, u); }
  return [fl, dp];
}
// ----- pressure trend: the weather entity's own history, fetched once in a while -----
let wxP = { t: 0, d: null, busy: false };
function wxPresLoad() {
  if (!W || wxP.busy || Date.now() - wxP.t < 15 * 60000) return; wxP.busy = true;
  const s = new Date(Date.now() - 3 * 3600000).toISOString();
  getToken().then(tk => fetch(CONFIG.url + "/api/history/period/" + encodeURIComponent(s) + "?filter_entity_id=" + encodeURIComponent(W) + "&significant_changes_only=0", { headers: { Authorization: "Bearer " + tk } })).then(r => r.json()).then(j => {
    const l = (Array.isArray(j) && j[0] || []).filter(x => x.attributes && x.attributes.pressure != null), a = states[W] && states[W].attributes;
    wxP.d = l.length && a && a.pressure != null ? { d: +a.pressure - +l[0].attributes.pressure, h: (Date.now() - new Date(l[0].last_changed || l[0].last_updated).getTime()) / 3600000 } : null;
    wxP.t = Date.now(); wxP.busy = false; if (curPg() === "weather") drawWeather();
  }).catch(() => { wxP.t = Date.now(); wxP.busy = false; });
}
function wxPresTrend(a) {   // "↑ Rising +2.1 / 3 h", "→ Steady", "↓ Falling -3.4 / 3 h"
  if (!wxP.d || wxP.d.h < 1) return ""; const hpa = /inhg/i.test(a.pressure_unit || "") ? 33.8639 : /mmhg/i.test(a.pressure_unit || "") ? 1.3332 : /kpa/i.test(a.pressure_unit || "") ? 10 : 1, d = wxP.d.d * hpa, ph = Math.round(wxP.d.h);
  const k = Math.abs(d) < 1 ? ["→", "Steady"] : d > 0 ? ["↑", d > 3 ? "Rising fast" : "Rising"] : ["↓", d < -3 ? "Falling fast" : "Falling"];
  return k[0] + " " + k[1] + (Math.abs(d) >= 1 ? '<small class="wtr">' + (d > 0 ? "+" : "") + f1(wxP.d.d) + " " + (a.pressure_unit || "hPa") + " in " + ph + " h</small>" : "");
}
// ----- frost risk: lowest temperature in the next 24 hours of the hourly forecast (daily low as a fallback) -----
function wxFrost(a) {
  const u = wxC(a), lim = CONFIG.frostBelow != null ? +CONFIG.frostBelow : 2, hrs = (typeof hcNow === "function" ? hcNow() : []).slice(0, 24).filter(x => x.temperature != null);
  let lo = null, at = null; if (hrs.length > 3) { const m = hrs.reduce((p, x) => +x.temperature < +p.temperature ? x : p, hrs[0]); lo = +m.temperature; at = new Date(m.datetime); }
  else if (typeof fc !== "undefined" && fc && fc[0] && (fc[0].templow != null)) lo = +fc[0].templow;
  if (lo == null || wxToC(lo, u) > lim) return "";
  const c = wxToC(lo, u), lvl = c <= 0 ? "Frost likely" : "Frost possible";
  return '<div class="alert fr"><div class="lbl">' + mdi("snowflake-alert") + ' ' + lvl + '</div><b>Low of ' + Math.round(lo) + '° ' + (at ? (at.toDateString() === new Date().toDateString() ? "today" : "tomorrow") + " at " + at.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase() : "") + '</b><div>Cover tender plants and bring pots in.</div></div>';
}
// ----- sun and moon -----
const wxHM = d => d.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase();
function wxSunTimes() {
  const s = states["sun.sun"]; if (!s || !s.attributes.next_rising || !s.attributes.next_setting) return null;
  const td = new Date().toDateString(), fix = x => { let d = new Date(x); if (d.toDateString() !== td) d = new Date(d.getTime() - 864e5); return d; };   // after sunrise HA gives tomorrow's; one day earlier is today's (within a couple of minutes)
  const r = fix(s.attributes.next_rising), t = fix(s.attributes.next_setting); return r.toDateString() === td && t.toDateString() === td ? { r: r, s: t } : null;
}
function wxMoon(now) {
  const SYN = 29.530588853, age = (((now - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % SYN + SYN) % SYN, th = 2 * Math.PI * age / SYN, lit = (1 - Math.cos(th)) / 2;
  const names = [[1.85, "New moon"], [5.54, "Waxing crescent"], [9.22, "First quarter"], [12.91, "Waxing gibbous"], [16.61, "Full moon"], [20.3, "Waning gibbous"], [23.99, "Last quarter"], [27.68, "Waning crescent"], [99, "New moon"]];
  return { age: age, th: th, lit: lit, name: names.filter(x => age < x[0])[0][1] };
}
function wxMoonSvg(m, south) {
  const r = 15, cx = 17, cy = 17, rx = r * Math.abs(Math.cos(m.th)), waxing = m.th < Math.PI, crescent = Math.cos(m.th) > 0;
  const lit = m.lit < 0.02 ? "" : m.lit > 0.98 ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#f1d983"/>' : '<path d="M' + cx + "," + (cy - r) + " A" + r + "," + r + " 0 0 1 " + cx + "," + (cy + r) + " A" + rx.toFixed(2) + "," + r + " 0 0 " + (crescent ? 0 : 1) + " " + cx + "," + (cy - r) + 'Z" fill="#f1d983"/>';
  const flip = (waxing ? 0 : 1) ^ (south ? 1 : 0);
  return '<svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" opacity=".18"/><g' + (flip ? ' transform="translate(34,0) scale(-1,1)"' : "") + ">" + lit + '</g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="currentColor" stroke-opacity=".5"/></svg>';
}
function wxSunCard() {
  const t = wxSunTimes(); if (!t) return "";
  const now = new Date(), dl = t.s - t.r, p = Math.max(0, Math.min(1, (now - t.r) / dl)), h = Math.floor(dl / 3600000), mi = Math.round(dl % 3600000 / 60000);
  const z = states["zone.home"], south = z && z.attributes.latitude != null ? +z.attributes.latitude < 0 : false, m = wxMoon(now.getTime());
  const gold = new Date(t.s.getTime() - 3600000);
  const day = now >= t.r && now <= t.s, tl = day ? (function () { const x = Math.round((t.s - now) / 60000); return (x >= 60 ? Math.floor(x / 60) + " h " + x % 60 + " min" : x + " min") + " of daylight left"; })() : now < t.r ? "Sunrise in " + Math.round((t.r - now) / 60000) + " min" : "Sun is down";
  const st = (l, v) => '<div class="ws"><span class="lbl">' + l + '</span><b>' + v + '</b></div>';
  return '<div class="pn pg" id="wxsun"><div class="lbl">' + mdi("weather-sunset") + ' Sun and moon</div><div class="sunr"><div class="sunb"><i style="left:' + (p * 100).toFixed(1) + '%"></i></div><div class="sunl"><span>' + wxHM(t.r) + '</span><span class="sm">' + esc(tl) + '</span><span>' + wxHM(t.s) + '</span></div></div>' +
    '<div class="wg">' + st("Sunrise", wxHM(t.r)) + st("Sunset", wxHM(t.s)) + st("Daylight", h + " h " + mi + " min") + st("Golden hour", "from " + wxHM(gold)) +
    '<div class="ws moon"><span class="lbl">Moon</span><b>' + wxMoonSvg(m, south) + '<span>' + m.name + '<small>' + Math.round(m.lit * 100) + '% lit</small></span></b></div></div></div>';
}
