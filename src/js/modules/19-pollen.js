// ---------- pollen: Google Pollen data, read from the sensors of Home Assistant's "pollenlevels" integration ----------
// config: pollen: { risk: "sensor.…_overall_pollen_risk_today", top: "sensor.…_top_pollen_types_today", plants: "sensor.…_plants_in_season_today", grass: "sensor.…_grass", alertFrom: "moderate" }
// Only `risk` is needed. A level is the index 0-5 (None, Very low, Low, Moderate, High, Very high) or its name. alertFrom = the level where the strip beside the clock and the Alerts list start to show it (default "moderate"; false = never).
Object.assign(MDI, { "pollen": "M9.70,12.00a2.3,2.3 0 1,0 4.6,0a2.3,2.3 0 1,0 -4.6,0ZM8.90,5.70a3.1,3.1 0 1,0 6.2,0a3.1,3.1 0 1,0 -6.2,0ZM14.89,10.05a3.1,3.1 0 1,0 6.2,0a3.1,3.1 0 1,0 -6.2,0ZM12.60,17.10a3.1,3.1 0 1,0 6.2,0a3.1,3.1 0 1,0 -6.2,0ZM5.20,17.10a3.1,3.1 0 1,0 6.2,0a3.1,3.1 0 1,0 -6.2,0ZM2.91,10.05a3.1,3.1 0 1,0 6.2,0a3.1,3.1 0 1,0 -6.2,0Z" });
const POLN = ["None", "Very low", "Low", "Moderate", "High", "Very high"], POLC = ["#5f9e7f", "#4fd59a", "#9ad66b", "#f2c261", "#ff9f43", "#ff4d5e"];
const POLAD = ["No pollen to speak of.", "Very little pollen about.", "Low pollen. Most people will not notice it.", "Hay fever is likely for sensitive people. Keep windows closed in the afternoon and rinse off after being outside.", "High pollen. Sensitive people should limit time outside, keep windows shut and take their usual hay fever precautions.", "Very high pollen. Stay indoors if you can and keep windows closed."];
const polCfg = () => CONFIG.pollen && CONFIG.pollen.risk ? CONFIG.pollen : null;
function polParse(v) {   // 0-5, or null when unknown
  const t = String(v == null ? "" : v).toLowerCase().trim();
  if (!t || t === "unknown" || t === "unavailable") return null;
  if (/very\s*high|extreme/.test(t)) return 5; if (/high/.test(t)) return 4; if (/moderate|medium/.test(t)) return 3; if (/very\s*low/.test(t)) return 1; if (/low/.test(t)) return 2; if (/^(none|no pollen|nil)/.test(t)) return 0;
  const n = parseFloat(t); return isNaN(n) ? null : Math.max(0, Math.min(5, Math.round(n)));
}
const polLevel = id => polParse(states[id] && states[id].state);
const polTxt = id => { const s = id && states[id] && states[id].state; return !s || /^(unknown|unavailable|none)$/i.test(s) ? "" : String(s).replace(/^\[|\]$/g, "").replace(/'/g, ""); };
const polFrom = () => { const a = (polCfg() || {}).alertFrom; if (a === false) return 99; const n = polParse(a == null ? "moderate" : a); return n == null ? 3 : Math.max(1, n); };
function polNow() { const c = polCfg(); if (!c) return null; const l = polLevel(c.risk); return l == null ? null : { l: l, name: POLN[l], col: POLC[l], top: polTxt(c.top), plants: polTxt(c.plants), grass: c.grass ? polLevel(c.grass) : null }; }
const polOn = () => { const p = polNow(); return !!p && p.l >= polFrom(); };
const polRel = id => { const c = polCfg(); return !!c && [c.risk, c.top, c.plants, c.grass].indexOf(id) > -1; };
const polRx = () => { const c = polCfg(); return c ? "^(" + [c.risk, c.top, c.plants, c.grass].filter(Boolean).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")$" : ""; };
function polCard() {   // the Pollen card on the Weather page (nothing when the sensors are missing or unavailable)
  const p = polNow(); if (!p) return "";
  const segs = [1, 2, 3, 4, 5].map(i => '<i' + (i <= p.l ? ' style="background:' + POLC[i] + '"' : "") + '></i>').join(""), keys = POLN.slice(1).map((x, i) => '<span' + (i + 1 === p.l ? ' class="on"' : "") + '>' + x + '</span>').join("");
  const st = (l, v) => '<div class="ws"><span class="lbl">' + l + '</span><b>' + esc(v) + '</b></div>';
  return '<div class="pn pg pol" id="wxpol" style="--pk:' + p.col + '"><div class="polt"><div><div class="lbl">Pollen · today</div><div class="polh">' + p.name + '</div>' + (p.top ? '<div class="sm">Main type today: ' + esc(p.top) + '</div>' : "") + '</div><span class="polsrc">Google Pollen</span></div>' +
    '<div class="polb">' + segs + '</div><div class="polk">' + keys + '</div>' +
    ((p.top || p.plants || p.grass != null) ? '<div class="wg" style="margin-top:14px">' + st("Top type", p.top || "--") + st("In season", p.plants || "--") + st("Grass", p.grass == null ? "--" : p.grass ? POLN[p.grass] + " · " + p.grass + " of 5" : "None") + '</div>' : "") +
    '<div class="sm polad">' + esc(POLAD[p.l]) + '</div></div>';
}
function polAlert() {   // a row in the Notifications > Alerts list: tap it to open the Pollen card
  const p = polNow(); if (!p || p.l < polFrom()) return "";
  return '<div class="alert q" data-go="#weather/pollen" style="--qc:' + p.col + '"><div class="lbl">' + mdi("pollen") + ' Pollen · ' + p.name + '</div><b>' + (p.top ? esc(p.top) : "Pollen") + '</b><div>' + esc(POLAD[p.l]) + '</div></div>';
}
