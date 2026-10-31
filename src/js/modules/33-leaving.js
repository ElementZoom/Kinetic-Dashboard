// ---------- Leaving: what is still on or open before you go ----------
// The card on Home (it took the place of the old Attention card; Attention lives on in Notifications) lists lights left on, the garage door, open doors and a disarmed alarm. Tap it for the list, with Lights off and Arm away.
// Config: leaving: false | { lights: true, garage: true, doors: true, alarm: true, lightEntities: [], ignore: ["light.hall_lamp"] } (see config.example.js). Lights default to the lights of the rooms on the Rooms page.
const lvCfg = () => { const a = CONFIG.leaving; return a === false ? null : Object.assign({ lights: true, garage: true, doors: true, alarm: true, lightEntities: [], ignore: [] }, a || {}); };
const LV = { t: null, q: 0, open: false };
const lvRx = c => [].concat(c.ignore || []).map(x => { try { return new RegExp(x); } catch (e) { return null; } }).filter(Boolean);
function lvLights() {
  const c = lvCfg(); if (!c) return [];
  const src = c.lightEntities && c.lightEntities.length ? c.lightEntities : HOUSE().reduce((a, r) => a.concat(r.lights || [], r.lightSwitches || []), []), rx = lvRx(c);
  return members(src).filter(id => /^(light|switch)\./.test(id) && states[id] && !entHidden(id) && !rx.some(r => r.test(id)));
}
const lvGarage = () => Object.keys(galCfg()).map(k => (galCfg()[k] || {}).sensor).filter(Boolean);
function lvSet() { const c = lvCfg(), s = new Set(); if (!c) return s; lvLights().forEach(x => s.add(x)); lvGarage().forEach(x => s.add(x)); const g = E("doorsGroup"); if (g) { s.add(g); members(g).forEach(x => s.add(x)); } if (CONFIG.alarm) s.add(CONFIG.alarm); return s; }
const lvRel = id => (LV.t || (LV.t = lvSet())).has(id);   // a state change that can alter the card
const lvNames = ids => ids.slice(0, 2).map(fname).join(", ") + (ids.length > 2 ? " +" + (ids.length - 2) : "");
function lvItems() {
  const c = lvCfg(), out = []; if (!c) return out;
  if (c.lights) { const on = lvLights().filter(isOn); if (on.length) out.push({ k: "lights", icon: "lightbulb-on", t: on.length + (on.length > 1 ? " lights on" : " light on"), sub: lvNames(on), s: on.length + (on.length > 1 ? " lights" : " light"), ids: on }); }
  if (c.garage) { const sn = lvGarage().filter(x => isOn(x))[0]; if (sn) { const ms = Date.now() - (Date.parse(states[sn].last_changed || "") || Date.now()); out.push({ k: "garage", icon: "garage-open-variant", t: "Garage door open", sub: ms > 6e4 ? "For " + attnAgo(ms) : "", s: "garage" }); } }
  if (c.doors) { const d = doorsOpen(); if (d) out.push({ k: "doors", icon: "door-open", t: d.length > 1 ? d.length + " doors open" : d.length ? fname(d[0]) + " open" : "A door is open", sub: d.length > 1 ? lvNames(d) : "", s: d.length > 1 ? d.length + " doors" : d.length ? fname(d[0]).toLowerCase() : "a door" }); }
  const al = CONFIG.alarm && states[CONFIG.alarm];
  if (c.alarm && al && al.state === "disarmed") out.push({ k: "alarm", icon: "shield-off", t: "Alarm not armed", sub: "", s: "alarm off" });
  return out;
}
function lvCard() {
  const el = $("#lvc"); if (!el) return; const it = lvItems(), on = it.length > 0;
  const h = on ? '<span class="at-h" title="Before you leave">' + mdi("door-open") + '</span><span class="at-l"><span class="at-x">Leaving? <small>' + esc(it.map(x => x.s).join(", ")) + '</small></span></span><span class="at-c">' + mdi("chevron-right") + '</span>' : "";
  if (el._h !== h) { el._h = h; el.innerHTML = h; } el.hidden = !on; hsFit();
  if (LV.open) { if (on) lvDraw(it); else lvClose(); }
}
function lvQ() { if (!LV.q) LV.q = requestAnimationFrame(() => { LV.q = 0; lvCard(); }); }
function lvDraw(it) {
  const b = $("#lvbody"); if (!b) return;
  const row = x => '<div class="nrow warn at-r"><span class="at-i">' + mdi(x.icon) + '</span><span class="nbn"><b>' + esc(x.t) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : "") + '</span></div>';
  const lt = it.filter(x => x.k === "lights")[0], al = it.filter(x => x.k === "alarm")[0];
  const h = '<div class="lbl lvh"><span>' + mdi("door-open") + 'Before you leave</span><button class="rnd lvx" data-lv="close" aria-label="Close">' + mdi("close") + '</button></div>' + it.map(row).join("") +
    '<div class="lvb2">' + (lt ? '<button class="eb" data-lv="off">LIGHTS OFF</button>' : "") + (al ? '<button class="eb" data-lv="arm">ARM AWAY</button>' : "") + '</div>';
  if (b._h !== h) { b._h = h; b.innerHTML = h; }
}
function lvOpen() { const it = lvItems(); if (!it.length) return; LV.open = true; lvDraw(it); document.body.classList.add("lv-open"); }
function lvClose() { LV.open = false; document.body.classList.remove("lv-open"); }
$("#lvc").onclick = lvOpen;
$("#lvsheet").onclick = e => {
  const b = e.target.closest("[data-lv]"), k = b ? b.dataset.lv : (e.target.classList.contains("lvbk") ? "close" : ""); if (!k) return;
  if (k === "close") lvClose();
  else if (k === "off") lvItems().filter(x => x.k === "lights").forEach(x => x.ids.forEach(id => call(id.split(".")[0], "turn_off", id)));
  else if (k === "arm") alarmDo("arm_away");
};
addEventListener("keydown", e => { if (e.key === "Escape" && LV.open) lvClose(); });
setInterval(() => { LV.t = null; lvQ(); }, 60000);   // "for 12 min" needs a clock, and the room list may have changed
