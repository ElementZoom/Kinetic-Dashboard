// ---------- notifications popup ----------
const fname = id => (states[id] && states[id].attributes.friendly_name) || id.split(".")[1].replace(/_/g, " ");
const NREL = rxj(/(^group\.|^timer\.|battery)/, (CONFIG.relevance || {}).notif);
const TOG = CONFIG.adminToggles || [];   // [label, virtual sensor id, icon, [[entity, name, script?], ...]]
TOG.forEach(g => { VIRT[g[1]] = () => g[3].filter(x => states[x[0]] && states[x[0]].state === "off").length; });
// tiles in the pop-up: the timer that belongs to an entity (config tileTimers, the irrigation zone's timer, or timer.<name> / timer.<name>_timer) and, for taps, the zone's flow sensor
const tapZone = e => (CONFIG.irrigation || []).find(z => z.switch === e);
const tileTimer = e => { const m = (CONFIG.tileTimers || {})[e]; if (m) return m; const z = tapZone(e); if (z && z.timer) return z.timer; const o = e.split(".")[1]; return ["timer." + o, "timer." + o + "_timer"].find(t => states[t]) || ""; };
const npItem = (e, o) => { const z = tapZone(e), tap = /^switch\..*water_tap$/.test(e); return Object.assign({ entity: e, timer: tileTimer(e) }, tap ? { water: (z && z.flow) || true } : {}, o || {}); };
const gar = x => /garage/i.test(x + " " + fname(x)) || Object.keys(galCfg()).some(k => (galCfg()[k] || {}).sensor === x);   // the garage door has its own alert, so it is not listed with the doors
// open doors from the external-doors group (garage excluded): a list of ids, [] when the group says "on" but cannot say which one, or null when all are shut
const doorsOpen = () => { const g = E("doorsGroup"), d0 = members(g).filter(x => x !== g && isOn(x)), d = d0.filter(x => !gar(x)); return d.length || (isOn(g) && !d0.length) ? d : null; };
function notif(full) {
  let n = 0, h = "", bh = "", nb = 0, hasB = false;
  const sec = (t, b) => { if (full && b) h += '<div class="lbl np2">' + t + '</div>' + b; };
  const grid = a => a.length ? '<div class="tg3">' + a.map(tileHtml).join("") + '</div>' : "";
  const al = volcHtml().concat(quakeHtml() || []), pa = polAlert(); if (pa) al.push(pa); n += al.length; sec("Alerts", al.join(""));
  const dr = doorsOpen();
  if (dr) { n++; sec("Doors", '<div class="alert q"><b>' + (dr.length || 1) + ' open</b><div>' + dr.map(x => esc(fname(x))).join(" · ") + '</div></div>'); }
  const LK = LEAKS().filter(x => isOn(x[0])), W2 = (CONFIG.alerts || []).filter(x => isOn(x[0]));   // leak sensors first, as red cards
  n += LK.length + W2.length; sec("Warnings", LK.map(x => '<div class="alert q"><div class="lbl">' + mdi("water-alert") + ' WATER LEAK</div><b>' + esc(x[1]) + '</b><div>' + esc(x[2]) + '</div></div>').join("") + grid(W2.map(x => npItem(x[0], { name: x[1], sub: x[2], confirm: /rubbish|recycle/.test(x[0]) }))));
  const wr = states[E("weatherWarnings")];
  if (wr && sv(E("weatherWarnings")) && wr.attributes.warnings) { n++; sec("Weather warning", '<div class="alert w">' + esc(wr.attributes.warnings) + '</div>'); }
  // Cameras: live pictures (the same WebRTC streams as the Security page), mounted into these slots after the list is drawn. An alert's 4th value names the camera to show while it is on:
  // "driveway", "garage", or any camera by its name as shown on the Security page ("road", "right-walkway"). The garage also shows while its door sensor says it is opening / open.
  if (full) sec("Cameras", npCams().map(x => '<div class="snap npcam" data-vw="' + esc(x.key) + '" data-npc="' + esc(x.id) + '" data-name="' + esc(x.name) + '"></div>').join(""));
  const ch = [];
  Object.keys(CONFIG.derived.soil || {}).sort().map(z => ["sensor.average_" + z + "_soil_moisture", title(z)]).forEach(x => { const m = parseFloat(sv(x[0])); if (m < 40) ch.push('<div class="ws"><span class="lbl">' + x[1] + ' soil</span><b style="color:var(' + (m < 15 ? "--sd0" : m < 25 ? "--sd1" : "--sd2") + ')">' + (m < 15 ? "Very dry" : m < 25 ? "Dry" : "Moist") + '</b>' + f1(m) + '%</div>'); });
  n += ch.length; sec("Chores", ch.length ? '<div class="wg">' + ch.join("") + '</div>' : "");
  const tm = (CONFIG.notifTimers || []).filter(x => states[x] && states[x].state === "active");   // optional Timers card: config notifTimers ["timer.x", ...] (none by default; tiles show their own countdown, see tileTimers)
  n += tm.length;
  sec("Timers", tm.map(x => { const t = states[x].attributes, fin = Date.parse(t.finishes_at || "") || 0, dur = (t.duration || "0:00:00").split(":").reduce((p, q) => p * 60 + +q, 0) * 1000; return '<div class="ws" style="margin-bottom:8px"><span class="lbl">' + esc(fname(x)) + '</span><div class="lbl tmr" data-fin="' + fin + '">--</div><div class="zb"><i data-dur="' + dur + '"></i></div></div>'; }).join(""));
  const bl = lowBatt();
  if (bl.length || parseFloat(sv(E("lowBatteryCount"))) > 0) { n++; hasB = true; nb = bl.length; if (full) bh = bl.map(x => { const v = Math.round(states[x].state), hh = Math.max(1.5, 13 * Math.min(v, 100) / 100); return '<div class="nrow ' + (v <= 15 ? "bad" : v < 40 ? "warn" : "ok") + '"><svg class="nbi" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="4" width="10" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="2" width="4" height="2" rx=".5" fill="currentColor"/><rect x="9" y="' + (19 - hh) + '" width="6" height="' + hh + '" rx="1" fill="currentColor"/></svg><span class="nbn">' + esc(fname(x).replace(/\s+battery(\s+plus|\+)$/i, "")) + '</span><b class="nbp">' + v + '%</b></div>'; }).join(""); }
  sec("Controls", TOG.map(g => { const c = parseInt(sv(g[1])) || 0, sub = c === 0 ? "All " + g[2] + "s active" : c + " " + g[2] + (c > 1 ? "s" : "") + " disabled"; return '<div class="ws" style="margin-bottom:10px"><span class="lbl">' + g[0] + '</span><div style="margin:6px 0 10px;color:var(--mut)">' + sub + '</div><div class="chips cscr">' + g[3].map(x => '<button class="chip' + (isOn(x[0]) ? " on" : "") + '" data-nt="' + x[0] + '"' + (x[2] ? ' data-sc="' + x[2] + '"' : "") + '>' + x[1] + '</button>').join("") + '</div></div>'; }).join(""));
  return { n: n - (hasB ? 1 : 0), all: n, nb: nb, html: h, bh: bh };
}
// header strip: normally a glowing bar while something is waiting; it turns into an icon for the conditions below. Priority when several are true:
// water leak, then weather warning, then garage door open, then a door open, then water on, then pollen (from the level set by pollen.alertFrom), then laundry running, then towel heating. The top one shows and a small "+n" says how many more there are.
const LEAKS = () => (CONFIG.leakSensors || []).map(x => { x = [].concat(x); return [x[0], x[1] || fname(x[0]), x[2] || "Water detected"]; });   // config leakSensors: ["binary_sensor.x"] or [["binary_sensor.x", "Washing machine", "Water under the machine"]]
const laundryOn = () => sv(E("laundryState")) === "Run";   // laundry running (the washer integration reports "Run"; "Delay Run" = waiting for its delayed start)
const towelsOn = () => { const g = E("towelGroup"); return !!g && members(g).some(x => x !== g && isOn(x)); };
// a washing-machine drum with a wave moving inside: used by the Laundry tile in Active and by the strip icon
const DRUM = '<svg viewBox="0 0 24 24" class="drum" aria-hidden="true"><rect x="3" y="2" width="18" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="5.6" r=".9" fill="currentColor"/><circle cx="12" cy="14" r="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/><clipPath id="drumc"><circle cx="12" cy="14" r="4.6"/></clipPath><g clip-path="url(#drumc)"><path class="wv" d="M2 14 q2.5 -2.2 5 0 t5 0 t5 0 t5 0 t5 0 V22 H2Z" fill="currentColor" opacity=".85"/></g></svg>';
const NSK = [
  ["leak", "water-alert", "Water leak", () => LEAKS().some(x => isOn(x[0]))],
  ["warn", "weather-cloudy-alert", "Weather warning", () => { const s = states[E("weatherWarnings")]; return !!s && s.state !== "unknown" && s.state !== "unavailable"; }],
  ["garage", "garage-open-variant", "Garage door open", () => Object.keys(galCfg()).some(k => { const c = galCfg()[k], s = c && c.sensor && states[c.sensor]; return !!s && (s.state === "on") !== !!c.invert; })],
  ["door", "door-open", "Door open", () => !!doorsOpen()],
  ["water", "m3-water-drop", "Water on", () => Object.keys(states).some(k => /^switch\..*water_tap$/.test(k) && states[k].state === "on") || (CONFIG.irrigation || []).some(z => z.switch && states[z.switch] && states[z.switch].state === "on")],
  ["battery", "battery-low", "Low battery", () => lowBattChip().length > 0],   // under 20 % by default (derived.batteryAlertBelow)
  ["pollen", "pollen", "Pollen", polOn],   // below a leak, a warning, the garage, a door and water on; the chip adds the level
  ["laundry", "washing-machine", "Laundry running", laundryOn],
  ["towel", "radiator", "Towel heating on", towelsOn]
];
const nskRel = id => polRel(id) || /^sensor\..*battery_plus$/.test(id) || LEAKS().some(x => x[0] === id) || id === E("weatherWarnings") || id === E("doorsGroup") || id === E("laundryState") || id === E("laundryRemaining") || id === E("towelGroup") || members(E("towelGroup")).includes(id) || members(E("doorsGroup")).includes(id) || /^switch\..*water_tap$/.test(id) || Object.keys(galCfg()).some(k => (galCfg()[k] || {}).sensor === id) || (CONFIG.irrigation || []).some(z => z.switch === id);
let npTab = "alerts";
const ACTC = CONFIG.quickAll || [];

