// ---------- websocket ----------
function send(msg, cb) { if (!ws || ws.readyState !== 1) return; msg.id = msgId++; if (cb) pending[msg.id] = cb; ws.send(JSON.stringify(msg)); }
// curtains / covers: OPENING / CLOSING while they move. Uses HA's own opening/closing state when the device reports it,
// otherwise works it out from the position changing (or a command just sent) and clears 6 s after it stops changing.
const COVMV = {}, COVP = {};
function covMark(ids, dir) { [].concat(ids).forEach(id => { COVMV[id] = { d: dir, t: Date.now(), cmd: 1 }; }); covTick(); }
function covMove(id) {
  const e = states[id]; if (!e) return ""; if (e.state === "opening" || e.state === "closing") return e.state;
  const p = e.attributes.current_position, m = COVMV[id];
  if (p != null && COVP[id] != null && p !== COVP[id]) COVMV[id] = { d: p > COVP[id] ? "opening" : "closing", t: Date.now() };
  if (p != null) COVP[id] = p;
  const x = COVMV[id]; if (!x) return "";
  const done = p != null && ((x.d === "opening" && p >= 100) || (x.d === "closing" && p <= 0));
  if (done || Date.now() - x.t > (x.cmd ? 9000 : 6000)) { delete COVMV[id]; return ""; }
  return x.d;
}
let covT = 0; function covTick() { clearTimeout(covT); if (Object.keys(COVMV).length) covT = setTimeout(() => { updTiles(); covTick(); }, 1500); }
function call(domain, service, entity_id, data) { send({ type: "call_service", domain: domain, service: service, service_data: data || {}, target: { entity_id: entity_id } }); }
function setStatus(ok, text) { const s = $("#st"); s.textContent = text || (ok ? "LIVE" : "OFFLINE"); s.classList.toggle("bad", !ok); }
// who is signed in? 1) the Home Assistant page around the iframe  2) the frontend's own login in this browser  3) the token in CONFIG
let identDone = false;
function setUser(u) {
  if (!u) return; identDone = true;
  const nm = String(u.name || "").trim(), pe = Object.keys(states).filter(k => k.indexOf("person.") === 0 && states[k].attributes.user_id === u.id)[0], pid = pe ? pe.split(".")[1] : "";
  const none = (CONFIG.noNameUsers || []).some(x => [nm.toLowerCase(), pid.toLowerCase()].indexOf(String(x).toLowerCase()) > -1);
  userKnown = true; userName = none ? "" : nm;
  try { localStorage.setItem("dashUser", none ? "-" : nm); } catch (_) {}
  ME = { id: String(u.id || ""), name: nm, pid: pid, admin: !!u.is_admin }; ruRefresh(); if (ME.admin && curPg() === "theme") drawPalette();
  tick(); bootMark("u");
}
function identify() {
  try { const u = window.parent !== window && window.parent.document.querySelector("home-assistant").hass.user; if (u && u.name) { setUser(u); return; } } catch (_) {}
  const viaCfg = () => send({ type: "auth/current_user" }, setUser);
  let tk = ""; try { tk = JSON.parse(localStorage.getItem("hassTokens") || "{}").access_token || ""; } catch (_) {}
  if (!tk) { viaCfg(); return; }
  try {
    const w = new WebSocket(CONFIG.url.replace(/^http/, "ws") + "/api/websocket"); let ok = false;
    w.onmessage = e => { const m = JSON.parse(e.data);
      if (m.type === "auth_required") w.send(JSON.stringify({ type: "auth", access_token: tk }));
      else if (m.type === "auth_ok") w.send(JSON.stringify({ id: 1, type: "auth/current_user" }));
      else if (m.type === "auth_invalid") { w.close(); viaCfg(); }
      else if (m.type === "result" && m.id === 1) { ok = true; w.close(); if (m.result) setUser(m.result); else viaCfg(); } };
    w.onerror = () => { if (!ok) viaCfg(); };
  } catch (_) { viaCfg(); }
}
// This device's clock can differ from Home Assistant's by a few seconds (common on phones). Every event carries HA's own timestamp,
// so the smallest gap seen recently = clock difference (+ network delay). Playback positions are measured against HA's clock.
let SKEW = 0; const skS = [];
const srvNow = () => Date.now() - SKEW;
function skewSample(t) { if (isNaN(t)) return; skS.push(t); if (skS.length > 40) skS.shift(); SKEW = Math.min.apply(null, skS); }
function connect() {
  getToken(forceTok).then(tk => { forceTok = false; openWs(tk); }).catch(err => {
    if (err && err.code === "login") showLogin(err.msg); else { setStatus(false); setTimeout(connect, 5000); }
  });
}
function openWs(tk) {
  ws = new WebSocket(CONFIG.url.replace(/^http/, "ws") + "/api/websocket");
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === "auth_required") ws.send(JSON.stringify({ type: "auth", access_token: tk }));
    else if (m.type === "auth_invalid") authBad();
    else if (m.type === "auth_ok") {
      setStatus(true); hideLogin();
      send({ type: "get_states" }, list => { list.forEach(setState); palTick(); vGroups(); buildDep(); drawGsum(); if (cards[MAIN]) render(MAIN); if (!identDone) identify(); batTick(); tick(); bootMark("s"); setTimeout(bootGo, 1400); if (camPage()) startCams(); if (onRooms) { if (curRoom) drawRoom(curRoom.id); else updRooms(); } });
      send({ type: "subscribe_events", event_type: "state_changed" });
      loadFc(); loadFcH(); evBtn(); if (curPg() === "energy") { en.busy = false; loadEnergy(); }
    } else if (m.type === "result" && pending[m.id]) { try { pending[m.id](m.result, m); } catch (x) {} delete pending[m.id]; }
    else if (m.type === "event") { if (m.event && m.event.event_type === "state_changed") skewSample(Date.now() - Date.parse(m.event.time_fired)); if (subs[m.id]) subs[m.id](m.event); else if (m.event.data && m.event.data.new_state) setState(m.event.data.new_state); }
  };
  ws.onclose = () => { if (loginUp) return; setStatus(false); setTimeout(connect, 3000); };
}
let hq = 0;
function queueHome() { if (!hq) hq = requestAnimationFrame(() => { hq = 0; home(); }); }
function drawGsum() {
  const e = CONFIG.houseAvg || CONFIG.indoor, v = sv(e), el = $("#gsum"); if (!el) return;
  el.style.setProperty("--tc", v != null ? tempColor(parseFloat(v)) : "rgba(245,245,245,.5)");
  el.innerHTML = '<div><div class="lbl">' + mdi("thermometer") + ' House average</div></div><div class="gv">' + (v != null ? f1(v) : "--") + '<small>°C</small></div>';
}
function setState(s) {
  const id = s.entity_id;
  if (!vBusy) { REAL[id] = 1; if (VGM[id]) { clearTimeout(vTm); vTm = setTimeout(vGroups, 120); } }
  if (id === (CONFIG.houseAvg || CONFIG.indoor)) { states[id] = s; drawGsum(); }
  if (id === CONFIG.outside) $("#outs").textContent = f1(s.state) + "°C";
  states[id] = s;
  galOnState(id, s);
  if (id === E("access")) ruRefresh();
  if (/_camera_(person|vehicle)$/.test(id)) detAll();
  if (T[id] && T[id].sent) { T[id].v = null; T[id].sent = 0; }
  if (cards[MAIN] && id !== MAIN && CONFIG.derived.houseTemps.indexOf(id) > -1) render(MAIN);   // heat pump card shows the house average when the unit has no sensor
  if (cards[MAIN] && id !== MAIN && id.indexOf("climate.") === 0) render(MAIN);
  if (cards[id]) { render(id); if (id === MAIN) CONFIG.rooms.forEach(r => { if (!r.main) render(r.id); }); }
  if (id === W || id === CONFIG.indoor || (/^(sensor\.(current_wind_speed|weather_condition_icon)|sun\.sun)$/.test(id) || id === E("outdoorTemp")) || id.indexOf("climate.") === 0 || sensorIds[id] || DEP[id]) queueHome();
  if (onRooms || onSec() || camOpen()) queueRoom();
  if (id === CONFIG.alarm) drawAlarm();
  if (onView()) applyView(); else if (CONFIG.view.popup && s.state === "on" && (CONFIG.view.driveway.trig.concat(CONFIG.view.garage.trig)).indexOf(id) > -1 && VW) { VW.back = location.hash || "#home"; location.hash = "#view/auto"; }
  const rx = REL[curPg()]; if (rx && rx.test(id)) queuePg();
  if (NREL.test(id) || nskRel(id)) queueNotif();
  if (curRoom && id.indexOf("timer.") === 0) queueRoom();   // a tile's countdown starts or ends
  if (onRooms && !curRoom && CONFIG.roomsByPresence !== false && /^(binary_sensor|input_boolean)\./.test(id) && CONFIG.house.some(r => occOf(r).indexOf(id) > -1)) queueRl();
  if (id.indexOf("media_player.") === 0 && CONFIG.media && CONFIG.media.indexOf(id) > -1) queueNp();
  if ({ light: 1, switch: 1, binary_sensor: 1, group: 1, cover: 1 }[id.split(".")[0]]) queueHome();
}

