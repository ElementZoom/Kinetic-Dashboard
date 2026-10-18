// ---------- rooms ----------
const members = (id, d) => { d = d == null ? 3 : d; const o = []; [].concat(id || []).forEach(x => { const a = states[x] && states[x].attributes.entity_id; (d > 0 && Array.isArray(a) ? members(a, d - 1) : [x]).forEach(y => { if (o.indexOf(y) < 0) o.push(y); }); }); return o; };
const isOn = id => { const s = states[id]; return !!s && (s.state === "on" || s.state === "open" || s.state === "opening"); };
const roomOK = id => !RU || !Array.isArray(RU.rooms) || RU.rooms.indexOf(id) > -1;   // a restricted person may be limited to some rooms (RU.rooms)
const HOUSE = () => CONFIG.house.filter(r => roomOK(r.id));
const ROOM = id => HOUSE().filter(r => r.id === id)[0];
let curPanels = [], curRoom = null, onRooms = false, rq = 0;
const camOpen = () => onView() || !!document.querySelector(".cam.fs .cpanel:not(:empty)");
function queueRoom() { if (!rq) rq = requestAnimationFrame(() => { rq = 0; updRooms(); }); }
let rtab = 0; try { rtab = +localStorage.getItem("dashRtab") || 0; } catch (_) {}
function occOf(r) {   // presence entities for a room: r.occ, else found by name
  if (r.occ) return [].concat(r.occ);
  const sl = x => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), out = [];
  [r.id, sl(r.name)].forEach(b => { if (b) ["input_boolean." + b + "_occupancy", "binary_sensor." + b + "_occupancy", "binary_sensor." + b + "_presence", "binary_sensor." + b + "_motion"].forEach(e => { if (states[e] && out.indexOf(e) < 0) out.push(e); }); });
  return out;
}
const roomOccupied = r => occOf(r).some(isOn);
function roomTabs() {
  const t = CONFIG.roomTabs.map(x => [x[0], x[1].filter(roomOK)]), used = [].concat.apply([], CONFIG.roomTabs.map(x => x[1])), rest = HOUSE().map(r => r.id).filter(i => used.indexOf(i) < 0);
  if (rest.length) t.push(["Other", rest]);
  if (CONFIG.roomsByPresence !== false && HOUSE().some(r => occOf(r).length)) {
    const occ = HOUSE().filter(roomOccupied).map(r => r.id);
    t.forEach(x => { x[1] = x[1].filter(i => occ.indexOf(i) < 0); });
    t.unshift(["Occupied", occ, "No rooms are occupied right now"]);
  }
  return RU && Array.isArray(RU.rooms) ? t.filter((x, i) => x[1].length || x[0] === "Occupied") : t;
}
let rlq = 0; const queueRl = () => { if (!rlq) rlq = requestAnimationFrame(() => { rlq = 0; if (onRooms && !curRoom) drawRooms(); }); };
$("#rtabs").onclick = e => { const b = e.target.closest("[data-rt]"); if (!b) return; const old = rtab; rtab = +b.dataset.rt; try { localStorage.setItem("dashRtab", rtab); } catch (_) {} drawRooms(); if (rtab !== old) txGo($("#rl"), rtab > old ? 1 : -1, true); };
function drawRooms() {
  curRoom = null; $("#cpp").classList.remove("on"); $("#rl").style.display = ""; $("#rv").style.display = "none"; $("#rtabs").style.display = "";
  const tabs = roomTabs(); if (rtab >= tabs.length) rtab = 0;
  $("#rtabs").innerHTML = tabs.map((t, i) => '<button class="chip' + (i === rtab ? " on" : "") + '" data-rt="' + i + '">' + esc(t[0]) + '</button>').join("");
  $("#rl").innerHTML = tabs[rtab][1].length ? "" : '<div class="lbl" style="grid-column:1/-1;margin:18px 4px">' + esc(tabs[rtab][2] || "No rooms") + '</div>';
  tabs[rtab][1].map(ROOM).filter(Boolean).forEach(r => {
    const a = document.createElement("a"); a.className = "rc"; a.href = "#rooms/" + r.id; a.dataset.r = r.id;
    a.innerHTML = cardHtml(r.name, r.icon);
    $("#rl").appendChild(a);
  });
  updRooms();
}
function cardHtml(n, i) { return '<div class="lbl">' + mdi(i) + esc(n) + '</div><div class="md">--</div><div class="temp"><span class="tm">--</span></div><div class="lbl ts">--</div><i class="rg"></i><div class="hvb"></div>'; }
// room-card badges: use your own count sensors (r.counts) when set, else count members that are on / open
const roomLights = r => { const o = []; const add = x => { if (x && o.indexOf(x) < 0) o.push(x); };   // every light in the room: its lights, its light switches, and any light.* shown in its sections
  members(r.lights).concat(members(r.lightSwitches || [])).forEach(add); (r.sections || []).forEach(sec => (sec.items || []).forEach(i => { const e = typeof i === "string" ? i : i.entity; if (e && e.indexOf("light.") === 0) add(e); })); return o; };
