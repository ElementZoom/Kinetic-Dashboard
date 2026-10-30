// ================================================================================

const $ = (s, e) => (e || document).querySelector(s);
const $$ = (s, e) => Array.prototype.slice.call((e || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = v => (v == null || isNaN(v)) ? "--" : Number(v).toFixed(1);
const C = a => ({ bg: a[0], glow: a[1], ink: a[2], accent: a[3], heat: a[4], cool: a[5], lit: a[6], nav1: a[7], nav2: a[8] });
const PAL_PRE = {
  Violet: { dark: C(["#141218", "#2e2540", "#e6e0e9", "#d0bcff", "#f2b8b5", "#a8c7fa", "#f9de8e", "#ccc2dc", "#b0a3c9"]), light: C(["#fef7ff", "#e8def8", "#1d1b20", "#6750a4", "#b3261e", "#0b57d0", "#e3a600", "#d0bcff", "#b69df8"]) },
  Blue: { dark: C(["#111318", "#1f2a44", "#e2e2e9", "#a8c7fa", "#f2b8b5", "#7fcfff", "#f9de8e", "#b8c7e8", "#9aaed4"]), light: C(["#f9f9ff", "#d8e2ff", "#1a1b20", "#0b57d0", "#b3261e", "#006c9c", "#e3a600", "#c2d4f7", "#a6bef0"]) },
  Teal: { dark: C(["#0e1514", "#123b38", "#dde4e2", "#80d5cf", "#ffb4a9", "#9ecaff", "#f9de8e", "#b1ccc9", "#8fb0ad"]), light: C(["#f4fbfa", "#cce8e5", "#161d1d", "#006a67", "#ba1a1a", "#1565c0", "#e3a600", "#b4ddd9", "#94c9c4"]) },
  Green: { dark: C(["#10140f", "#1d3a22", "#e0e4db", "#a1d494", "#ffb59e", "#9ecaff", "#f9de8e", "#bbcbb2", "#9cb093"]), light: C(["#f8faf0", "#d5ebc8", "#191d16", "#386a20", "#ba1a1a", "#1565c0", "#e3a600", "#c1e3b2", "#a0ce8d"]) },
  Indigo: { dark: C(["#1b1b1f", "#111e5a", "#e4e1e6", "#bac3ff", "#f2b8b5", "#a8c7fa", "#f9de8e", "#c3c5dd", "#9a9cb3"]), light: C(["#fefbff", "#eeeeff", "#1b1b1f", "#4355b9", "#b3261e", "#0b57d0", "#e3a600", "#dee0ff", "#bac3ff"]) },
  Cyan: { dark: C(["#191c1d", "#0b2a2e", "#e0e3e3", "#4ed8e9", "#f2b8b5", "#a8c7fa", "#f9de8e", "#b1cbcf", "#89a2a6"]), light: C(["#fafdfd", "#c5f8fe", "#191c1d", "#006972", "#b3261e", "#0b57d0", "#e3a600", "#8ff2ff", "#4ed8e9"]) },
  Lime: { dark: C(["#1c1c17", "#26290a", "#e5e2da", "#c1cf4e", "#f2b8b5", "#a8c7fa", "#f9de8e", "#c7c9a7", "#9ea080"]), light: C(["#fefcf8", "#eef4b0", "#1c1c17", "#5a6400", "#b3261e", "#0b57d0", "#e3a600", "#ddec67", "#c1cf4e"]) },
  Amber: { dark: C(["#1f1b16", "#33240a", "#eae1d9", "#ffba38", "#f2b8b5", "#a8c7fa", "#f9de8e", "#dbc3a1", "#b19b7b"]), light: C(["#fffbff", "#ffedd6", "#1f1b16", "#7e5700", "#b3261e", "#0b57d0", "#e3a600", "#ffdeac", "#ffba38"]) },
  Orange: { dark: C(["#201a18", "#401b0b", "#ede0dc", "#ffb59a", "#f2b8b5", "#a8c7fa", "#f9de8e", "#e7beaf", "#bb9588"]), light: C(["#fffbff", "#ffebe7", "#201a18", "#a83900", "#b3261e", "#0b57d0", "#e3a600", "#ffdbcf", "#ffb59a"]) },
  Red: { dark: C(["#201a19", "#480c10", "#ede0de", "#ffb3ac", "#f2b8b5", "#a8c7fa", "#f9de8e", "#e7bdb8", "#bb9591"]), light: C(["#fffbff", "#ffebeb", "#201a19", "#ba1a20", "#b3261e", "#0b57d0", "#e3a600", "#ffdad6", "#ffb3ac"]) },
  Pink: { dark: C(["#201a1b", "#470c22", "#ece0e0", "#ffb2bf", "#f2b8b5", "#a8c7fa", "#f9de8e", "#e4bdc2", "#b9959a"]), light: C(["#fffbff", "#ffeaef", "#201a1b", "#bc004f", "#b3261e", "#0b57d0", "#e3a600", "#ffd9de", "#ffb2bf"]) },
  Brown: { dark: C(["#1c1816", "#3a2c22", "#ebe2db", "#e3bf9a", "#f2b8b5", "#a8c7fa", "#f9de8e", "#d9c3ae", "#ae9884"]), light: C(["#fffbff", "#ffebe7", "#201a18", "#9a4522", "#b3261e", "#0b57d0", "#e3a600", "#ffdbcf", "#ffb59a"]) },
  Ocean: { dark: C(["#191c1e", "#0b2a33", "#e1e3e4", "#61d4ff", "#f2b8b5", "#a8c7fa", "#f9de8e", "#b4cad5", "#8ba1ac"]), light: C(["#fbfcfe", "#dbf3ff", "#191c1e", "#006782", "#b3261e", "#0b57d0", "#e3a600", "#bbe9ff", "#61d4ff"]) },
};
// more presets, made from a hue: s = how colourful (0 = neutral grey)
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); };
const GEN = (h, s, la) => ({ dark: C([hsl(h, 8 * s, 9), hsl(h, 42 * s, 17), hsl(h, 12 * s, 89), hsl(h, 88 * s, 78), "#f2b8b5", "#a8c7fa", "#f9de8e", hsl(h, 28 * s, 78), hsl(h, 22 * s, 64)]), light: C([hsl(h, 100 * s, 98.5), hsl(h, 75 * s, 91), hsl(h, 12 * s, 11), hsl(h, 70 * s, la || 34), "#b3261e", "#0b57d0", "#e3a600", hsl(h, 75 * s, 86), hsl(h, 70 * s, 76)]) });
Object.assign(PAL_PRE, { Magenta: GEN(315, 1), Plum: GEN(290, .8), Lavender: GEN(268, .75), Mint: GEN(152, 1, 27), Sage: GEN(125, .45), Gold: GEN(48, 1, 27), Sand: GEN(38, .5), Rose: GEN(350, .7), Slate: GEN(212, .35), Graphite: GEN(0, 0) });
const PAL_DEF = { mode: "dark", dark: Object.assign({}, PAL_PRE.Violet.dark), light: Object.assign({}, PAL_PRE.Violet.light), temp: ["#ccc2dc", "#a8c7fa", "#9ed6f0", "#b6ddb8", "#f9de8e", "#ffb88c", "#f2a09b"] };
let PAL = JSON.parse(JSON.stringify(PAL_DEF));
let SEASON = null;   // the seasonal theme that is on right now (see 40-seasons.js): its colours replace the palette while it lasts
try {
  const o = JSON.parse(localStorage.getItem("dashPal") || "{}");
  if (o.bg) { const d = {}; Object.keys(PAL_DEF.dark).forEach(k => { if (o[k]) d[k] = o[k]; }); o.dark = d; }
  if (o.mode) PAL.mode = o.mode;
  if (o.from) PAL.from = o.from; if (o.to) PAL.to = o.to;
  Object.assign(PAL.dark, o.dark || {}); Object.assign(PAL.light, o.light || {});
  if (Array.isArray(o.temp) && o.temp.length === 7) PAL.temp = o.temp;
} catch (x) {}
// AUTO follows the device; SUN follows sun.sun in Home Assistant (dark while it is below the horizon); SCHEDULE is dark between two times. The last two do not depend on the tablet's own dark-mode setting.
const palMin = x => { const a = String(x || "").split(":"); return (+a[0] || 0) * 60 + (+a[1] || 0); };
function palMode() {
  if (PAL.mode === "auto") return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  if (PAL.mode === "time") { const d = new Date(), n = d.getHours() * 60 + d.getMinutes(), f = palMin(PAL.from || "18:00"), e = palMin(PAL.to || "06:00"); return (f <= e ? n >= f && n < e : n >= f || n < e) ? "dark" : "light"; }
  if (PAL.mode === "sun") { let sn = null; try { sn = states["sun.sun"]; } catch (_) {}   // (states does not exist yet on the very first paint)
    const dk = sn && sn.state ? sn.state === "below_horizon" : (() => { try { return localStorage.getItem("dashSunDark") !== "0"; } catch (_) { return true; } })(); try { if (sn && sn.state) localStorage.setItem("dashSunDark", dk ? "1" : "0"); } catch (_) {} return dk ? "dark" : "light"; }
  return PAL.mode;
}
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(",");
function applyPal() {
  const m = palMode(), r = document.documentElement, p = (SEASON && SEASON.pal[m]) || PAL[m], v = (k, x) => r.style.setProperty(k, x), c = rgbOf(p.nav1).split(",").map(Number);
  r.setAttribute("data-mode", m); r.style.colorScheme = m; v("--w", m === "light" ? "0,0,0" : "255,255,255");
  v("--bg", p.bg); v("--bg2", p.glow); v("--ink", p.ink); v("--ink-rgb", rgbOf(p.ink)); v("--mint", p.accent); { const ac = rgbOf(p.accent).split(",").map(Number); v("--onmint", (0.299 * ac[0] + 0.587 * ac[1] + 0.114 * ac[2]) / 255 > 0.6 ? "#07241a" : "#ffffff"); } v("--mint-rgb", rgbOf(p.accent));
  v("--heat", p.heat); v("--heat-rgb", rgbOf(p.heat)); v("--cool", p.cool); v("--cool-rgb", rgbOf(p.cool)); v("--lit-rgb", rgbOf(p.lit));
  { const d = PAL.dark; v("--d-bg", d.bg); v("--d-bg2", d.glow); v("--d-ink", d.ink); v("--d-ink-rgb", rgbOf(d.ink)); }   // camera views stay dark in both modes (like iOS / Android media viewers)
  v("--nav1", p.nav1); v("--nav2", p.nav2); v("--navink", (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.55 ? "#06182b" : "#f2f7fb");
}
let STYLE = "default"; try { STYLE = localStorage.getItem("dashStyle") || "default"; } catch (_) {}
const STYLES = [["default", "Kinetic", "The original look: tinted depth, fine outlines"], ["glass", "Liquid Glass", "Apple style: glass navigation over clear cards"], ["material", "Material", "Google style: tonal surfaces from your colour, pill buttons"], ["minimal", "Minimal", "Flat, thin lines, no effects"]];
const applyStyle = () => document.documentElement.setAttribute("data-style", STYLES.some(x => x[0] === STYLE) ? STYLE : "default");
applyStyle();
// page transition: how a page appears when you move between tabs (Theme page; per device, config pageTransition sets the default)
const PGFXS = [["rise", "RISE", "Fade, then the cards rise in (default)"], ["slide", "SLIDE", "Pages slide in the direction you moved"], ["fade", "FADE", "A plain, quick fade"], ["off", "OFF", "No animation between pages"]];
let PGFX = "rise"; try { PGFX = localStorage.getItem("dashPgFx") || CONFIG.pageTransition || "rise"; } catch (_) {}
const applyPgFx = () => document.documentElement.setAttribute("data-pgfx", PGFXS.some(x => x[0] === PGFX) ? PGFX : "rise");
applyPgFx();
let FONT = "jakarta"; try { FONT = localStorage.getItem("dashFont") || "jakarta"; } catch (_) {}
const FONTS = [["jakarta", "Plus Jakarta Sans", "Modern, friendly", '"Plus Jakarta Sans",Inter,system-ui,sans-serif'], ["google", "Google (Roboto Flex)", "Clean, Android feel", '"Roboto Flex",Roboto,system-ui,sans-serif'], ["googlemono", "Google + mono labels", "Roboto Flex with Roboto Mono labels", '"Roboto Flex",Roboto,system-ui,sans-serif'], ["outfit", "Outfit", "Geometric, rounded", '"Outfit",Inter,system-ui,sans-serif'], ["manrope", "Manrope", "Soft and neutral", '"Manrope",Inter,system-ui,sans-serif'], ["default", "Classic", "Your previous look", 'Inter,"Segoe UI",Roboto,system-ui,sans-serif']];
const applyFont = () => document.documentElement.setAttribute("data-font", FONTS.some(x => x[0] === FONT) ? FONT : "jakarta");
applyFont();
// 12- or 24-hour times: Theme page -> "Clock" (this device), else config.js clock: "12" | "24", else "auto" (the device's language decides)
let CLOCK = ""; try { CLOCK = localStorage.getItem("dashClock") || ""; } catch (_) {}
if (!/^(auto|12|24)$/.test(CLOCK)) CLOCK = /^(12|24)$/.test(String(CONFIG.clock)) ? String(CONFIG.clock) : "auto";
const CLK12 = () => CLOCK === "12" || (CLOCK !== "24" && !!new Intl.DateTimeFormat([], { hour: "numeric" }).resolvedOptions().hour12);
const tmo = o => Object.assign(o, CLK12() ? { hour12: true } : { hourCycle: "h23" });   // add to the options of any toLocale*String that shows an hour
applyPal();
let PAL_SEEN = palMode(); const palTick = () => { if (PAL.mode !== "sun" && PAL.mode !== "time") return; const m = palMode(); if (m !== PAL_SEEN) { PAL_SEEN = m; themeFx(applyPal); if (curPg() === "theme") drawPalette(); } };
setInterval(palTick, 20000); document.addEventListener("visibilitychange", () => { if (!document.hidden) palTick(); });
try { const mq0 = window.matchMedia("(prefers-color-scheme: light)"); mq0.addEventListener("change", () => { if (PAL.mode === "auto") themeFx(applyPal); }); } catch (x) {}
const onHome = () => !/^#(climate|events|rooms|security|weather|energy|irrigation|scenes|media|theme|vehicle|hazards|view|camera)/.test(location.hash);
const onView = () => /^#(view|camera)/.test(location.hash);
const onSec = () => location.hash === "#security";
const camPage = () => onHome() || onSec() || onView();
const VWC = [], NPC = [];   // NPC = the live cameras inside the notifications pop-up
const camList = () => onView() ? VWC : onSec() ? CONFIG.security : CONFIG.cameras;

// A sideways-scrolling row (tabs, scene pictures) wrapped with hsw(): while more of it is hidden past an edge, that edge fades and a chevron nudges toward it.
const hsw = h => '<div class="hsw">' + h + '<span class="hsm l" aria-hidden="true">' + mdi("chevron-left") + '</span><span class="hsm r" aria-hidden="true">' + mdi("chevron-right") + '</span></div>';
/* the arrows sit level with the visible row, not the middle of the wrapper (tab rows carry extra padding for their shadow, so those two differ) */
function hsMid(w, s) { const k = Array.prototype.filter.call(s.children, c => c.offsetHeight); if (!k.length) return; let a = 1e9, b = -1e9; k.forEach(c => { const r = c.getBoundingClientRect(); if (r.top < a) a = r.top; if (r.bottom > b) b = r.bottom; }); w.style.setProperty("--hsy", Math.round(((a + b) / 2 - w.getBoundingClientRect().top) * 10) / 10 + "px"); }
function hsUpd(w) { const s = w.firstElementChild; if (!s) return; hsMid(w, s); const o = s.scrollWidth > s.clientWidth + 4; w.classList.toggle("more", o && s.scrollLeft + s.clientWidth < s.scrollWidth - 4); w.classList.toggle("moreL", o && s.scrollLeft > 4); }
const hsRO = typeof ResizeObserver === "function" ? new ResizeObserver(es => es.forEach(e => { const w = e.target.closest(".hsw"); if (w) hsUpd(w); })) : null, hsSeen = new WeakSet();
const hsObs = w => { if (!hsRO || hsSeen.has(w)) return; hsSeen.add(w); const s = w.firstElementChild; if (!s) return; hsRO.observe(s); Array.prototype.forEach.call(s.children, c => hsRO.observe(c)); };   // a row that was laid out while hidden or still sliding in gets its edge arrows as soon as it has a size
const hsAll = () => $$(".hsw").forEach(w => { hsObs(w); hsUpd(w); });
{ let t = 0; const q = () => { clearTimeout(t); t = setTimeout(hsAll, 120); };
  document.addEventListener("scroll", e => { const w = e.target.parentNode; if (w && w.classList && w.classList.contains("hsw")) hsUpd(w); }, true);
  new MutationObserver(q).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", q); }
