// ---------- notifications popup ----------
const fname = id => (states[id] && states[id].attributes.friendly_name) || id.split(".")[1].replace(/_/g, " ");
const NREL = rxj(/(^group\.|^timer\.|battery)/, (CONFIG.relevance || {}).notif);
const TOG = CONFIG.adminToggles || [];   // [label, virtual sensor id, icon, [[entity, name, script?], ...]]
TOG.forEach(g => { VIRT[g[1]] = () => g[3].filter(x => states[x[0]] && states[x[0]].state === "off").length; });
// tiles in the pop-up: the timer that belongs to an entity (config tileTimers, the irrigation zone's timer, or timer.<name> / timer.<name>_timer) and, for taps, the zone's flow sensor
const tapZone = e => (CONFIG.irrigation || []).find(z => z.switch === e);
const tileTimer = e => { const m = (CONFIG.tileTimers || {})[e]; if (m) return m; const z = tapZone(e); if (z && z.timer) return z.timer; const o = e.split(".")[1]; return ["timer." + o, "timer." + o + "_timer"].find(t => states[t]) || ""; };
const npItem = (e, o) => { const z = tapZone(e), tap = /^switch\..*water_tap$/.test(e); return Object.assign({ entity: e, timer: tileTimer(e) }, tap ? { water: (z && z.flow) || true } : {}, o || {}); };
function notif(full) {
  let n = 0, h = "";
  const sec = (t, b) => { if (full && b) h += '<div class="lbl np2">' + t + '</div>' + b; };
  const grid = a => a.length ? '<div class="tg3">' + a.map(tileHtml).join("") + '</div>' : "";
  const al = volcHtml().concat(quakeHtml() || []); n += al.length; sec("Alerts", al.join(""));
  const dr = members(E("doorsGroup")).filter(x => x !== E("doorsGroup") && isOn(x));
  if (dr.length || isOn(E("doorsGroup"))) { n++; sec("Doors", '<div class="alert q"><b>' + (dr.length || 1) + ' open</b><div>' + dr.map(x => esc(fname(x))).join(" · ") + '</div></div>'); }
  const W2 = (CONFIG.alerts || []).filter(x => isOn(x[0]));
  n += W2.length; sec("Warnings", grid(W2.map(x => npItem(x[0], { name: x[1], sub: x[2], confirm: /rubbish|recycle/.test(x[0]) }))));
  const wr = states[E("weatherWarnings")];
  if (wr && sv(E("weatherWarnings")) && wr.attributes.warnings) { n++; sec("Weather warning", '<div class="alert w">' + esc(wr.attributes.warnings) + '</div>'); }
  const snap = (id, t, k) => { const c = states[id], p = c && c.attributes.entity_picture; return p ? '<div class="snap" data-vw="' + k + '" data-cam="' + id + '"><span class="dl"></span><div class="lbl">' + t + '</div><img alt="" src="' + CONFIG.url + p + (p.indexOf("?") > -1 ? "&" : "?") + 't=' + Math.floor(Date.now() / 60000) + '"></div>' : ""; };
  if (full) sec("Cameras", ((CONFIG.alerts || []).some(x => x[3] === "driveway" && isOn(x[0])) && (CONFIG.view.driveway || {}).id ? snap(CONFIG.view.driveway.id, "Driveway", "driveway") : "") + (viewTrig("garage") ? snap((CONFIG.view.garage || {}).id, "Garage", "garage") : ""));
  const tw = members(E("towelGroup"));
  if (isOn(E("towelGroup")) || tw.some(isOn)) { n++; sec("Towel heating", grid(tw.filter(x => x !== E("towelGroup")).map(x => npItem(x, { timer: states["timer.heated_towel_rails"] ? "timer.heated_towel_rails" : tileTimer(x) })))); }
  const ch = [];
  Object.keys(CONFIG.derived.soil || {}).sort().map(z => ["sensor.average_" + z + "_soil_moisture", title(z)]).forEach(x => { const m = parseFloat(sv(x[0])); if (m < 40) ch.push('<div class="ws"><span class="lbl">' + x[1] + ' soil</span><b style="color:var(' + (m < 15 ? "--sd0" : m < 25 ? "--sd1" : "--sd2") + ')">' + (m < 15 ? "Very dry" : m < 25 ? "Dry" : "Moist") + '</b>' + f1(m) + '%</div>'); });
  const lm = sv(E("laundryState"));
  if (lm === "Run" || lm === "Delay Run") ch.push('<div class="ws"><span class="lbl">Laundry</span><b>' + (lm === "Run" ? "Running" : "Delayed") + '</b>' + esc(sv(lm === "Run" ? "sensor.laundry_time_remaining_friendly" : E("laundryDelay")) || "") + '</div>');
  n += ch.length; sec("Chores", ch.length ? '<div class="wg">' + ch.join("") + '</div>' : "");
  const tm = ["exhaust_fans", "rice_cooker", "dyson_charger", "heated_towel_rails"].map(x => "timer." + x).filter(x => states[x] && states[x].state === "active");
  n += tm.length;
  sec("Timers", tm.map(x => { const t = states[x].attributes, fin = Date.parse(t.finishes_at || "") || 0, dur = (t.duration || "0:00:00").split(":").reduce((p, q) => p * 60 + +q, 0) * 1000; return '<div class="ws" style="margin-bottom:8px"><span class="lbl">' + esc(fname(x)) + '</span><div class="lbl tmr" data-fin="' + fin + '">--</div><div class="zb"><i data-dur="' + dur + '"></i></div></div>'; }).join(""));
  const bl = Object.keys(states).filter(k => /^sensor\..*battery_plus$/.test(k) && parseFloat(states[k].state) < 61).sort((x, y) => states[x].state - states[y].state);
  if (bl.length || parseFloat(sv(E("lowBatteryCount"))) > 0) { n++; sec("Low batteries", bl.map(x => '<div class="nrow"><span>' + esc(fname(x).replace(/ battery plus$/i, "")) + '</span><b>' + Math.round(states[x].state) + '%</b></div>').join("")); }
  sec("Controls", TOG.map(g => { const c = parseInt(sv(g[1])) || 0, sub = c === 0 ? "All " + g[2] + "s active" : c + " " + g[2] + (c > 1 ? "s" : "") + " disabled"; return '<div class="ws" style="margin-bottom:10px"><span class="lbl">' + g[0] + '</span><div style="margin:6px 0 10px;color:var(--mut)">' + sub + '</div><div class="chips cscr">' + g[3].map(x => '<button class="chip' + (isOn(x[0]) ? " on" : "") + '" data-nt="' + x[0] + '"' + (x[2] ? ' data-sc="' + x[2] + '"' : "") + '>' + x[1] + '</button>').join("") + '</div></div>'; }).join(""));
  return { n: n, html: h };
}
let npTab = "alerts";
const ACTC = CONFIG.quickAll || [];