const roomHum = r => { if (!r.hum) return null; const q = r.hum.split("#"), e = states[q[0]]; return e ? (q[1] ? e.attributes[q[1]] : e.state) : null; };
const CB = { lights: ["hue-recessed-ceiling", "#fcf2d4", "#5b5326"], doors: ["m3-door-open", "#bc000a", "#fff"], windows: ["m3-window-open", "#ffaa00", "#fff"], covers: ["m3-curtains-closed", "#702963", "#fff"], fans: ["fan", "#89CFF0", "#000"] };
// heat pump follows the room: a room (or its climate tile) is "live" when the heat pump is on AND that room's own climate is on
const HPFX = { cool: ["cool", "COOLING", "snowflake", "COOL"], heat: ["heat", "HEATING", "fire", "HEAT"], dry: ["dry", "DRYING", "water-percent", "DRY"], fan_only: ["fan", "FAN ONLY", "fan", "FAN"], heat_cool: ["auto", "AUTO", "thermometer", "AUTO"], auto: ["auto", "AUTO", "thermometer", "AUTO"] };
const isOff = x => !x || /^(off|unavailable|unknown)$/.test(x.state);
const HPFX_SHORT = { cool: "COOL", heat: "HEAT", dry: "DRY", fan: "FAN", auto: "AUTO" };
function hpFx() { const hp = states[MAIN]; return isOff(hp) ? null : HPFX[hp.state] || null; }
function roomHp(r) {
  const fx = hpFx(); if (!fx) return null;
  const zs = [].concat(r.climate || []).map(x => states[x]).filter(x => x && !isOff(x)); if (!zs.length) return null;
  return { k: fx[0], l: fx[1], i: fx[2], t: zs[0].attributes.temperature };
}
function fillCard(el, r) {
  const tv = roomTemp(r), hv = roomHum(r), C = r.counts || {};
  const num = (k, list) => { const v = C[k] ? sv(C[k]) : null; return v != null && !isNaN(+v) ? Math.round(+v) : members(list).filter(isOn).length; };
  const n = { lights: C.lights ? num("lights", r.lights) : roomLights(r).filter(isOn).length, doors: num("doors", r.doors), windows: num("windows", r.windows), covers: num("covers", r.covers), fans: num("fans", r.fans) };
  el.style.setProperty("--tc", tempColor(parseFloat(tv))); el.style.setProperty("--tg", glowColor(parseFloat(tv)));
  { const t = parseFloat(tv); if (isNaN(t)) delete el.dataset.tt; else el.dataset.tt = "1"; el.style.setProperty("--ts", isNaN(t) ? "4s" : (Math.round(Math.max(2.5, Math.min(6, 2.2 + (24 - t) * 0.35)) * 2) / 2).toFixed(1) + "s"); }   // warmer room = faster glow
  const hx = roomHp(r); el.classList.toggle("hv", !!hx); if (hx) el.dataset.hm = hx.k; else delete el.dataset.hm;
  $(".tm", el).textContent = f1(tv) + "°";
  $(".md", el).textContent = hv != null ? f1(hv) + "% RH" : "";
  const LBL = { lights: ["light", "on"], doors: ["door", "open"], windows: ["window", "open"], covers: ["curtain", "open"], fans: ["fan", "on"] };
  let b = Object.keys(CB).filter(k => n[k] > 0).map(k => '<span class="cb2 cA al k-' + k + '">' + mdi(CB[k][0]) + n[k] + '</span><span class="cb2 cB k-' + k + '"><i></i>' + n[k] + " " + LBL[k][0].toUpperCase() + (n[k] > 1 ? "S " : " ") + LBL[k][1].toUpperCase() + '</span>').join("");
  if (C.garage) { const o = isOn(C.garage), k = o ? "gopen" : "gshut"; b += '<span class="cb2 cA' + (o ? " al" : "") + ' k-' + k + '">' + mdi(o ? "garage-open-variant" : "garage-variant") + '</span><span class="cb2 cB k-' + k + '"><i></i>GARAGE ' + (o ? "OPEN" : "CLOSED") + '</span>'; }
  if (hx) b += '<span class="cb2 hvc">' + mdi(hx.i) + "<span>" + HPFX_SHORT[hx.k] + "</span></span>";
  $(".ts", el).innerHTML = b;
}
function roomTemp(r) {
  const cl = [].concat(r.climate || [])[0], c = cl && states[cl], s = r.temp && states[r.temp];
  return s && s.state !== "unavailable" ? s.state : (c ? c.attributes.current_temperature : null);
}
function updRooms() {
  if (curRoom || camOpen() || onSec()) updTiles();
  if (curRoom) return;
  $$("#rl .rc").forEach(el => fillCard(el, ROOM(el.dataset.r)));
}
function tileHtml(x) {
  const it = typeof x === "string" ? { entity: x } : x, e = it.entity, d = e.split(".")[0], nm = '<span class="nm">' + (it.name ? esc(it.name) : "") + '</span>';
  if (d === "binary_sensor" && !it.script) return '<div class="bd" data-e="' + e + '"' + (it.kind ? ' data-k="' + it.kind + '"' : "") + (it.name ? ' data-n="1"' : "") + '><i></i>' + nm + '<span class="st"></span></div>';
  let ctrl = "";
  const pre = d === "light" ? '<i class="fill"></i>' : it.water ? irrWave(e, isOn(e), typeof it.water === "string" ? parseFloat(sv(it.water)) || 0 : 0) : "";   // water: rolling water in the tile while a tap runs (same effect as the Irrigation flow tile)
  if (d === "cover") ctrl = '<div class="cb"><button data-a="open_cover">' + mdi("chevron-up") + '</button><button data-a="stop_cover">' + mdi("stop") + '</button><button data-a="close_cover">' + mdi("chevron-down") + '</button></div><input type="range" min="0" max="100">';
  return '<div class="tl' + (it.water ? " wt" : "") + (it.sensor ? " dr" : "") + (it.siren ? " sir" : "") + '" data-e="' + e + '"' + (it.siren ? ' data-sir="' + it.siren + '"' : "") + (it.script ? ' data-sc="' + it.script + '"' : "") + (it.sensor ? ' data-s="' + it.sensor + '"' : "") + (it.confirm ? ' data-cf="1"' : "") + (it.name ? ' data-n="1"' : "") + (it.nameFrom ? ' data-nf="' + it.nameFrom + '"' : "") + (it.stateIcons ? ' data-si="' + esc(JSON.stringify(it.stateIcons)) + '"' : "") + (it.sub ? ' data-sub="' + esc(it.sub) + '"' : "") + '>' + pre + '<div class="tn">' + (it.sensor ? mdi("garage-variant") : entIcon(e, it.icon)) + " " + nm + '</div><div class="ts2">--</div>' + (it.timer && states[it.timer] && states[it.timer].state === "active" ? tmrHtml(it.timer) : "") + ctrl + '</div>';   // timer: countdown + bar while the entity's timer runs
}
function tmrHtml(id) { const t = states[id].attributes, fin = Date.parse(t.finishes_at || "") || 0, dur = (t.duration || "0:00:00").split(":").reduce((p, q) => p * 60 + +q, 0) * 1000; return '<div class="lbl tmr" data-fin="' + fin + '">--</div><div class="zb"><i data-dur="' + dur + '"></i></div>'; }
const climHtml = id => '<div class="tl cl" data-c="' + id + '"><div class="tn">' + mdi("thermometer") + ' <span class="nm"></span></div><div class="ts2">--</div><div class="row"><button class="rnd s" data-d="-1">−</button><b data-tgt="' + id + '">--</b><button class="rnd s" data-d="1">+</button><button class="rnd s" data-p="1">' + mdi("power") + '</button></div></div>';
// room AUTOMATIONS pop-up: tabs Occupancy / Adaptive lighting / Others (only when a room has more than one kind)
const CPT = {}, CPN = ["Occupancy", "Adaptive lighting", "Others"];
const cpCat = t => { const e = (t.dataset.e || "") + " " + (t.dataset.sc || ""); return /(_presence_|room_presence|outdoor_presence|rear_presence|presence_active|toggle_presence)/.test(e) ? 0 : /adaptive_lighting/.test(e) ? 1 : 2; };
function cpTabs(rid) {
  const L = $("#cpp .cpl"); if (!L) return; const T = [...L.children]; T.forEach(t => { t.dataset.ct = cpCat(t); });
  const used = [0, 1, 2].filter(c => T.some(t => +t.dataset.ct === c)); if (used.length < 2) return;
  if (used.indexOf(CPT[rid]) < 0) CPT[rid] = used[0];
  L.insertAdjacentHTML("beforebegin", '<div class="chips tabs cpts">' + used.map(c => '<button class="chip' + (c === CPT[rid] ? " on" : "") + '" data-cpt="' + c + '">' + CPN[c].toUpperCase() + '</button>').join("") + '</div>');
  L.dataset.rid = rid; cpShow(rid);
}
function cpShow(rid) { const c = CPT[rid]; $$("#cpp .cpl > *").forEach(t => { t.style.display = +t.dataset.ct === c ? "" : "none"; }); $$("#cpp [data-cpt]").forEach(b => b.classList.toggle("on", +b.dataset.cpt === c)); }
function drawRoom(id) {
  const r = ROOM(id); if (!r) { location.hash = "#rooms"; return; }
  curRoom = r; $("#rl").style.display = "none"; $("#rtabs").style.display = "none"; const v = $("#rv"); v.style.display = "";
  const grid = (ids, hs) => '<div class="tg3' + (hs ? " hsc" : "") + '">' + ids.map(tileHtml).join("") + '</div>';
  const itE = i => typeof i === "string" ? i : i.entity, lsw = members(r.lightSwitches || []), isLt = e => e.indexOf("light.") === 0 || lsw.indexOf(e) > -1, nof = CONFIG.countIfNotOff || [], onable = e => /^(light|switch|fan|input_boolean)\./.test(e) || nof.indexOf(e) > -1;
  const dflt = members(r.lights).concat(lsw).filter((e, i, a) => a.indexOf(e) === i);
  // every panel carries what it counts (ids) and, for light sections only, what ALL OFF switches off (off)
  const xc = [].concat((CONFIG.roomControls || {})[r.id] || []), secs = (r.sections || [{ name: "Lights", items: dflt }]).slice();   // roomControls: extra tiles for this room's AUTOMATIONS pop-up (they go first)
  if (xc.length) { const ci = secs.findIndex(x => /^controls?$/i.test(x.name)); if (ci > -1) secs[ci] = { name: secs[ci].name, items: xc.concat(secs[ci].items) }; else secs.push({ name: "Controls", items: xc }); }
  const P = secs.map(x => { const ids = x.items.map(itE), sw = /^(switches|plugs?)$/i.test(x.name), lt = ids.filter(isLt); if (x.items.length && x.items.every(i => i.sensor)) return [x.name, grid(x.items), { k: "door", ids: x.items.map(i => i.sensor), off: [] }];
    return [x.name, grid(x.items, /^controls?$/i.test(x.name)), { k: "on", ids: sw || !lt.length ? ids.filter(onable) : lt, off: sw ? [] : lt }]; });
  const isCt = x => /^controls?$/i.test(x[0]), CT = P.filter(isCt); P.splice(0, P.length, ...P.filter(x => !isCt(x)));
  const cv = members(r.covers), fn = members(r.fans), dwl = members(r.doors).concat(members(r.windows)), dw = members(r.doors).map(e => ({ entity: e, kind: "door" })).concat(members(r.windows).map(e => ({ entity: e, kind: "window" }))), cl = [].concat(r.climate || []);
  if (cv.length) P.push(["Curtains", grid(cv), { k: "open", ids: cv, off: [], cv: 1 }]);
  if (fn.length) P.push(["Fans", grid(fn), { k: "on", ids: fn, off: [] }]);
  if (dw.length) P.push(["Doors & windows", '<div class="bl">' + dw.map(tileHtml).join("") + '</div>', { k: "open", ids: dwl, off: [] }]);
  if (cl.length) P.push(["Climate", '<div class="tg3">' + cl.map(climHtml).join("") + '</div>', { k: "on", ids: cl, off: [] }]);
  curPanels = P.map(p => p[2]);
  v.innerHTML = '<div class="rh"><a class="eb" href="#rooms">' + mdi("chevron-left") + ' ROOMS</a><h2><span class="rnm">' + esc(r.name) + '</span><span class="lbl" id="rvt">--</span></h2>' +
    (CT.length ? '<button class="eb cpb" data-cpo="1" aria-label="Automations"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg><span class="cpt">AUTOMATIONS</span><b class="cpn z">0</b></button>' : "") + '</div>' +
    (P.length ? P.map((p, i) => '<div class="pn pg" data-pi="' + i + '"' + (p[0] === "Doors & windows" ? ' data-sec="doors"' : "") + '><div class="lbl hd">' + esc(p[0]) + '<span class="rcnt"></span>' + (p[2].cv ? '<span class="rcv"><button class="eb" data-rcv="open">OPEN ALL</button><button class="eb" data-rcv="close">CLOSE ALL</button></span>' : "") + (p[2].off.length ? '<button class="eb roff" data-roff="' + i + '">ALL OFF</button>' : "") + '</div>' + p[1] + '</div>').join("") : CT.length ? "" : '<div class="pn lbl">No devices configured</div>');
  $("#cpp").innerHTML = CT.length ? '<div class="cpsh"><div class="cph"><div><div class="lbl">' + esc(r.name) + '</div><h3>Automations</h3></div><button class="eb" data-cpc="1">DONE</button></div><div class="cpl">' + CT.map(x => x[1].replace(/^<div class="tg3[^"]*">/, "").replace(/<\/div>$/, "")).join("") + '</div></div>' : "";
  $("#cpp").classList.remove("on"); cpTabs(r.id);
  updTiles(); lazyIn($("#rooms"));
}
function updTiles() {
  if (curRoom) { const r = curRoom, hv = roomHum(r); $("#rvt").textContent = f1(roomTemp(r)) + "°C" + (hv != null ? "  ·  " + f1(hv) + "% RH" : ""); }
  $$("#rv [data-e], #rv [data-c], #cpp [data-e], .cpanel [data-e], #alp [data-e], #np [data-e]").forEach(el => {
    if (el.dataset.sir) { sirenUpd(el); return; }
    const e = el.dataset.e || el.dataset.c, d = e.split(".")[0], s = states[e] || (VIRT[e] ? { state: String(sv(e) == null ? "unavailable" : sv(e)), attributes: {} } : undefined), n = $(".nm", el);   // a value the dashboard works out itself stands in when HA has no such entity
    if (!s) { el.classList.add("na"); return; }
    const a = s.attributes, st = s.state, on = (st === "on" || st === "open" || st === "opening") && !npGone(e);
    if (n && !el.dataset.n) n.textContent = a.friendly_name || e.split(".")[1].replace(/_/g, " ");
    if (n && el.dataset.nf) n.textContent = sv(el.dataset.nf) || "Curtains";
    if (el.dataset.si) { const si = JSON.parse(el.dataset.si), ic = on ? si.open : si.closed, sv0 = $(".tn svg", el); if (ic && sv0 && el.dataset.ic !== ic) { el.dataset.ic = ic; sv0.outerHTML = mdi(ic); } }
    if (el.dataset.s) {   // door-style tile: shows the contact sensor's open / closed
      const q = states[el.dataset.s], o = isOn(el.dataset.s);
      el.classList.toggle("na", !q || q.state === "unavailable"); el.classList.toggle("on", o);
      if (!el.dataset.arm) $(".ts2", el).textContent = !q ? "--" : o ? "OPEN" : "CLOSED";
      return;
    }
    el.classList.toggle("na", st === "unavailable"); el.classList.toggle("on", el.dataset.c ? st !== "off" : on);
    const hfx = el.dataset.c && st !== "off" && st !== "unavailable" ? hpFx() : null; if (el.dataset.c) { el.classList.toggle("hv", !!hfx); if (hfx) el.dataset.hm = hfx[0]; else delete el.dataset.hm; }
    if (el.classList.contains("bd")) { $(".st", el).textContent = on ? "OPEN" : "CLOSED"; if (el.dataset.k) $("i", el).innerHTML = mdi(el.dataset.k === "door" ? (on ? "m3-door-open" : "m3-door-back") : (on ? "m3-window-open" : "m3-window-closed")); return; }
    let t = st.toUpperCase(); const rg = $("input", el), idle = rg && document.activeElement !== rg && !(rg._d && rg._d > Date.now());   // not while a finger is on it, nor for 1.5s after (HA echoes the old value first)
    if (el.dataset.c) { showT(e); t = (a.current_temperature != null ? f1(a.current_temperature) + "°  ·  " : "") + (st === "off" ? "OFF" : hfx ? hfx[3] + "  ·  ON" : (MODE[st] || st).toUpperCase()); }
    else if (d === "light") { const rc = on && a.rgb_color; el.classList.toggle("lc", !!rc); if (rc) el.style.setProperty("--lc", rc.join(",")); const dm = (a.supported_color_modes || []).some(m => m !== "onoff"), b = a.brightness != null ? Math.round(a.brightness / 2.55) : 0; el.classList.toggle("dim", dm); t = on ? (dm ? b + "%" : "ON") : "OFF"; if (!(el._d && el._d > Date.now())) el.style.setProperty("--b", b + "%"); }
    else if (d === "cover") { const p = a.current_position, mv = covMove(e); el.classList.toggle("dim", p != null); el.classList.toggle("mv", !!mv); t = (mv || st).toUpperCase() + (p != null ? "  ·  " + p + "%" : ""); if (idle && p != null) rg.value = p; if (mv) covTick(); }
    else if (d === "select") t = st;
    if (!on && st === "on") t = "OFF";
    if (!(el._d && el._d > Date.now())) $(".ts2", el).textContent = el.dataset.sub || t;
  });
  if (curRoom) $$("#rv .pg[data-pi]").forEach(pn => {   // per-panel counts, and ALL OFF only while something in that light section is on
    const m = curPanels[+pn.dataset.pi]; if (!m) return;
    const q = x => { const e = states[x]; if (e && (CONFIG.countIfNotOff || []).indexOf(x) > -1) return !/^(off|unavailable|unknown|none)?$/i.test(e.state); return !!e && (/^climate\./.test(x) ? e.state !== "off" && e.state !== "unavailable" : isOn(x) && !npGone(x)); };
    const c = m.ids.filter(q).length, o = m.k === "open" || m.k === "door";
    $(".rcnt", pn).textContent = m.k === "door" && m.ids.length === 1 ? (c ? "· OPEN" : "· CLOSED") : c ? "· " + c + " of " + m.ids.length + (o ? " open" : " on") : "· " + (o ? "all closed" : "all off");
    const bt = $(".roff", pn); if (bt) bt.style.display = m.off.some(q) ? "" : "none";
    if (m.cv) { const mv = m.ids.map(covMove).filter(Boolean); if (mv.length) $(".rcnt", pn).textContent = "· " + (mv.every(x => x === mv[0]) ? mv[0] : "moving");
      const allOpen = m.ids.every(x => { const e = states[x]; return e && e.state === "open" && (e.attributes.current_position == null || e.attributes.current_position >= 99); });
      const bo = $('[data-rcv="open"]', pn), bc = $('[data-rcv="close"]', pn); if (bo) bo.style.display = allOpen ? "none" : ""; if (bc) bc.style.display = c ? "" : "none"; }
  });
  { const cb = $("#rv .cpn"); if (cb) { const n = $$("#cpp .tl.on").length; cb.textContent = n; cb.classList.toggle("z", !n); cb.parentNode.classList.toggle("on", !!n); } }
  if (LS.id) lsUpd();
  $$("#rv .bl").forEach(l => { const k = Array.prototype.slice.call(l.children), o = k.slice().sort((a, b) => b.classList.contains("on") - a.classList.contains("on")); if (o.some((x, i) => x !== k[i])) o.forEach(x => l.appendChild(x)); });
}
