// ---------- bins card (Alerts tab): the night before pickup a reminder with the Reminded > Bins out > Collected steps, on pickup day a quick check with the road camera ----------
// config bins: { due: [[switch, "Recycling", "recycle"], [switch, "Rubbish", "trash-can"], [switch, "Garden", "leaf"]], out: "input_boolean.bins_out", camera: "road", eveningFrom: 16 }
// a due switch is on from the evening before pickup until the bins are collected; "out" is on once the bins are at the kerb. "Collected" turns them all off.
Object.assign(MDI, {"recycle":"M21.82,15.42L19.32,19.75C18.83,20.61 17.92,21.06 17,21H15V23L12.5,18.5L15,14V16H17.82L15.6,12.15L19.93,9.65L21.73,12.77C22.25,13.54 22.32,14.57 21.82,15.42M9.21,3.06H14.21C15.19,3.06 16.04,3.63 16.45,4.45L17.45,6.19L19.18,5.19L16.54,9.6L11.39,9.69L13.12,8.69L11.71,6.24L9.5,10.09L5.16,7.59L6.96,4.47C7.37,3.64 8.22,3.06 9.21,3.06M5.05,19.76L2.55,15.43C2.06,14.58 2.13,13.56 2.64,12.79L3.64,11.06L1.91,10.06L7.05,10.14L9.7,14.56L7.97,13.56L6.56,16H11V21H7.4C6.47,21.07 5.55,20.61 5.05,19.76Z","trash-can":"M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M9,8H11V17H9V8M13,8H15V17H13V8Z","leaf":"M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"});   // recycle / bin / leaf (Material Design Icons)
function binsCfg() { const b = CONFIG.bins; return b && Array.isArray(b.due) && b.due.length ? b : null; }
function binsDue() { const b = binsCfg(); return b ? b.due.filter(x => isOn(x[0])) : []; }
function binsOut() { const b = binsCfg(); return !!(b && b.out && isOn(b.out)); }
function binsIds() { const b = binsCfg(); return b ? b.due.map(x => x[0]).concat(b.out ? [b.out] : []) : []; }
function binsEvening() { const f = (binsCfg() || {}).eveningFrom; return new Date().getHours() >= (typeof f === "number" ? f : 16); }   // from this hour the pickup is "tomorrow", before it "today"
function binsWaiting() { return binsDue().length > 0 && !binsOut(); }   // something still has to go out: counts as an alert and shows in the header strip
function binsCard() {
  const b = binsCfg(), due = binsDue(); if (!b || !due.length) return "";
  const out = binsOut(), eve = binsEvening(), nm = due.map(x => x[1]), list = nm.length > 1 ? nm.slice(0, -1).join(", ") + " and " + nm[nm.length - 1] : nm[0];
  const ico = '<div class="bn-i">' + due.map(x => '<span class="bn-b" data-ic="' + esc(x[2] || "trash-can") + '">' + mdi(x[2] || "trash-can") + '</span>').join("") + '</div>';
  const title = out ? "Bins are out" : eve ? "Bins out tonight" : "Bring the bins out", sub = esc(list) + " · " + (eve ? "pickup tomorrow" : out ? "waiting for pickup today" : "pickup today");
  const step = (c, t) => '<div class="bn-s ' + c + '"><span class="bn-d">' + (c === "done" ? mdi("check") : "") + '</span>' + t + '</div>';
  const tl = eve ? '<div class="bn-tl">' + step("done", "Reminded") + '<i class="bn-ln done"></i>' + step(out ? "done" : "cur", "Bins out") + '<i class="bn-ln' + (out ? " done" : "") + '"></i>' + step("", "Collected") + '</div>' : "";
  const cam = !eve && b.camera ? npCamFor(b.camera) : null, cs = cam ? '<div class="snap npcam" data-vw="' + esc(cam.key) + '" data-npc="' + esc(cam.id) + '" data-name="' + esc(cam.name) + '"></div>' : "";
  const btn = out && !eve ? '<button class="bn-btn" data-bn="done">Collected</button>' : !out && b.out ? '<button class="bn-btn" data-bn="out">Bins are out</button>' : !b.out ? '<button class="bn-btn" data-bn="done">Done</button>' : "";
  return '<div class="bn' + (out ? " out" : "") + '"><div class="bn-h">' + ico + '<div class="bn-t"><b>' + title + '</b><span>' + sub + '</span></div></div>' + tl + cs + btn + '</div>';
}
function binsTap(k) {
  const b = binsCfg(); if (!b) return;
  if (k === "out" && b.out) call("input_boolean", "turn_on", b.out);
  else call("homeassistant", "turn_off", binsIds());
}
// ---------- activity feed (notifications pop-up, ACTIVITY tab): camera person / vehicle sensors, doors and windows, water taps, towel rails and any extra entities, newest first ----------
// config activity: { hours: 24, max: 150, merge: 120, include: "switch\\.(dyson|rice)", exclude: "", cameras: { "walkway": "right-walkway" } }  (activity: false hides the tab)
// Layout: a timeline (time on the left, an icon on the line, the text and, for a person / vehicle, the picture from the matching recent-detections clip when config playback is set up).
// Live events come from the state_changed stream; the past hours are read once from Home Assistant's logbook when the tab opens. Repeats of the same entity within "merge" seconds become one row with a count.
const AF = { raw: [], filter: "all", loaded: 0, busy: 0, rx: {}, dt: [], req: {}, pt: 0 };
const AFG = { all: null, cams: ["person", "vehicle"], doors: ["door", "window"], water: ["water"], sw: ["towel", "switch"] };
const AFN = [["all", "All"], ["cams", "Cameras"], ["doors", "Doors"], ["water", "Water"], ["sw", "Switches"]];
const afCfg = () => CONFIG.activity === false ? null : Object.assign({ hours: 24, max: 150, merge: 120 }, CONFIG.activity && typeof CONFIG.activity === "object" ? CONFIG.activity : {});
const afRx = s => { if (!s) return null; if (!(s in AF.rx)) { try { AF.rx[s] = new RegExp(s); } catch (e) { AF.rx[s] = null; } } return AF.rx[s]; };
function afKind(id) {
  const c = afCfg(); if (!c) return null;
  const ex = afRx(c.exclude); if (ex && ex.test(id)) return null;
  const d = id.split(".")[0], a = (states[id] && states[id].attributes) || {};
  if (d === "binary_sensor") {
    if (/camera/.test(id) && /person/.test(id)) return "person";
    if (/camera/.test(id) && /vehicle/.test(id)) return "vehicle";
    if (a.device_class === "window") return "window";
    if (a.device_class === "door" || a.device_class === "garage_door" || a.device_class === "opening") return "door";
  }
  if (d === "switch" && (/water_tap$/.test(id) || (CONFIG.irrigation || []).some(z => z.switch === id))) return "water";
  if (d === "switch" && /towel/.test(id)) return "towel";
  const inc = afRx(c.include); if (inc && inc.test(id)) return "switch";
  return null;
}
const afCamOf = id => {   // the camera a person / vehicle sensor belongs to: config activity.cameras { "text in the sensor id": "camera name" }, else a camera whose name is in the sensor id (longest match wins)
  const c = afCfg() || {}, m = c.cameras || {}, k = Object.keys(m).find(x => id.indexOf(x) > -1); if (k) return npCamFor(m[k]);
  let best = null; CONFIG.security.concat(CONFIG.cameras).forEach(cm => { const s = slug(cm.name).replace(/-/g, "_"); if (id.indexOf(s) > -1 && (!best || s.length > best.s.length)) best = { s: s, c: cm }; });
  return best ? { id: best.c.id, name: best.c.name, key: slug(best.c.name) } : null;
};
const afName = id => { const f = (states[id] && states[id].attributes.friendly_name) || id.split(".")[1].replace(/_/g, " "); return f.replace(/\b(contact|opening|detection|person|vehicle|sensor|crossline|entry|exit|camera|cameras)\b/gi, "").replace(/\s+/g, " ").trim() || f; };
function afAdd(t, id, s) {   // one raw change: dedupe on entity + state + second (the logbook repeats what was already seen live)
  const k = afKind(id); if (!k || (s !== "on" && s !== "off")) return;
  if ((k === "person" || k === "vehicle") && s !== "on") return;
  const key = id + "|" + s + "|" + Math.round(t / 1000); if (AF.raw.some(x => x.key === key)) return;
  AF.raw.push({ t: t, id: id, s: s, k: k, key: key });
  const c = afCfg(), lim = Date.now() - c.hours * 36e5; if (AF.raw.length > c.max * 4) AF.raw = AF.raw.filter(x => x.t > lim).sort((a, b) => b.t - a.t).slice(0, c.max * 4);
}
function actNote(d) {   // called for every state_changed event, before the state is stored
  if (!d || !d.new_state || !afCfg()) return;
  const o = d.old_state ? d.old_state.state : "", n = d.new_state.state;
  if ((o !== "on" && o !== "off") || (n !== "on" && n !== "off") || o === n) return;
  if (!states[d.entity_id]) states[d.entity_id] = d.new_state;   // so a brand-new entity can be classified
  const before = AF.raw.length; afAdd(Date.now(), d.entity_id, n);
  if (AF.raw.length !== before && document.body.classList.contains("np-open") && npTab === "activity") queueNotif();
}
function afLoad(force) {
  const c = afCfg(); if (!c || AF.busy || (!force && Date.now() - AF.loaded < 3e5)) return;
  const ids = Object.keys(states).filter(afKind); if (!ids.length) return;
  AF.busy = 1; const end = new Date(), start = new Date(end.getTime() - c.hours * 36e5);
  send({ type: "logbook/get_events", start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: ids }, res => {
    AF.busy = 0; AF.loaded = Date.now(); if (!Array.isArray(res)) return;
    res.forEach(x => { const w = typeof x.when === "number" ? x.when * 1000 : Date.parse(x.when); if (w && x.entity_id && x.state) afAdd(w, x.entity_id, String(x.state)); });
    if (document.body.classList.contains("np-open") && npTab === "activity") queueNotif();
  });
}
function afList() {   // newest first, repeats merged, durations (open for / ran for) worked out from the on / off pairs
  const c = afCfg(), now = Date.now(), lim = now - c.hours * 36e5, asc = AF.raw.filter(x => x.t > lim).sort((a, b) => a.t - b.t), on = {};
  asc.forEach(x => { if (x.s === "on") { if (!on[x.id]) on[x.id] = x.t; } else { x.dur = on[x.id] ? x.t - on[x.id] : 0; delete on[x.id]; } });
  const want = AFG[AF.filter], out = [], last = {};
  asc.slice().reverse().forEach(x => {
    if (want && want.indexOf(x.k) < 0) return;
    const p = last[x.id + x.s]; if (p && p.first - x.t < c.merge * 1000) { p.n++; p.first = x.t; return; }
    const it = { t: x.t, first: x.t, id: x.id, s: x.s, k: x.k, dur: x.dur || 0, n: 1 }; last[x.id + x.s] = it; out.push(it);
  });
  return out.slice(0, c.max);
}
const afDur = ms => { const m = Math.round(ms / 60000); return m < 1 ? Math.max(1, Math.round(ms / 1000)) + " sec" : m < 60 ? m + " min" : Math.floor(m / 60) + " hr" + (m % 60 ? " " + (m % 60) + " min" : ""); };
const afWhen = t => Date.now() - t < 6e4 ? "now" : new Date(t).toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase();
const afGroup = t => { const a = Date.now() - t, d0 = new Date(); d0.setHours(0, 0, 0, 0); return a < 36e5 ? "Last hour" : t >= d0.getTime() ? "Earlier today" : t >= d0.getTime() - 864e5 ? "Yesterday" : "Earlier"; };
const afDtOn = () => CONFIG.detections !== false && typeof dtCams === "function" && dtCams().length > 0;
function afClip(x, cam) {   // the recent-detections clip (same camera, same kind, within 90 s of the sensor) from the Security page's list, or null
  if (!cam || !AF.dt.length) return null;
  const tag = x.k === "vehicle" ? "Vehicle" : "Person"; let best = null;
  AF.dt.forEach(d => { if (d.cam === cam.id && d.p && d.p.tags.indexOf(tag) > -1) { const df = Math.abs(d.ts - x.t); if (df < 9e4 && (!best || df < best.df)) best = { d: d, df: df }; } });
  return best ? best.d : null;
}
function afThumb(d) {   // the same picture the Detections tab shows for that clip (dtThumbUrl); when there is none yet the shared loader fetches / cuts it
  const u = dtThumbUrl(d);
  const su = DT.snapUrl[d.mc], fresh = su && Date.now() - su.t < 3000000;
  if (Date.now() - (AF.req[d.mc] || 0) > 3e6 && (DT.snapOf[d.mc] ? !fresh : !u && DT.th[d.mc] == null)) { AF.req[d.mc] = Date.now(); DT.q.push(d.mc); dtNext(); }   // same rule as the Detections tab (dtThumbs)
  return u;
}
let afRt = 0;
function afThumbReady() { clearTimeout(afRt); afRt = setTimeout(() => { if (document.body.classList.contains("np-open") && npTab === "activity") queueNotif(); }, 200); }   // called by the thumbnail loader (27-recent-detections.js)
function afRow(x) {
  const nm = afName(x.id), on = x.s === "on", cam = x.k === "person" || x.k === "vehicle" ? afCamOf(x.id) : null, rep = x.n > 1 ? " ×" + x.n : "";
  const T = { person: ["account", "Person detected" + rep, cam ? cam.name : nm, "dng"], vehicle: ["car", "Vehicle detected" + rep, cam ? cam.name : nm, "dng"],
    door: [on ? "door-open" : "m3-door-front", nm + (on ? " opened" : " closed") + rep, on ? "" : x.dur ? "Open for " + afDur(x.dur) : "", on ? "wrn" : "ok"],
    window: [on ? "window-open-variant" : "m3-window-closed", nm + (on ? " opened" : " closed") + rep, on ? "" : x.dur ? "Open for " + afDur(x.dur) : "", on ? "wrn" : "ok"],
    water: ["m3-water-drop", nm + (on ? " turned on" : " turned off") + rep, on ? "" : x.dur ? "Ran for " + afDur(x.dur) : "", on ? "wat" : "ok"],
    towel: ["radiator", nm + (on ? " turned on" : " turned off") + rep, on ? "" : x.dur ? "On for " + afDur(x.dur) : "", on ? "heat" : "ok"],
    switch: ["toggle-switch", nm + (on ? " turned on" : " turned off") + rep, on ? "" : x.dur ? "On for " + afDur(x.dur) : "", on ? "wat" : "ok"] }[x.k];
  const d = cam ? afClip(x, cam) : null, th = d ? afThumb(d) : "";
  const pic = d ? '<div class="af-th" data-afp="' + esc(d.mc) + '" data-cam="' + esc(d.cam) + '" data-ts="' + d.ts + '" data-tg="' + esc(d.p.tags.join(",")) + '">' + (th ? '<img src="' + esc(th) + '" alt="" loading="lazy">' : "") + '<b>' + mdi("play") + '</b></div>' : "";   // tap = play that exact clip, like the Detections tab
  return '<div class="af-r' + (cam ? " go" : "") + '"' + (cam ? ' data-vw="' + esc(cam.key) + '"' : "") + '><span class="af-tm">' + afWhen(x.t) + '</span><span class="af-i ' + T[3] + '">' + mdi(T[0]) + '</span><div class="af-t"><b>' + esc(T[1]) + '</b>' + (T[2] ? '<span>' + esc(T[2]) + '</span>' : "") + pic + '</div></div>';
}
function afHtml() {
  afLoad();
  if (afDtOn()) {   // the clips the Security page lists: read once (and again after 10 minutes) so person / vehicle rows can show their picture
    if (!DT.busy && Date.now() - DT.t0 > 6e5) dtLoad();
    AF.dt = dtItems();
    if (DT.busy) { clearTimeout(AF.pt); AF.pt = setTimeout(() => { if (document.body.classList.contains("np-open") && npTab === "activity") queueNotif(); }, 3000); }
  } else AF.dt = [];
  const L = afList(), chips = '<div class="chips af-f">' + AFN.map(n => '<button class="chip' + (AF.filter === n[0] ? " on" : "") + '" data-aff="' + n[0] + '">' + n[1] + '</button>').join("") + '</div>';
  if (!L.length) return chips + '<div class="lbl" style="margin:14px 0">' + (AF.busy ? "Loading…" : "Nothing yet") + '</div>';
  let g = "", h = ""; L.forEach(x => { const gn = afGroup(x.t); if (gn !== g) { if (g) h += '</div>'; g = gn; h += '<div class="lbl np2">' + gn + '</div><div class="af-l">'; } h += afRow(x); });
  return chips + h + '</div>';
}
setInterval(() => { if (document.body.classList.contains("np-open") && npTab === "activity") queueNotif(); }, 30000);   // "3 min" ticks over