const NPOFF = {}; let npHold = 0, npht = 0;   // tiles switched off from the Active list vanish at once (a slow light transition would keep them "on" for seconds)
const npGone = x => { const t = NPOFF[x]; if (!t) return false; if (!isOn(x) || Date.now() - t > 12000) { delete NPOFF[x]; return false; } return true; };
const actList = () => ACTC.map(c => ({ c: c, ids: members(c[1]).filter(x => x !== c[1] && !/^group\./.test(x) && isOn(x) && !npGone(x)) }));
function npDismiss(ids) {
  ids = [].concat(ids); const now = Date.now(); let any = false;
  ids.forEach(x => { NPOFF[x] = now; $$('#np [data-e="' + x + '"]').forEach(t => { t.classList.add("gone"); any = true; }); });
  if (any) npHold = now + 300;
  clearTimeout(npht); npht = setTimeout(queueNotif, any ? 320 : 0); setTimeout(queueNotif, 12100);
}
function actHtml(A) {
  const t = A.filter(x => x.ids.length); if (!t.length) return '<div class="lbl" style="margin:14px 0">Nothing is on or open</div>';
  return t.map((x, i) => '<div class="lbl np2 il" data-sec="' + x.c[0].toLowerCase().replace(/\s+/g, "-") + '">' + mdi(x.c[2]) + x.c[0] + ' · ' + x.ids.length + (x.c[3] === 1 ? "" : '<button class="eb" data-off="' + A.indexOf(x) + '">' + (x.c[3] === "close" ? "CLOSE ALL" : "ALL OFF") + '</button>') + '</div>' +
    '<div class="' + (x.c[3] === 1 ? "bl" : "tg3 act-" + x.c[0].toLowerCase().replace(/\s+/g, "-")) + '">' + x.ids.map(e => tileHtml(x.c[0] === "Water taps" ? npItem(e, { icon: "m3-water-drop" }) : x.c[3] === 1 ? { entity: e, kind: x.c[0] === "Doors" ? "door" : "window" } : npItem(e))).join("") + '</div>').join("");
}
function drawNotif() {
  const open = document.body.classList.contains("np-open");
  if (open && Date.now() < npHold) { clearTimeout(npht); npht = setTimeout(drawNotif, npHold - Date.now() + 10); return; }
  if (open && $$("#np input[type=range], #np .tl").some(r => r._d && r._d > Date.now())) { clearTimeout(npht); npht = setTimeout(drawNotif, 400); return; }
  const r = notif(open);
  $("#nacc").classList.toggle("on", !!r.n); $("#hc").title = r.n ? r.n + " notification" + (r.n > 1 ? "s" : "") : "Notifications";
  if (!open) return;
  const A = actList(), tot = A.reduce((s, x) => s + x.ids.length, 0);
  $("#np").innerHTML = '<div class="nh"><b>Notifications</b><button class="eb" data-close="1">' + mdi("close") + '</button></div>' +
    '<div class="chips tabs nptabs"><button class="chip' + (npTab === "alerts" ? " on" : "") + '" data-npt="alerts">ALERTS' + (r.n ? " · " + r.n : "") + '</button><button class="chip' + (npTab === "active" ? " on" : "") + '" data-npt="active">ACTIVE' + (tot ? " · " + tot : "") + '</button></div>' +
    (npTab === "active" ? actHtml(A) : (r.n ? "" : '<div class="lbl" style="margin:14px 0">All clear</div>') + r.html);
  updTiles(); tickIrr();
}
let nq = 0;
function queueNotif() { if (!nq) nq = requestAnimationFrame(() => { nq = 0; drawNotif(); }); }
$("#hc").onclick = () => { document.body.classList.toggle("np-open"); drawNotif(); };
const npClose = () => { document.body.classList.remove("np-open"); if (/^#(notifications|active)/.test(location.hash)) location.hash = "#home"; };
$("#nbd").onclick = npClose;
$("#np").onclick = e => {
  if (e.target.closest("[data-close]")) { npClose(); return; }
  const tb = e.target.closest("[data-npt]"); if (tb) { npTab = tb.dataset.npt; drawNotif(); return; }
  const of = e.target.closest("[data-off]"); if (of) { const ids = actList()[+of.dataset.off].ids; const cl = actList()[+of.dataset.off].c[3] === "close"; if (ids.length) { if (!cl) npDismiss(ids); call(cl ? "cover" : "homeassistant", cl ? "close_cover" : "turn_off", ids); } return; }
  const vw = e.target.closest("[data-vw]"); if (vw) { VW.back = /^#(view|camera|notifications|active)/.test(location.hash) ? "#home" : (location.hash || "#home"); location.hash = "#view/" + vw.dataset.vw; return; }
  const c = e.target.closest("[data-nt]");
  if (c) { if (c.dataset.sc) send({ type: "call_service", domain: "script", service: c.dataset.sc }); else call(c.dataset.nt.split(".")[0], "toggle", c.dataset.nt); return; }
  tapH(e);
};

