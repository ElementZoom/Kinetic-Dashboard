window.onerror = function (m, u, l) { if (/ResizeObserver loop/i.test(String(m))) return true; /* harmless browser notice, not a fault */ document.documentElement.classList.remove("boot"); var s = document.getElementById("st"); s.className = "bad"; s.textContent = "JS ERROR: " + m + " (line " + l + ")"; };

// ===== CONFIG: lives in config.js (one per house). The engine only fills in safe defaults. =====
const ENGINE_VERSION = window.DASH_VER;
const CONFIG = (() => {
  const u = window.DASH_CONFIG;
  if (!u || typeof u !== "object") {
    document.body.innerHTML = '<div style="font:16px/1.5 system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:24px;color:#e6e0e9"><h2 style="margin:0 0 8px">Dashboard config not found</h2>This page needs <b>config.js</b> in the same folder as dash.html, loaded with <code>&lt;script src="config.js"&gt;</code> before the dashboard script. If you just updated, hard-refresh and bump <code>?v=</code>.</div>';
    throw new Error("config.js missing (window.DASH_CONFIG is not set)");
  }
  const d = { url: location.origin, token: "", name: "", noNameUsers: [], tariff: null, hapticMs: 35, haptics: true, mobileLive: true, layout: { tablet: ["status", "cams", "rooms", "heatpump", "forecast"], mobile: ["status", "nowplaying", "heatpump", "forecast"] }, icons: {}, settingsPath: "/config/dashboard", weatherFx: { speed: 0.5 }, mobileNav: "drawer", tileStyle: "line", calNames: {}, outside: "", weather: "weather.home", calendars: [], cameras: [], security: [], camControls: {}, view: {}, indoor: "", derived: { houseTemps: [], soil: {}, groups: {} }, lyricsFrom: [], media: [], playback: {}, alarm: "", alarmTiles: [], rainSkipMm: 2, irrigation: [], scenes: { groups: [], ri: [], rc: [], preset: [], gradient: [], rooms: [], lights: [] }, rooms: [], countIfNotOff: [], roomsByPresence: true, roomTabs: [], tiles: [], house: [], users: {} };
  d.entities = {}; d.volcanoes = []; d.siren = {}; d.alerts = []; d.quickAll = []; d.adminToggles = []; d.relevance = {}; d.vehicle = d.vehicle || null; d.batteryDisplay = "kiosk";
  return Object.assign(d, u);
})();
let RU = null;   // the signed-in person's restrictions (CONFIG.users[<person id or HA name>]), or null = unrestricted
const PAGE_ON = p => (!Array.isArray(CONFIG.pages) || CONFIG.pages.indexOf(p) > -1) && (!RU || !Array.isArray(RU.pages) || RU.pages.indexOf(p) > -1);   // CONFIG.pages = list of page ids to show; leave out = all pages
const E = k => (CONFIG.entities && CONFIG.entities[k]) || "unset." + k;   // named entity slots from config.js; a missing slot points at a nonexistent entity so that feature simply stays hidden
const rxj = (base, extra) => new RegExp(base.source + (extra ? "|" + extra : ""));
const ruSec = k => !(RU && RU.security && RU.security[k] === false);   // Security page parts a restricted person may use (alarm, detections, controls, playback)
const camCtl = id => ruSec("controls") ? CONFIG.camControls[id] : null;
const RU_ALL = ["home", "rooms", "climate", "security", "weather", "energy", "irrigation", "scenes", "media", "events", "vehicle", "hazards", "theme"];
const RU_NAME = { home: "Home", rooms: "Rooms", climate: "Climate", security: "Security", weather: "Weather", energy: "Energy", irrigation: "Irrigation", scenes: "Scenes", media: "Media", events: "Events", vehicle: "Vehicle", hazards: "Hazards", theme: "Theme" };
const RU_SEC = [["alarm", "Alarm"], ["controls", "Camera controls"], ["playback", "Playback"], ["detections", "Detections"]];
let ME = { id: "", name: "", pid: "", admin: false };   // the signed-in Home Assistant user
// Who may see what is kept in ONE Home Assistant helper (entities.access, an input_text, 255 characters): "<first 8 characters of the user id>=<hex bit mask>", joined by commas.
// Bits 0-12 = pages (RU_ALL order), bits 13-16 = Security parts (RU_SEC order). A person with an entry is restricted to what is switched on; a person without one is not (unless config.js has a rule for them).
function accDecode(str) { const m = {}; String(str || "").split(",").forEach(x => { const q = x.split("="), n = parseInt(q[1], 16); if (q[0] && q[0].length >= 4 && n >= 0) m[q[0]] = n; }); return m; }
function accEncode(m) { return Object.keys(m).map(k => k + "=" + m[k].toString(16)).join(","); }
const accBit = (n, k) => Math.floor(n / Math.pow(2, k)) % 2 === 1;   // bits 17.. = rooms that are HIDDEN from this person (so an entry from before rooms existed still shows every room)
const accRooms = () => CONFIG.house.slice(0, 14);
function accObj(n) { const hid = accRooms().some((r, k) => accBit(n, 17 + k)), o = { dyn: true, pages: RU_ALL.filter((p, i) => n & (1 << i)), security: RU_SEC.reduce((o, x, j) => { if (!(n & (1 << (13 + j)))) o[x[0]] = false; return o; }, {}) }; if (hid) o.rooms = CONFIG.house.filter((r, k) => k > 13 || !accBit(n, 17 + k)).map(r => r.id); return o; }
const accMap = () => accDecode((states[E("access")] || {}).state);
function ruFind(nm, pid) { const U = CONFIG.users || {}; nm = String(nm || "").toLowerCase(); pid = String(pid || "").toLowerCase(); return Object.keys(U).filter(k => [nm, pid].indexOf(k.toLowerCase()) > -1 && nm + pid)[0] || ""; }
function ruResolve() {   // this person's restrictions: an admin is never restricted; then the helper; then a rule in config.js
  if (ME.admin) return null;
  const n = ME.id ? accMap()[ME.id.slice(0, 8)] : undefined; if (n != null) return accObj(n);
  const k = ruFind(ME.name, ME.pid); return k ? CONFIG.users[k] : null;
}
function ruApply(o) {   // hides what this person may not use; the engine also sends them to their landing page when they open a hidden one
  RU = o || null;
  const b = document.body, off = RU_ALL.filter(p => !PAGE_ON(p)), left = RU_ALL.length - off.length;
  let st = document.getElementById("rustyle"); if (!st) { st = document.createElement("style"); st.id = "rustyle"; document.head.appendChild(st); }
  let css = "";
  if (RU) {
    off.forEach(p => { css += 'nav a[href="#' + p + '"],#btab a[href="#' + p + '"],#mshe a[href="#' + p + '"]{display:none!important}'; });
    css += "#navset,#navset2,#outs,#hnp{display:none!important}#hc{pointer-events:none}#nacc{display:none!important}";   // no Settings link, no notification pop-up (it holds the "all off" switches and admin toggles)
    if (!PAGE_ON("security") || !ruSec("alarm")) css += "#al{display:none!important}";
    if (!["climate", "weather", "energy", "irrigation", "media", "events", "vehicle", "hazards", "theme"].some(PAGE_ON)) css += "#bmore{display:none!important}";
    if (off.indexOf("media") > -1) css += "#npmini,#npfab,#npsheet{display:none!important}";
    if (left <= 1 || RU.header === false) css += "#hb{display:none!important}";
    if (!ruSec("alarm")) css += "#alp{display:none!important}";
    if (!ruSec("playback")) css += ".px,.pbk{display:none!important}";
    if (!ruSec("controls")) css += ".snd,.mic{display:none!important}";   // sound and talk-back buttons go with the camera control tiles
  }
  st.textContent = css; b.classList.toggle("ru", !!RU); b.classList.toggle("ru1", !!RU && left <= 1);
  try { localStorage.setItem("dashRuO", RU ? JSON.stringify(RU) : "-"); } catch (_) {}
}
function ruRefresh() { if (!identDone) return; const o = ruResolve(); if (JSON.stringify(o) !== JSON.stringify(RU)) { ruApply(o); route(); if (curPg() === "theme") drawPalette(); } else ruApply(o); }
let userName = "", userKnown = false; try { const c = localStorage.getItem("dashUser"); if (c != null) { userKnown = true; userName = c === "-" ? "" : c; } } catch (_) {}
try { const k = localStorage.getItem("dashRuO"); if (k && k !== "-") ruApply(JSON.parse(k)); } catch (_) {}