let npGo = null, npUser = 0;   // npGo = { s: section, t: time }: #active/<section> from a notification link. Scrolls there as soon as that section is on screen (the states can still be loading when the pop-up opens)
["pointerdown", "wheel", "touchmove"].forEach(ev => $("#np").addEventListener(ev, () => { npUser = Date.now(); }, { passive: true }));
function npGoRun() {
  if (!npGo) return;
  if (Date.now() - npGo.t > 20000) { npGo = null; return; }
  if (npTab !== "active" || !$('#np [data-sec="' + npGo.s + '"]')) return;
  const sec = npGo.s, t0 = Date.now(); npGo = null;
  [80, 1500].forEach(ms => setTimeout(() => { if (npUser > t0 || !document.body.classList.contains("np-open")) return; const t = $('#np [data-sec="' + sec + '"]'); if (t) t.scrollIntoView({ block: "start" }); }, ms));   // the second pass catches rows that arrive just after; it never fights a finger already scrolling
}
const npLoading = () => !Object.keys(states).length;   // nothing from Home Assistant yet: say so instead of "Nothing is on or open" / "All clear"
const NPOFF = {}; let npHold = 0, npht = 0;   // tiles switched off from the Active list vanish at once (a slow light transition would keep them "on" for seconds)
const npGone = x => { const t = NPOFF[x]; if (!t) return false; if (!isOn(x) || Date.now() - t > 12000) { delete NPOFF[x]; return false; } return true; };
const actList = () => {
  const A = ACTC.map(c => ({ c: c, ids: members(c[1]).filter(x => x !== c[1] && !/^group\./.test(x) && isOn(x) && !npGone(x)) })), seen = {};
  A.forEach(x => x.ids.forEach(e => { seen[e] = 1; }));
  const ap = (CONFIG.activeAppliances || []).filter(e => isOn(e) && !npGone(e) && !seen[e]);   // config activeAppliances: ["switch.rice_cooker", ...] get their own "Appliances" group here
  if ((CONFIG.activeAppliances || []).length) A.push({ c: ["Appliances", "", "m3-plug-connect", "app"], ids: ap });
  const lm = sv(E("laundryState"));
  if (lm === "Run" || lm === "Delay Run") A.push({ c: ["Laundry", "", "washing-machine", "ld"], ids: ["laundry"] });   // one tile: the drum spins while it runs
  const twg = E("towelGroup"), tw = twg ? members(twg).filter(x => x !== twg && isOn(x) && !npGone(x) && !seen[x]) : [];   // heated towel rails: listed under Active (they used to be in Alerts)
  if (tw.length) A.push({ c: ["Towel heating", "", "radiator", "tw"], ids: tw });
  return A;
};
function npDismiss(ids) {
  ids = [].concat(ids); const now = Date.now(); let any = false;
  ids.forEach(x => { NPOFF[x] = now; $$('#np [data-e="' + x + '"]').forEach(t => { t.classList.add("gone"); any = true; }); });
  if (any) npHold = now + 300;
  clearTimeout(npht); npht = setTimeout(queueNotif, any ? 320 : 0); setTimeout(queueNotif, 12100);
}
const ldTime = () => esc(sv(sv(E("laundryState")) === "Run" ? "sensor.laundry_time_remaining_friendly" : E("laundryDelay")) || "");
const ldTile = () => { const run = sv(E("laundryState")) === "Run"; return '<div class="ldt' + (run ? " run" : "") + '"><span class="ldi">' + DRUM + '</span><div><b>Laundry</b><span>' + (run ? "RUNNING" : "DELAYED START") + ' · <em class="ldr">' + ldTime() + '</em></span></div></div>'; };
// which room an entity belongs to (first room in the house list that holds it): used for the small room headings inside each Active category
const npRoomMap = () => { const m = {}, order = []; HOUSE().forEach(r => { order.push(r.name); const add = e => { if (e && !m[e]) m[e] = r.name; };
  [r.lights, r.lightSwitches, r.covers, r.fans, r.doors, r.windows, r.climate].forEach(l => members(l || []).forEach(add));
  (r.sections || []).forEach(sc => (sc.items || []).forEach(i => add(typeof i === "string" ? i : i.entity)));
  ((CONFIG.roomControls || {})[r.id] || []).forEach(i => add(typeof i === "string" ? i : i.entity)); }); return { m: m, order: order }; };
