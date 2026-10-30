// ---------- Attention: things worth acting on ----------
// Notifications > ATTENTION lists the bins, dry soil, devices that have been offline for a while, updates waiting and low batteries. Alerts keeps the urgent things (leak, warnings, doors).
// Config: attention: false | { offline: true, offlineMinutes: 10, updates: true, soil: true, soilBelow: 25, batteries: true, batteryBelow: 26, ignore: ["light.hall_lamp"], watch: ["binary_sensor.x"] } (see config.example.js)
const attnCfg = () => { const a = CONFIG.attention; return a === false ? null : Object.assign({ offline: true, offlineMinutes: 10, updates: true, soil: true, soilBelow: 25, batteries: true, batteryBelow: 26, ignore: [], watch: [] }, a || {}); };
const ATD = /^(light|switch|cover|lock|climate|camera|fan|siren|alarm_control_panel|vacuum)\./;   // what counts as a device that can be "offline" (sensors and media players come and go too often); add more with watch
const ATU = new Set();   // ids that were unavailable at their last change, so the redraw also fires when they come back
function attnRel(id) {   // a state change that can alter the Attention list (the list redraws only for these)
  if (/^update\./.test(id) || /^sensor\.average_.*_soil_moisture$/.test(id)) return true;
  const c = attnCfg(); if (!c || !c.offline || !(ATD.test(id) || (c.watch || []).includes(id))) return false;
  const u = !!states[id] && states[id].state === "unavailable", was = ATU.has(id); if (u) ATU.add(id); else ATU.delete(id); return u || was;
}
const attnAgo = ms => ms < 36e5 ? Math.max(1, Math.round(ms / 6e4)) + " min" : ms < 864e5 ? Math.round(ms / 36e5) + " h" : Math.round(ms / 864e5) + " d";
function attnItems() {
  const c = attnCfg(), out = []; if (!c) return out;
  if (binsCfg() && binsDue().length) { const due = binsDue().map(x => x[1]), o = binsOut(), e = binsEvening(); out.push({ k: "bins", icon: "recycle", t: o ? "Bins are out" : e ? "Bins out tonight" : "Bring the bins out", sub: due.join(", ") }); }
  if (c.soil) Object.keys(CONFIG.derived.soil || {}).sort((a, b) => parseFloat(sv("sensor.average_" + a + "_soil_moisture")) - parseFloat(sv("sensor.average_" + b + "_soil_moisture"))).forEach(z => { const m = parseFloat(sv("sensor.average_" + z + "_soil_moisture")); if (m < (+c.soilBelow || 25)) out.push({ k: "soil", icon: "water-percent", t: title(z) + " soil", sub: (m < 15 ? "Very dry" : m < 25 ? "Dry" : "Moist") + " · " + f1(m) + "%", tone: m < 15 ? "bad" : m < 25 ? "warn" : "", m: m, z: title(z) }); });
  if (c.offline) {
    const rx = [].concat(c.ignore || []).map(x => { try { return new RegExp(x); } catch (e) { return null; } }).filter(Boolean), min = (+c.offlineMinutes || 0) * 6e4, now = Date.now(), w = c.watch || [];
    Object.keys(states).filter(id => states[id].state === "unavailable" && (ATD.test(id) || w.includes(id)) && !rx.some(r => r.test(id))).sort().forEach(id => { const ms = now - (Date.parse(states[id].last_changed || "") || now); if (ms >= min) out.push({ k: "off", icon: "access-point-network", t: fname(id), sub: "Offline for " + attnAgo(ms), tone: "warn" }); });
  }
  if (c.updates) Object.keys(states).filter(id => /^update\./.test(id) && states[id].state === "on").sort().forEach(id => { const a = states[id].attributes || {}; out.push({ k: "upd", icon: "autorenew", t: a.title || a.friendly_name || fname(id), sub: a.in_progress ? "Installing…" : (a.installed_version ? a.installed_version + " → " : "") + (a.latest_version || "new version") }); });
  if (c.batteries) { const th = +c.batteryBelow || 26; Object.keys(states).filter(k => /^sensor\..*battery_plus$/.test(k) && parseFloat(states[k].state) < th).sort((x, y) => parseFloat(states[x].state) - parseFloat(states[y].state)).forEach(k => { const v = Math.round(parseFloat(states[k].state)); out.push({ k: "bat", icon: "battery-low", t: fname(k).replace(/\s+battery(\s+plus|\+)$/i, ""), sub: v + "%", tone: v <= 15 ? "bad" : "warn" }); }); }   // Battery Notes "Battery+" sensors under 26 %
  return out;
}
function attnHtml(it) {
  if (!it.length) return "";
  const head = (ic, t, n) => '<div class="lbl np2 il">' + mdi(ic) + t + (n ? " · " + n : "") + '</div>', row = x => '<div class="nrow ' + (x.tone || "") + ' at-r"' + "" + '><span class="at-i">' + mdi(x.icon) + '</span><span class="nbn"><b>' + esc(x.t) + '</b><small>' + esc(x.sub) + '</small></span>' + '</div>';
  const by = k => it.filter(x => x.k === k); let h = "";
  if (by("bins").length) h += head("recycle", "Bins") + binsCard();   // 32-bins-card.js
  const so = by("soil"); if (so.length) h += head("water-percent", "Chores") + '<div class="wg">' + so.map(x => '<div class="ws"><span class="lbl">' + x.z + ' soil</span><b style="color:var(' + (x.m < 15 ? "--sd0" : x.m < 25 ? "--sd1" : "--sd2") + ')">' + (x.m < 15 ? "Very dry" : x.m < 25 ? "Dry" : "Moist") + '</b>' + f1(x.m) + '%</div>').join("") + '</div>';
  const of = by("off"); if (of.length) h += head("access-point-network", "Offline", of.length) + of.slice(0, 8).map(row).join("") + (of.length > 8 ? '<div class="lbl at-more">+' + (of.length - 8) + ' more</div>' : "");
  const up = by("upd"); if (up.length) h += head("autorenew", "Updates", up.length) + up.map(row).join("");
  const ba = by("bat"); if (ba.length) h += head("battery-low", "Batteries", ba.length) + ba.map(row).join("");
  return h;
}
setInterval(() => queueNotif(), 60000);   // "offline for N min" needs a clock, not only state changes
