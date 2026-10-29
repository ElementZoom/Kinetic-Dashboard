// ---------- values the dashboard works out itself (instead of template sensors / count groups in HA) ----------
const avgOf = ids => { const v = ids.map(x => parseFloat(rawSv(x))).filter(x => !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const fx = v => v == null ? null : v.toFixed(1);
// Low batteries: Battery Notes makes one "Battery+" sensor per device (sensor.<device>_battery_plus). The Notifications pop-up and the low-battery count both read these, listing any below derived.batteryBelow (%, 61 if not set)
const lowBattChip = () => { const th = CONFIG.derived.batteryAlertBelow != null ? +CONFIG.derived.batteryAlertBelow : 20; return th > 0 ? lowBatt().filter(k => parseFloat(states[k].state) < th) : []; };   // strip chip: only the really low ones (default under 20 %), the Attention tab lists every battery under attention.batteryBelow (default 26 %)
const lowBatt = () => { const th = CONFIG.derived.batteryBelow != null ? +CONFIG.derived.batteryBelow : 61; return Object.keys(states).filter(k => /^sensor\..*battery_plus$/.test(k) && parseFloat(states[k].state) < th).sort((x, y) => states[x].state - states[y].state); };
const wLevel = () => {   // 0 = no restriction, 1-4 = level, -1 = unknown. input_select.water_restriction_level first (options "No Water Restriction", "Water Level 1".."Water Level 4"); the older input_boolean.no_water_restriction / water_level_1..4 helpers still work
  const s = states["input_select.water_restriction_level"];
  if (s) { const m = /^Water Level (\d)$/.exec(s.state); return m ? +m[1] : (s.state === "No Water Restriction" ? 0 : -1); }
  const on = x => states["input_boolean." + x] && states["input_boolean." + x].state === "on"; for (let i = 4; i >= 1; i--) if (on("water_level_" + i)) return i; return on("no_water_restriction") ? 0 : -1;
};
const VIRT = {
  "sensor.house_average_temperature": () => fx(avgOf(CONFIG.derived.houseTemps)),
  "sensor.mbr_curtain_action": () => { const c = (CONFIG.entities.mbrCurtains || []).map(x => states[x] && states[x].state); return c.some(x => x === "open" || x === "opening") ? "Close Curtains" : c.length && c.every(x => x === "closed") ? "Open Curtains" : "Curtains"; },
  "sensor.laundry_time_remaining_friendly": () => { const sec = parseInt(rawSv(E("laundryRemaining"))) || 0; if (!sec) return "Done"; const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? h + "h " + m + "m" : m + "m"; },
  "sensor.current_water_restriction": () => { const l = wLevel(); return l === 0 ? "No Water Restriction" : l > 0 ? "Water Level " + l : "Unknown"; },
  "sensor.current_water_restriction_description": () => { const l = wLevel(), t = CONFIG.waterRestrictionText || {}; return l === 0 ? (t[0] || "Use water sensibly.") : l > 0 ? (t[l] || rawSv("input_text.water_restrictions_level_" + l) || "") : "Unknown"; },   // wording from config.js waterRestrictionText, else the older input_text helpers
  "sensor.low_battery_count": () => lowBatt().length
};
Object.keys(CONFIG.derived.soil).forEach(z => { VIRT["sensor.average_" + z + "_soil_moisture"] = () => fx(avgOf(CONFIG.derived.soil[z].moisture)); VIRT["sensor.average_" + z + "_soil_temperature"] = () => fx(avgOf(CONFIG.derived.soil[z].temp)); });
// dashboard knows which entities feed the room badges / house average, so it refreshes when they change
const DEP = {};
function buildDep() { CONFIG.house.forEach(r => ["lights", "doors", "windows", "covers", "fans"].forEach(k => members(r[k]).forEach(x => { DEP[x] = 1; }))); CONFIG.derived.houseTemps.forEach(x => { DEP[x] = 1; }); }

const title = v => String(v || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
function drawAlarm() {
  const s = states[CONFIG.alarm]; if (!s) return;
  const m = ALS[s.state] || [String(s.state).toUpperCase(), ""], f = s.attributes.supported_features || 0, c = "s-" + (m[1] || "x");
  $("#al").innerHTML = mdi(ALI[s.state] || "shield-outline") + '<span class="at"> ' + m[0] + '</span>'; $("#al").className = "al " + c; $("#al").title = m[0];
  const p = $("#alp"); if (!p || !onSec()) return;
  const arm = [[1, "arm_home", "HOME"], [2, "arm_away", "AWAY"], [4, "arm_night", "NIGHT"]].filter(x => (f & x[0]) || (!f && x[1] === "arm_away"));
  p.innerHTML = '<div class="lbl">Alarm</div><div class="astate ' + c + '">' + m[0] + '</div><div class="chips">' +
    (s.state === "disarmed" ? arm.map(x => '<button class="chip ag" data-ag="ok" data-m="' + x[1] + '">ARM ' + x[2] + '</button>').join("") : '<button class="chip on ag" data-ag="' + ({ arming: "wn", disarming: "wn", pending: "wn", triggered: "al" }[s.state] || "on") + '" data-m="disarm">DISARM</button>') +
    '</div><div class="tg3" style="margin-top:12px">' + CONFIG.alarmTiles.map(tileHtml).join("") + '</div>';
  updTiles();
}
function alarmDo(m) {
  const s = states[CONFIG.alarm], a = s ? s.attributes : {}, d = {};
  if (a.code_format && (m === "disarm" || a.code_arm_required !== false)) {
    if (a.code_format === "number") { kpOpen(m); return; }
    const c = prompt("Alarm code"); if (c == null) return; d.code = c;
  }
  call("alarm_control_panel", "alarm_" + m, CONFIG.alarm, d);
}
let kp = null;
// links from notifications: #disarm or #arm/away|home|night opens the keypad (or arms/disarms straight away if no code is needed)
function alarmLink(m) {
  let n = 0; const t = setInterval(() => {
    const s = states[CONFIG.alarm]; if (!s && ++n < 120) return;   // wait up to 30s for Home Assistant to answer
    clearInterval(t);
    if (s) alarmDo(m);
    try { history.replaceState(null, "", "#home"); } catch (_) {}
  }, 250);
}
const popOut = el => { if (el.style.display === "none" || el.classList.contains("out")) return; el.classList.add("out"); setTimeout(() => { el.style.display = "none"; el.classList.remove("out"); }, 200); };
function kpOpen(m) { kp = { m: m, v: "" }; const e = $("#kp"); e.classList.remove("out"); e.classList.add("opening"); e.style.display = "flex"; kpDraw(); setTimeout(() => e.classList.remove("opening"), 350); }
function kpClose() { kp = null; popOut($("#kp")); }
function kpOk() { if (!kp || !kp.v) return; call("alarm_control_panel", "alarm_" + kp.m, CONFIG.alarm, { code: kp.v }); kpClose(); }
const dots = n => { let o = ""; for (let i = 0; i < n; i++) o += '<i class="' + (i < kp.v.length ? "f" : "") + '"></i>'; return o; };
function kpDraw() {
  const t = { arm_away: "Arm away", arm_home: "Arm home", arm_night: "Arm night", disarm: "Disarm" }[kp.m] || kp.m, n = Math.max(4, kp.v.length);
  let b = ""; for (let i = 1; i < 10; i++) b += '<button data-k="' + i + '">' + i + '</button>';
  $("#kp").innerHTML = '<div class="kpb"><div class="lbl">' + mdi("shield-lock") + ' ' + t + '</div><div class="kpd">' + dots(n)+ '</div><div class="kpg">' + b +
    '<button data-k="bk" aria-label="Delete">' + mdi("backspace-outline") + '</button><button data-k="0">0</button><button data-k="ok" class="ok" aria-label="Confirm">' + mdi("check") + '</button></div><button class="eb kpc" data-k="x">CANCEL</button></div>';
}
function kpKey(k) {
  if (!kp) return;
  if (k === "x") kpClose(); else if (k === "ok") kpOk(); else if (k === "bk") kp.v = kp.v.slice(0, -1); else if (kp.v.length < 12) kp.v += k;
  if (kp) kpDraw();
}
document.addEventListener("keydown", e => { if (!kp) return; if (/^\d$/.test(e.key)) kpKey(e.key); else if (e.key === "Backspace") kpKey("bk"); else if (e.key === "Enter") kpKey("ok"); else if (e.key === "Escape") kpKey("x"); });
$("#kp").onclick = e => { const b = e.target.closest("[data-k]"); if (b) kpKey(b.dataset.k); else if (e.target.id === "kp") kpClose(); };
$("#alp").onclick = e => { const b = e.target.closest("[data-m]"); if (b) alarmDo(b.dataset.m); else tapH(e); };
$("#al").onclick = () => { location.hash = "#security"; };