function actHtml(A) {
  const t = A.filter(x => x.ids.length); if (!t.length) return '<div class="lbl" style="margin:14px 0">Nothing is on or open</div>';
  const RM = CONFIG.notifRoomHeadings === false ? null : npRoomMap(), tile = (x, e) => x.c[3] === "ld" ? ldTile() : tileHtml(x.c[0] === "Water taps" ? npItem(e, { icon: "m3-water-drop" }) : x.c[3] === 1 ? { entity: e, kind: x.c[0] === "Doors" ? "door" : "window" } : npItem(e, x.c[3] === "tw" ? { timer: states["timer.heated_towel_rails"] ? "timer.heated_towel_rails" : tileTimer(e) } : null));
  return t.map(x => {
    const cls = x.c[3] === 1 ? "bl" : "tg3 act-" + x.c[0].toLowerCase().replace(/\s+/g, "-"), head = '<div class="lbl np2 il" data-sec="' + x.c[0].toLowerCase().replace(/\s+/g, "-") + '">' + mdi(x.c[2]) + x.c[0] + ' · ' + x.ids.length + (x.c[3] === 1 || x.c[3] === "ld" ? "" : '<button class="eb" data-off="' + A.indexOf(x) + '">' + (x.c[3] === "close" ? "CLOSE ALL" : "ALL OFF") + '</button>') + '</div>';
    if (!RM || x.c[3] === "ld" || !x.ids.some(e => RM.m[e])) return head + '<div class="' + cls + '">' + x.ids.map(e => tile(x, e)).join("") + '</div>';   // no room info for this group: as before
    const g = {}; x.ids.forEach(e => { const r = RM.m[e] || "Other"; (g[r] = g[r] || []).push(e); });
    return head + Object.keys(g).sort((a, b) => (a === "Other") - (b === "Other") || RM.order.indexOf(a) - RM.order.indexOf(b)).map(r => '<div class="np-rm">' + esc(r) + '</div><div class="' + cls + '">' + g[r].map(e => tile(x, e)).join("") + '</div>').join("");
  }).join("");
}
const npCamFor = tag => {   // an alert's camera tag -> { id, name, key }
  if (tag === "driveway") { const v = CONFIG.view.driveway; return v && v.id ? { id: v.id, name: "Driveway", key: "driveway" } : null; }
  const t = String(tag || "").toLowerCase(), f = CONFIG.security.concat(CONFIG.cameras).filter(c => c.id === tag || slug(c.name) === t)[0]; return f ? { id: f.id, name: f.name, key: slug(f.name) } : null;
};
function npCams() {
  const out = []; (CONFIG.alerts || []).forEach(x => { if (x[3] && isOn(x[0])) { const c = npCamFor(x[3]); if (c && !out.some(o => o.id === c.id)) out.push(c); } });
  if (viewTrig("garage") && (CONFIG.view.garage || {}).id && !out.some(o => o.id === CONFIG.view.garage.id)) out.push({ id: CONFIG.view.garage.id, name: "Garage", key: "garage" });
  return out;
}
const NPCAM = {};   // id -> camera object, made once and moved into the slot each time the list is drawn, so the stream keeps playing
function npCamStop() { NPC.forEach(c => { clearTimeout(c.rt); c._on = 0; stopCam(c); }); }
function npCamMount() {
  const slots = $$("#npc [data-npc]"), want = {};
  slots.forEach((sl, i) => {
    const id = sl.dataset.npc; want[id] = 1; let c = NPCAM[id];
    if (!c) { c = NPCAM[id] = { id: id, name: sl.dataset.name, np: true }; NPC.push(c); mkCam(c, document.createElement("div")); c.o.el.onclick = null; }
    if (c.o.el.parentNode !== sl) sl.appendChild(c.o.el);
    c.o.el.querySelector(".lbl").textContent = sl.dataset.name;
    if (!c._on) { c._on = 1; camSnap(c); clearTimeout(c.rt); c.rt = setTimeout(() => { if (document.body.classList.contains("np-open") && c._on) { if (isMobile() && CONFIG.mobileLive === false) camSnap(c); else liveCam(c); } }, i * 160); }
  });
  NPC.forEach(c => { if (!want[c.id] && c._on) { clearTimeout(c.rt); c._on = 0; stopCam(c); } });
}
setInterval(() => { if (!document.body.classList.contains("np-open")) npCamStop(); }, 2500);   // closed: no streams running behind the page
function drawNotif() {
  const open = document.body.classList.contains("np-open");
  if (open && Date.now() < npHold) { clearTimeout(npht); npht = setTimeout(drawNotif, npHold - Date.now() + 10); return; }
  if (open && $$("#np input[type=range], #np .tl").some(r => r._d && r._d > Date.now())) { clearTimeout(npht); npht = setTimeout(drawNotif, 400); return; }
  const r = notif(open);
  const ks = NSK.filter(k => k[3]()), top = ks[0], nacc = $("#nacc");   // the strip turns into the icon of the most urgent condition
  // each condition is a .nai (icon + name): a phone shows just the top icon, a tablet shows the name as a chip, and a wide screen shows the two most urgent chips
  const pn = polNow(), nai = (k, c) => '<span class="nai' + c + '" data-k="' + k[0] + '"' + (k[0] === "pollen" && pn ? ' style="--nk:' + pn.col + '"' : "") + '>' + (k[0] === "laundry" ? DRUM : mdi(k[1])) + '<b class="nal">' + esc(k[0] === "pollen" && pn ? "Pollen · " + pn.name : k[0] === "battery" && lowBattChip().length > 1 ? lowBattChip().length + " low batteries" : k[2]) + '</b></span>';
  const sig = ks.slice(0, 2).map((k, i) => nai(k, i ? " nai2" : "")).join("");
  if ((nacc.dataset.k || "") !== (top ? top[0] : "") || nacc._sig !== sig) { nacc._sig = sig; if (top) nacc.dataset.k = top[0]; else nacc.removeAttribute("data-k"); nacc.innerHTML = sig; if (top && top[0] === "pollen" && pn) nacc.style.setProperty("--nk", pn.col); else nacc.style.removeProperty("--nk"); }
  nacc.dataset.n = ks.length;   // 3+ conditions: one chip + "+N" (see 28-pollen.css)
  if (ks.length > 1) nacc.dataset.more = "+" + (ks.length - 1); else nacc.removeAttribute("data-more");
  if (ks.length > 2) nacc.dataset.more2 = "+" + (ks.length - 2); else if (ks.length > 1) nacc.dataset.more2 = ""; else nacc.removeAttribute("data-more2");
  nacc.classList.toggle("on", !!r.all || !!top);
  $("#hc").title = ks.length ? ks.map(k => k[2]).join(" · ") + (r.all ? " · " : "") + (r.all ? r.all + " notification" + (r.all > 1 ? "s" : "") : "") : r.all ? r.all + " notification" + (r.all > 1 ? "s" : "") : "Notifications";
  if (!open) { npCamStop(); return; }
  const A = actList(), tot = A.reduce((s, x) => s + x.ids.length, 0);
  // the header and tabs are built once and only updated in place; the list below is only replaced when its HTML really changes, so nothing blinks on a state update
  const np = $("#np"), tb = [["alerts", "ALERTS", r.n], ["active", "ACTIVE", tot], ["batteries", "BATTERIES", r.nb]]; let tc = false;
  if (!np.querySelector(".nptabs")) { tc = true; np.innerHTML = '<div class="nh"><div><div class="lbl">Home</div><h3>Notifications</h3></div><button class="eb" data-close="1">DONE</button></div>' + hsw('<div class="chips tabs nptabs">' + tb.map(t => '<button class="chip" data-npt="' + t[0] + '"></button>').join("") + '</div>') + '<div id="npc"></div>'; }
  np.querySelectorAll(".nptabs .chip").forEach((c, k) => { const tx = tb[k][1] + (tb[k][2] ? " · " + tb[k][2] : ""); if (c.textContent !== tx) { c.textContent = tx; tc = true; } c.classList.toggle("on", c.dataset.npt === npTab); });
  const body = npLoading() ? '<div class="lbl" style="margin:14px 0">Loading…</div>' : npTab === "active" ? actHtml(A) : npTab === "batteries" ? (r.bh ? '<div class="lbl np2 il">' + mdi("battery-low") + 'Batteries · ' + r.nb + '</div>' + r.bh : '<div class="lbl" style="margin:14px 0">All batteries are fine</div>') : (r.n ? "" : '<div class="lbl" style="margin:14px 0">All clear</div>') + r.html, nc = $("#npc"), key = npTab + "|" + body.replace(/<em class="ldr">[^<]*<\/em>/g, '<em class="ldr"></em>');   // the remaining time is filled in below, so the minute ticking over does not redraw the list (and restart the drum)
  if (nc._k !== key) { nc._k = key; nc.innerHTML = body; }
  npGoRun(); npCamMount();
  $$("#npc .ldr").forEach(el => { const t = ldTime(); if (el.textContent !== t) el.textContent = t; });
  if (tc) requestAnimationFrame(hsAll);
  updTiles(); tickIrr();
}
let nq = 0;
function queueNotif() { if (!nq) nq = requestAnimationFrame(() => { nq = 0; drawNotif(); }); }
$("#hc").onclick = () => { document.body.classList.toggle("np-open"); drawNotif(); };
const npClose = () => { document.body.classList.remove("np-open"); npCamStop(); if (/^#(notifications|active|batteries)/.test(location.hash)) location.hash = "#home"; };
$("#nbd").onclick = npClose;
$("#np").onclick = e => {
  if (e.target.closest("[data-close]")) { npClose(); return; }
  const tb = e.target.closest("[data-npt]"); if (tb) { npTab = tb.dataset.npt; drawNotif(); return; }
  const of = e.target.closest("[data-off]"); if (of) { const ids = actList()[+of.dataset.off].ids; const cl = actList()[+of.dataset.off].c[3] === "close"; if (ids.length) { if (!cl) npDismiss(ids); call(cl ? "cover" : "homeassistant", cl ? "close_cover" : "turn_off", ids); } return; }
  const vw = e.target.closest("[data-vw]"); if (vw) { VW.back = /^#(view|camera|notifications|active|batteries)/.test(location.hash) ? "#home" : (location.hash || "#home"); location.hash = "#view/" + vw.dataset.vw; return; }
  const c = e.target.closest("[data-nt]");
  if (c) { if (c.dataset.sc) send({ type: "call_service", domain: "script", service: c.dataset.sc }); else call(c.dataset.nt.split(".")[0], "toggle", c.dataset.nt); return; }
  tapH(e);
};

