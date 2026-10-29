// ---------- weather alerts: wind now, wind and rain coming up (Notifications > Alerts card, and the header strip chips) ----------
// Same tiers as a Home Assistant weather-alert automation: wind 30 / 62 / 89 km/h, rain 0.5 / 2 / 5 mm per hour over the next 6 hours.
// config weatherAlerts: false = off, or { wind: true, rain: true, windTiers: [30, 62, 89], rainTiers: [0.5, 2, 5], hours: 6, stripWind: 2, stripRain: 3 }
// stripWind / stripRain = the tier (1 to 3) from which the header strip shows a chip (Strong wind and Heavy rain by default); the Alerts card shows from tier 1.
const wxaCfg = () => {
  const c = CONFIG.weatherAlerts; if (c === false) return null;
  const o = c && typeof c === "object" ? c : {}, tiers = (a, d) => Array.isArray(a) && a.length === 3 && a.every(x => isFinite(x)) ? a.map(Number) : d;
  return { wind: o.wind !== false, rain: o.rain !== false, wt: tiers(o.windTiers, [30, 62, 89]), rt: tiers(o.rainTiers, [0.5, 2, 5]), hours: +o.hours > 0 ? +o.hours : 6, sw: +o.stripWind || 2, sr: +o.stripRain || 3 };
};
const wxaTier = (v, t) => v == null || isNaN(v) ? 0 : v > t[2] ? 3 : v > t[1] ? 2 : v > t[0] ? 1 : 0;
const WXA_COL = ["", "#e6c84f", "#f2a33a", "#ff6b5e"];
const wxaCol = k => { const w = wxaNow(); const t = w ? (k === "wind" ? (w.wind || {}).tier : (w.rain || {}).tier) : 0; return WXA_COL[t || 1]; };
const wxaTime = ts => { const d = new Date(ts), td = d.toDateString() === new Date().toDateString(); return (td ? "" : d.toLocaleDateString([], { weekday: "short" }) + " ") + d.toLocaleTimeString([], tmo({ hour: "numeric" })).replace(/\s?([AP])M/i, " $1M"); };
function wxaNow() {
  const c = wxaCfg(), w = states[W]; if (!c) return null;
  const a = w ? w.attributes : {}, now = Date.now(), end = now + c.hours * 3600000, fc = fcH.filter(x => { const t = Date.parse(x.datetime); return t >= now - 3600000 && t <= end; }), out = {};
  if (c.wind) {
    const u = a.wind_speed_unit || "km/h", k = /mph/i.test(u) ? 1.609 : /m\/s/i.test(u) ? 3.6 : /kn|kt/i.test(u) ? 1.852 : 1;
    const live = a.wind_speed != null ? +a.wind_speed * k : null, gust = a.wind_gust_speed != null ? +a.wind_gust_speed * k : null;
    const pk = fc.filter(x => x.wind_speed != null).reduce((p, x) => !p || x.wind_speed > p.wind_speed ? x : p, null), fmax = pk ? pk.wind_speed * k : null;
    const lt = wxaTier(live, c.wt), ft = wxaTier(fmax, c.wt), tier = Math.max(lt, ft);
    if (tier) out.wind = { tier: tier, now: lt >= ft && lt > 0, v: lt >= ft ? live : fmax, gust: gust, fmax: fmax, fat: pk ? Date.parse(pk.datetime) : 0, ft: ft, lt: lt, t: c.wt };
  }
  if (c.rain && fc.length) {
    const mm = x => +x.precipitation || 0, band = fc.filter(x => mm(x) > c.rt[0]), mx = band.reduce((p, x) => Math.max(p, mm(x)), 0), tier = wxaTier(mx, c.rt);
    if (tier) { const s = Date.parse(band[0].datetime), e = Date.parse(band[band.length - 1].datetime) + 3600000; out.rain = { tier: tier, max: mx, from: s, to: e, now: s <= now, n: band.length }; }
  }
  return out.wind || out.rain ? Object.assign(out, { cfg: c }) : null;
}
const WXA_W = ["", "Moderate", "Strong", "Severe"], WXA_R = ["", "Light rain", "Moderate rain", "Heavy rain"];
function wxaHtml(w) {
  let h = "";
  const x = w.wind, r = w.rain;
  if (x) {
    const mx = x.t[2] * 1.1, pc = v => Math.min(100, v / mx * 100).toFixed(1), lbl = (x.now ? "WIND NOW" : "WIND FORECAST") + " · " + WXA_W[x.tier].toUpperCase();
    const sub = []; if (x.now && x.gust != null && x.gust > x.v + 1) sub.push("Gusts " + Math.round(x.gust) + " km/h"); if (x.now && x.fmax != null && x.fmax > x.v + 1) sub.push("Up to " + Math.round(x.fmax) + " km/h around " + wxaTime(x.fat)); if (!x.now) sub.push("Around " + wxaTime(x.fat));
    h += '<div class="wxa-s wt' + x.tier + '" data-wxa="wind"><div class="lbl wxa-l">' + mdi(x.tier === 3 ? "weather-hurricane" : x.tier === 2 ? "weather-windy-variant" : "weather-windy") + ' ' + lbl + '</div>' +
      '<div class="wxa-v">' + Math.round(x.v) + '<small>km/h</small></div>' +
      '<div class="wxa-g"><i style="width:' + pc(x.v) + '%"></i>' + x.t.map(t => '<u style="left:' + pc(t) + '%"></u>').join("") + '</div>' +
      '<div class="wxa-k">' + x.t.map(t => '<span style="left:' + pc(t) + '%">' + t + '</span>').join("") + '</div>' +
      (sub.length ? '<div class="wxa-n">' + esc(sub.join(" · ")) + '</div>' : "") + '</div>';
  }
  if (r) {
    const when = r.now ? "now, until " + wxaTime(r.to) : r.n === 1 ? "at " + wxaTime(r.from) : "from " + wxaTime(r.from);
    h += '<div class="wxa-s wxa-r wt' + r.tier + '" data-wxa="rain">' + mdi(r.tier === 3 ? "weather-pouring" : r.tier === 2 ? "weather-rainy" : "weather-partly-rainy") + '<div><b>' + WXA_R[r.tier] + ' ' + esc(when) + '</b><small>Up to ' + (+r.max.toFixed(1)) + ' mm/h</small></div></div>';
  }
  return '<div class="wxa">' + h + '</div>';
}
