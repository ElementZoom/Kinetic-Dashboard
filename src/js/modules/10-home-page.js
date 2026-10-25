// ---------- home page ----------
function home() {
  const w = states[W], a = w ? w.attributes : {}, hp = states[MAIN], ha = hp ? hp.attributes : {};
  const cd = w ? (COND[w.state] || ["", title(w.state)]) : ["", ""], ot = sv(E("outdoorTemp")), rd = states[E("rainDetected")], raining = !!rd && rd.state === "on", dry = !!rd && rd.state === "off";
  const ic = "", unit = a.temperature_unit || "°C", wsp = null;   // icon and wind come straight from the weather entity
  $("#wchip").innerHTML = w ? (raining ? mdi("weather-pouring") : MDI[ic] ? mdi(ic) : wic(w.state)) + " " + f1(ot != null ? ot : a.temperature) + " " + unit + ", " + (dry ? "Dry" : cd[1]) : "--";
  $("#wwind").innerHTML = w ? mdi("weather-windy") + " " + (wsp != null ? wsp : a.wind_speed != null ? Math.round(a.wind_speed) : "--") + " " + (a.wind_speed_unit || "km/h") : "";
  wfxSet(w ? w.state : "", raining, parseFloat(wsp != null ? wsp : a.wind_speed) || 0);
  if (fc[0]) $("#whl").textContent = "High " + Math.round(fc[0].temperature) + "° / Low " + Math.round(fc[0].templow != null ? fc[0].templow : fc[0].temperature) + "°";
  if (!CONFIG.outside && w) $("#outs").textContent = f1(a.temperature) + "°C";
  $("#mi").textContent = f1(sv(CONFIG.indoor) != null ? sv(CONFIG.indoor) : ha.current_temperature) + "°C";
  $("#mo").textContent = f1(a.temperature) + "°C";
  { const iv = parseFloat(sv(CONFIG.indoor) != null ? sv(CONFIG.indoor) : ha.current_temperature), ov = parseFloat(a.temperature); $("#mid").style.setProperty("--tc", tempColor(iv)); $("#mod").style.setProperty("--tc", tempColor(ov)); }
  showT(MAIN);
  $$("#mm .chip").forEach(b => b.classList.toggle("on", !!hp && b.dataset.m === hp.state));
  tileEls.forEach(x => { x.el.style.display = x.t.room && !roomOK(x.t.room) ? "none" : ""; fillCard(x.el, ROOM(x.t.room) || x.t); });
}
// glow uses its own saturated colours so it stays vivid on any theme (the pastel palette turns grey over tinted backgrounds)
const GLOW = ["#af9bec", "#78acfc", "#62cdec", "#80d89c", "#fcd36a", "#ffa368", "#f87b80"];
function glowColor(t) { return isNaN(t) ? "transparent" : GLOW[t < 13 ? 0 : t < 16 ? 1 : t < 19 ? 2 : t < 22 ? 3 : t < 24 ? 4 : t < 27 ? 5 : 6]; }
function tempColor(t) {
  if (t == null || isNaN(t)) return "rgba(245,245,245,0.7)";
  return "rgba(" + rgbOf(PAL.temp[t < 13 ? 0 : t < 16 ? 1 : t < 19 ? 2 : t < 22 ? 3 : t < 24 ? 4 : t < 27 ? 5 : 6]) + ",0.7)";
}
function loadFc() {
  send({ type: "call_service", domain: "weather", service: "get_forecasts", service_data: { type: "daily" }, target: { entity_id: W }, return_response: true },
    r => { bootMark("f"); fc = r.response[W].forecast || []; drawFc(); home(); });
}
function fcCols(l) {
  const L = d => d.templow != null ? d.templow : d.temperature;
  const lo = Math.min.apply(null, l.map(L)), hi = Math.max.apply(null, l.map(d => d.temperature)), rg = (hi - lo) || 1, tc = t => tempColor(t).replace(/,0\.7\)$/, ",1)");
  return '<div class="fcc">' + l.map((d, i) => {
    const dt = new Date(d.datetime), n = i === 0 && dt.toDateString() === new Date().toDateString() ? "Today" : dt.toLocaleDateString([], { weekday: "short" }), l0 = L(d), h = d.temperature;
    const p = d.precipitation_probability, rain = p != null && p >= 30 ? '<em>' + mdi("water") + p + '%</em>' : '<em class="no"></em>';
    return '<div' + (n === "Today" ? ' class="td"' : '') + ' style="--hc:' + tc(h) + ';--lc:' + tc(l0) + '"><span class="lbl">' + n + '</span><i class="wb">' + wic(d.condition) + '</i><b>' + Math.round(h) + '°</b>' +
      '<span class="th"><u style="bottom:' + ((l0 - lo) / rg * 100) + '%;height:' + Math.max(12, (h - l0) / rg * 100) + '%"></u></span><small>' + Math.round(l0) + '°</small>' + rain + '</div>';
  }).join("") + '</div>';
}
function drawFc() { $("#fc").innerHTML = fc.length ? fcCols(fc.slice(0, 10)) : ""; }
const EVPAL = ["#ff6b6b", "#ff9f7a", "#f0d36b", "#8ff0c4", "#4fd1c5", "#6bb8ff", "#8d7bff", "#c79bff", "#ff8fc7", "#b8c0cc"];
let EVCOL = (() => { try { return JSON.parse(localStorage.dashEvCol || "{}") || {}; } catch (e) { return {}; } })(), evColSynced = false;
const evKey = (cal, t) => cal + "|" + (t || "").trim().toLowerCase();
function evColSave() { try { localStorage.dashEvCol = JSON.stringify(EVCOL); } catch (e) {} send({ type: "frontend/set_user_data", key: "dash_evcol", value: EVCOL }); }
function evColSync() { if (evColSynced) return; evColSynced = true; send({ type: "frontend/get_user_data", key: "dash_evcol" }, (r, m) => { const v = r && r.value; if (v && typeof v === "object") { EVCOL = Object.assign({}, v, EVCOL); try { localStorage.dashEvCol = JSON.stringify(EVCOL); } catch (e) {} loadEvents(); } }); }
const CALCOL = ["#6bb8ff", "#ff9f7a", "#8ff0c4", "#f0d36b", "#c79bff", "#ff7a6b"];
let evWasOn = false; let cy = new Date().getFullYear(), cm = new Date().getMonth(), evTok = 0, evJump = true;   // evJump: phone agenda scrolls to today (or the next event day) on entry / month change
const dk = d => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
const pd = v => { if (v.dateTime) return new Date(v.dateTime); const p = v.date.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
const calName = c => (CONFIG.calNames || {})[c] || (states[c] && states[c].attributes.friendly_name) || c.replace("calendar.", "").replace(/_/g, " ");
const mrows = () => Math.ceil(((new Date(cy, cm, 1).getDay() + 6) % 7 + new Date(cy, cm + 1, 0).getDate()) / 7);
let EVS = [], evLast = {};
function loadEvents() {
  EVS = []; evColSync(); const evErr = [];
  const gs = new Date(cy, cm, 1 - (new Date(cy, cm, 1).getDay() + 6) % 7), ge = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + mrows() * 7), map = {}, tok = ++evTok;
  const q = "?start=" + encodeURIComponent(gs.toISOString()) + "&end=" + encodeURIComponent(ge.toISOString());
  const mk = cy + "-" + cm; if (evLast.k === mk) drawEvents(evLast.gs, evLast.map); else drawEvents(gs, map);   // same month: keep what is on screen until the new answer is in (no blink)
  Promise.all(CONFIG.calendars.map((c, i) => getToken().then(tk => fetch(CONFIG.url + "/api/calendars/" + c + q, { headers: { Authorization: "Bearer " + tk } }))
    .then(r => r.text().then(t => { let j = null; try { j = JSON.parse(t); } catch (x) {} if (!Array.isArray(j)) { const st = states[c]; throw new Error(r.status === 404 || !t ? (st ? "HTTP " + r.status + " (HA sent no events: the calendar may be unavailable or still loading)" : "no calendar with this id exists in Home Assistant") : (j && (j.message || j.error)) || ("HTTP " + r.status)); } return j; })).then(l => l.forEach(v => { try {
      const s = pd(v.start), e = pd(v.end), ad = !v.start.dateTime;
      const last = ad ? new Date(e.getFullYear(), e.getMonth(), e.getDate() - 1) : new Date(e.getFullYear(), e.getMonth(), e.getDate());
      let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      for (let n = 0; n < 42 && d <= last; n++, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
        (map[dk(d)] = map[dk(d)] || []).push({ t: s, ad: ad, s: v.summary, c: EVCOL[evKey(c, v.summary)] || CALCOL[i % CALCOL.length], i: EVS.push({ v: v, cal: c, ci: i }) - 1 });
    } catch (x) { evErr.push(calName(c) + ": skipped \"" + (v && v.summary || "?") + "\" (" + x.message + ")"); } })).catch(x => { evErr.push(calName(c) + ": " + x.message); }))).then(() => { if (tok === evTok) { evLast = { k: mk, gs: gs, map: map }; drawEvents(gs, map, true); const el = $("#eerr"); if (el) el.textContent = evErr.length ? evErr.join(" · ") + "  |  Calendars HA has: " + Object.keys(states).filter(k => k.indexOf("calendar.") === 0).join(", ") : ""; } });
}
function drawEvents(gs, map, fin) {
  $("#et").textContent = new Date(cy, cm, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  evBtn();
  if (!$("#eerr")) { const e = document.createElement("div"); e.id = "eerr"; e.style.cssText = "color:var(--heat);font-size:12px;margin:6px 2px;empty-cells:hide"; $("#elg").after(e); }
  $("#elg").innerHTML = CONFIG.calendars.map((c, i) => '<span><i style="--c:' + CALCOL[i % CALCOL.length] + '"></i>' + esc(calName(c)) + '</span>').join("");
  const today = dk(new Date()), rows = mrows(), g = $("#cg");
  const tm = v => v.t.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase();
  const srt = l => l.sort((a, b) => (b.ad - a.ad) || (a.t - b.t));
  let h = "";
  if (isMobile()) {   // phones: agenda list instead of a month grid
    for (let i = 1, dim = new Date(cy, cm + 1, 0).getDate(); i <= dim; i++) {
      const d = new Date(cy, cm, i), l = srt(map[dk(d)] || []); if (!l.length) continue;
      h += (dk(d) === today ? '<div class="agt">' : "") + '<div class="ah' + (dk(d) >= today ? " up" : "") + (dk(d) === today ? " t" : "") + '">' + d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + '</div>' +
        l.map(v => '<div class="ce" data-ev="' + v.i + '" style="--c:' + v.c + '"><span class="mo">' + (v.ad ? "All day" : tm(v)) + '</span> ' + esc(v.s) + '</div>').join("") + (dk(d) === today ? "</div>" : "");
    }
    g.className = "cg ag"; g.innerHTML = h || '<div class="lbl" style="margin-top:18px">No events this month</div>';
    if (evJump) { const f = g.querySelector(".ah.up"); if (f && cy === new Date().getFullYear() && cm === new Date().getMonth()) f.scrollIntoView({ block: "start" }); if (fin) evJump = false; }   // current month: start at today / the next event, earlier days stay above to scroll back to
    return;
  }
  h = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(n => '<div class="cw">' + n + '</div>').join("");
  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i), k = dk(d), l = srt(map[k] || []);
    h += '<div class="cd' + (d.getMonth() !== cm ? " o" : "") + (k === today ? " t" : "") + '" data-d="' + k + '"><div class="n">' + d.getDate() + '</div>' +
      l.slice(0, 3).map(v => '<div class="ce" data-ev="' + v.i + '" style="--c:' + v.c + '">' + (v.ad ? "" : '<span class="mo">' + tm(v) + '</span> ') + esc(v.s) + '</div>').join("") +
      (l.length > 3 ? '<div class="mo">+' + (l.length - 3) + ' more</div>' : "") + '</div>';
  }
  g.className = "cg"; g.style.setProperty("--rows", rows); g.innerHTML = h;
}
// ----- add / edit / delete events (Home Assistant calendar websocket API) -----
const evCanUpdate = c => { const x = states[c]; return !!x && ((+x.attributes.supported_features || 0) & 4) > 0; };
const evWritable = () => CONFIG.calendars.filter(c => { const s = states[c]; return s && ((+s.attributes.supported_features || 0) & 1); });
const p2 = n => ("0" + n).slice(-2), ymd = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()), hm = d => p2(d.getHours()) + ":" + p2(d.getMinutes());
const addDays = (k, n) => { const a = k.split("-"); return ymd(new Date(+a[0], +a[1] - 1, +a[2] + n)); };
const tzo = d => { const o = -d.getTimezoneOffset(), a = Math.abs(o); return (o < 0 ? "-" : "+") + p2(Math.floor(a / 60)) + ":" + p2(a % 60); };
const dtIso = (d, t) => { const x = new Date(d + "T" + t + ":00"); return d + "T" + t + ":00" + tzo(x); };
const WD = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"], WDN = ["M", "T", "W", "T", "F", "S", "S"];
// restart the tab-switch animation on el (dir: +1 slides in from the right, -1 from the left; stag: stagger its children)
function txGo(el, dir, stag) {
  if (!el || (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches)) return;
  el.classList.remove("tx", "txc"); void el.offsetWidth;
  el.style.setProperty("--tx", (dir || 0) * 28 + "px"); el.style.setProperty("--ty", dir ? "6px" : "14px");
  if (stag) Array.prototype.forEach.call(el.children, (c, i) => c.style.setProperty("--i", Math.min(i, 14)));
  el.classList.add(stag ? "txc" : "tx");
  clearTimeout(el._tx); el._tx = setTimeout(() => el.classList.remove("tx", "txc"), 1100);
}
let evS = null;
function evBtn() { const b = $("#eadd"); if (b) b.style.display = evWritable().length ? "" : "none"; }
function evOpen(o) {   // o: {ev} to edit, or {date} to add
  const wr = evWritable(), e = o.ev, v = e && e.v;
  let st = { edit: !!e, cal: e ? e.cal : (wr[0] || ""), title: "", ad: false, sd: o.date || ymd(new Date()), st: "09:00", ed: "", et: "10:00", loc: "", note: "", col: "", rep: "", n: 2, unit: "weekly", days: [], until: "", scope: "all", msg: "" };
  if (e) {
    const s0 = pd(v.start), e0 = pd(v.end), ad = !v.start.dateTime;
    st.title = v.summary || ""; st.col = EVCOL[evKey(e.cal, v.summary)] || ""; st.key0 = evKey(e.cal, v.summary); st.ad = ad; st.sd = ymd(s0); st.loc = v.location || ""; st.note = v.description || "";
    if (ad) st.ed = addDays(ymd(e0), -1); else { st.st = hm(s0); st.ed = ymd(e0); st.et = hm(e0); }
    const r = v.rrule || ""; if (r) { const f = (/FREQ=(\w+)/.exec(r) || [])[1]; st.rep = f ? f.toLowerCase() : ""; const iv = +(/INTERVAL=(\d+)/.exec(r) || [])[1] || 1; if (iv > 1 && st.rep) { st.unit = st.rep; st.n = iv; st.rep = "custom"; } const b = (/BYDAY=([A-Z,]+)/.exec(r) || [])[1]; if (b) st.days = b.split(","); const u = (/UNTIL=(\d{4})(\d{2})(\d{2})/.exec(r)); if (u) st.until = u[1] + "-" + u[2] + "-" + u[3]; }
    st.recur = !!(v.rrule || v.recurrence_id); st.noUid = !v.uid; st.src = e; if (st.recur && !evCanUpdate(st.cal)) st.scope = "following";
  } else { st.ed = st.sd; }
  evS = st; evDraw(); document.body.classList.add("ev-open");
}
function evClose() { $("#evq").classList.remove("on"); document.body.classList.remove("ev-open"); evS = null; }
function evFreq(s) { return s.rep === "custom" ? s.unit : s.rep; }
function evDraw() {
  const s = evS, wr = evWritable(), cs = s.edit ? [s.cal] : wr, ro = s.edit && s.noUid;
  const f = (l, h) => '<label><span class="lbl">' + l + '</span>' + h + '</label>';
  const col = c => CALCOL[CONFIG.calendars.indexOf(c) % CALCOL.length];
  $("#evp").innerHTML = '<div class="evh"><h3>' + (s.edit ? "Edit event" : "New event") + '</h3><button class="evx" data-x="close" aria-label="Close">' + mdi("close") + '</button></div><div class="evbody"><div class="evf">' +
    f("Title", '<input type="text" id="evt" value="' + esc(s.title) + '" placeholder="What\'s happening?" autocomplete="off">') +
    '<div><span class="lbl">Calendar</span><div class="evc" style="margin-top:6px">' + cs.map(c => '<button data-cal="' + c + '" class="' + (c === s.cal ? "on" : "") + '" style="--c:' + col(c) + '"><i></i>' + esc(calName(c)) + '</button>').join("") + '</div></div>' +
    '<div><span class="lbl">Colour</span><div class="evc evsw" style="margin-top:6px"><button data-col="" class="auto' + (!s.col ? " on" : "") + '" style="--c:' + col(s.cal) + '"><i></i>Same as calendar</button>' + EVPAL.map(c => '<button data-col="' + c + '" class="csw' + (s.col === c ? " on" : "") + '" style="--c:' + c + '" aria-label="Colour ' + c + '"></button>').join("") + '</div></div>' +
    '<div class="evs"><b>All day</b><button class="evt' + (s.ad ? " on" : "") + '" data-ad="1" aria-label="All day"></button></div>' +
    '<div class="evr' + (s.ad ? " one" : "") + '">' + f("Starts", '<input type="date" id="evsd" value="' + s.sd + '">') + (s.ad ? "" : f("&nbsp;", '<input type="time" id="evst" value="' + s.st + '">')) + '</div>' +
    '<div class="evr' + (s.ad ? " one" : "") + '">' + f("Ends", '<input type="date" id="eved" value="' + s.ed + '">') + (s.ad ? "" : f("&nbsp;", '<input type="time" id="evet" value="' + s.et + '">')) + '</div>' +
    f("Repeat", '<select id="evrp">' + [["", "Does not repeat"], ["daily", "Every day"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"], ["custom", "Custom…"]].map(x => '<option value="' + x[0] + '"' + (x[0] === s.rep ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select>') +
    (s.rep === "custom" ? '<div class="evr cu"><label><span class="lbl">Every</span><input type="number" id="evn" min="1" max="99" value="' + s.n + '" inputmode="numeric"></label><label><span class="lbl">&nbsp;</span><select id="evun2">' + [["daily", "day(s)"], ["weekly", "week(s)"], ["monthly", "month(s)"], ["yearly", "year(s)"]].map(x => '<option value="' + x[0] + '"' + (x[0] === s.unit ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select></label></div>' : "") +
    (evFreq(s) === "weekly" ? '<div class="evc">' + WD.map((d, i) => '<button class="wd' + (s.days.indexOf(d) > -1 ? " on" : "") + '" data-wd="' + d + '">' + WDN[i] + '</button>').join("") + '</div>' : "") +
    (s.rep ? f("Repeat until (optional)", '<input type="date" id="evun" value="' + s.until + '">') : "") +
    f("Location", '<input type="text" id="evlc" value="' + esc(s.loc) + '" autocomplete="off">') + f("Notes", '<textarea id="evnt">' + esc(s.note) + '</textarea>') +
    (s.edit && s.recur ? '<div><span class="lbl">Apply changes to</span><div class="evc" style="margin-top:6px">' + [["this", "This event"], ["following", "This and following"], ["all", "All events"]].filter(x => x[0] !== "all" || evCanUpdate(s.cal)).map(x => '<button data-sc="' + x[0] + '" class="' + (s.scope === x[0] ? "on" : "") + '">' + x[1] + '</button>').join("") + '</div></div>' : "") +
    '<div class="evm2" id="evmsg">' + (ro ? "This event can't be edited (no ID from the calendar)." : esc(s.msg)) + '</div>' +
    '</div></div><div class="evact">' + (s.edit ? '<button class="evdel" data-x="del"' + (ro ? " disabled" : "") + '>Delete</button><button class="evdup" data-x="dup">Duplicate</button>' : "") + '<button class="sv" data-x="save"' + (ro || !cs.length ? " disabled" : "") + '>' + (s.edit ? "Save" : "Add event") + '</button></div>';
}
function evRead() {   // keep what was typed when the sheet redraws
  const s = evS; if (!s) return; const g = id => { const x = $("#" + id); return x ? x.value : null; };
  s.title = g("evt") != null ? g("evt") : s.title; s.sd = g("evsd") || s.sd; s.ed = g("eved") || s.ed; if (g("evst")) s.st = g("evst"); if (g("evet")) s.et = g("evet");
  if (g("evlc") != null) s.loc = g("evlc"); if (g("evnt") != null) s.note = g("evnt"); if (g("evun") != null) s.until = g("evun"); if (g("evn") != null) s.n = Math.max(1, Math.min(99, parseInt(g("evn"), 10) || 1)); if (g("evun2")) s.unit = g("evun2");
}
function evSave() {
  evRead(); const fin = () => { const k = evKey(evS.cal, evS.title); if (evS.key0 && evS.key0 !== k) delete EVCOL[evS.key0]; if (evS.col) EVCOL[k] = evS.col; else delete EVCOL[k]; evColSave(); }; const s = evS, m = t => { s.msg = t; $("#evmsg").textContent = t; };
  if (!s.title.trim()) return m("Add a title first.");
  if (!s.sd || !s.ed) return m("Pick the dates.");
  const ev = { summary: s.title.trim() };
  if (s.ad) { ev.dtstart = s.sd; ev.dtend = addDays(s.ed < s.sd ? s.sd : s.ed, 1); }
  else { ev.dtstart = dtIso(s.sd, s.st); ev.dtend = dtIso(s.ed, s.et); if (new Date(ev.dtend) <= new Date(ev.dtstart)) return m("The end has to be after the start."); }
  ev.location = s.loc.trim(); ev.description = s.note.trim();
  if (s.rep) {
    const fq = evFreq(s); let r = "FREQ=" + fq.toUpperCase(); if (s.rep === "custom" && s.n > 1) r += ";INTERVAL=" + s.n; if (fq === "weekly" && s.days.length) r += ";BYDAY=" + s.days.join(",");
    if (s.until) r += ";UNTIL=" + (s.ad ? s.until.replace(/-/g, "") : new Date(s.until + "T23:59:59").toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""));
    ev.rrule = r;
  } else if (s.edit) ev.rrule = "";
  const b = $("#evp .sv"), reset = () => { b.disabled = false; b.textContent = s.edit ? "Save" : "Add event"; };
  if (s.edit && !evCanUpdate(s.cal)) {   // this calendar (e.g. Google) can't update in place: add the new version, then remove the old one
    if (s.recur && s.scope === "all") s.scope = "following";
    if (s.recur && s.scope === "this") delete ev.rrule;
    if (!ev.rrule) delete ev.rrule;
    b.disabled = true; b.textContent = "Saving…";
    return send({ type: "calendar/event/create", entity_id: s.cal, event: ev }, (r, m2) => {
      if (m2 && m2.success === false) { reset(); return m((m2.error && m2.error.message) || "Couldn't save."); }
      send(Object.assign({ type: "calendar/event/delete", entity_id: s.cal }, evTarget()), (r2, m3) => {
        if (m3 && m3.success === false) { evClose(); loadEvents(); alert("The updated event was added, but the old one couldn't be removed. Please delete the old copy."); return; }
        fin(); evClose(); loadEvents(); setTimeout(loadEvents, 3000);
      });
    });
  }
  const msg = { type: "calendar/event/" + (s.edit ? "update" : "create"), entity_id: s.cal, event: ev };
  if (s.edit) Object.assign(msg, evTarget());
  b.disabled = true; b.textContent = "Saving…";
  send(msg, (r, m2) => { if (m2 && m2.success === false) { b.disabled = false; b.textContent = s.edit ? "Save" : "Add event"; return m((m2.error && m2.error.message) || "Couldn't save."); } fin(); evClose(); loadEvents(); setTimeout(loadEvents, 3000); });
}
function evTarget() {
  const s = evS, v = (s.src || {}).v || {}, o = { uid: v.uid };
  if (s.recur && s.scope !== "all" && v.recurrence_id) { o.recurrence_id = v.recurrence_id; if (s.scope === "following") o.recurrence_range = "THISANDFUTURE"; }
  return o;
}
function evDup() {
  const s = evS; evS = Object.assign({}, s, { edit: false, src: null, recur: false, noUid: false, scope: "all", days: s.days.slice(), msg: "" });
  document.querySelector("#evp .evh h3").textContent = "New event"; evDraw();
  const t = $("#evt"); if (t) { t.focus(); t.select(); }
}
function evDelete() {
  const s = evS, sc = { this: "Only this event will be deleted.", following: "This event and all the ones after it will be deleted.", all: "Every event in this series will be deleted." };
  $("#evq .evqc").innerHTML = '<h4>Delete this event?</h4><p><b>' + esc(s.title || "Untitled") + '</b><br>' + (s.recur ? sc[s.scope] || sc.all : "This can't be undone.") + '</p><div class="qb"><button data-q="no">Cancel</button><button class="qd" data-q="yes">Delete</button></div>';
  $("#evq").classList.add("on"); const n = $("#evq [data-q=no]"); if (n) n.focus();
}
function evDelNo() { $("#evq").classList.remove("on"); }
function evDelYes() {
  const s = evS, b = $("#evq [data-q=yes]"); b.disabled = true; b.textContent = "Deleting…";
  const msg = Object.assign({ type: "calendar/event/delete", entity_id: s.cal }, evTarget());
  send(msg, (r, m2) => { evDelNo(); if (m2 && m2.success === false) { $("#evmsg").textContent = (m2.error && m2.error.message) || "Couldn't delete."; return; } evClose(); loadEvents(); });
}
$("#evq").addEventListener("click", e => { const q = e.target.closest("[data-q]"); if (q) { if (q.dataset.q === "yes") evDelYes(); else evDelNo(); } else if (e.target.id === "evq") evDelNo(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#evq").classList.contains("on")) { e.stopPropagation(); evDelNo(); } }, true);
$("#evp").addEventListener("click", e => {
  const t = e.target; if (!evS) return; evRead();
  const cal = t.closest("[data-cal]"), ad = t.closest("[data-ad]"), wd = t.closest("[data-wd]"), cl = t.closest("[data-col]"), sc = t.closest("[data-sc]"), x = t.closest("[data-x]");
  if (cal) { evS.cal = cal.dataset.cal; evDraw(); }
  else if (ad) { evS.ad = !evS.ad; evDraw(); }
  else if (cl) { evRead(); evS.col = cl.dataset.col; evDraw(); }
  else if (wd) { const i = evS.days.indexOf(wd.dataset.wd); if (i > -1) evS.days.splice(i, 1); else evS.days.push(wd.dataset.wd); evDraw(); }
  else if (sc) { evS.scope = sc.dataset.sc; evDraw(); }
  else if (x) { const k = x.dataset.x; if (k === "close") evClose(); else if (k === "save") evSave(); else if (k === "del") evDelete(); else if (k === "dup") evDup(); }
});
$("#evp").addEventListener("change", e => { if (!evS) return; if (e.target.id === "evrp") { evRead(); evS.rep = e.target.value; if (evFreq(evS) === "weekly" && !evS.days.length) evS.days = [WD[(new Date(evS.sd + "T00:00").getDay() + 6) % 7]]; evDraw(); } else if (e.target.id === "evun2") { evRead(); if (evFreq(evS) === "weekly" && !evS.days.length) evS.days = [WD[(new Date(evS.sd + "T00:00").getDay() + 6) % 7]]; evDraw(); } else if (e.target.id === "evsd") { evRead(); if (evS.ed < evS.sd) evS.ed = evS.sd; evDraw(); } });
$("#evb").onclick = evClose; document.addEventListener("keydown", e => { if (e.key === "Escape" && evS) evClose(); });
$("#eadd").onclick = () => evOpen({});
setInterval(evBtn, 2500);
setInterval(() => { if (curPg() === "events" && !evS && !document.hidden) loadEvents(); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && curPg() === "events" && !evS) loadEvents(); });
$("#cg").addEventListener("click", e => {
  const ce = e.target.closest("[data-ev]"), cd = e.target.closest("[data-d]");
  if (ce) { const x = EVS[+ce.dataset.ev]; if (x) evOpen({ ev: x }); }
  else if (cd && evWritable().length) evOpen({ date: cd.dataset.d });
});
function shiftMonth(d) { txGo($("#cg"), d, false); evJump = true; cm += d; if (cm < 0) { cm = 11; cy--; } if (cm > 11) { cm = 0; cy++; } loadEvents(); }
$("#ep").onclick = () => shiftMonth(-1); $("#en").onclick = () => shiftMonth(1);
$("#etd").onclick = () => { evJump = true; cy = new Date().getFullYear(); cm = new Date().getMonth(); loadEvents(); };
const HOME = { status: ".hs", cams: "#cams", rooms: "#rooms", heatpump: "#mini", nowplaying: "#npw", forecast: "#fcp" };
const layout = () => {
  const L = ((CONFIG.layout || {})[isMobile() ? "mobile" : "tablet"] || Object.keys(HOME)).slice();
  if (!isMobile()) { const k = L.indexOf("nowplaying"); if (k > -1) L.splice(k, 1); return L; }
  if (L.indexOf("nowplaying") < 0) { const i = L.indexOf("heatpump") > -1 ? L.indexOf("heatpump") : L.indexOf("status"); L.splice(i + 1, 0, "nowplaying"); }
  return L;
};
const camsOn = () => layout().indexOf("cams") > -1;
function applyLayout() {
  const L = layout();
  Object.keys(HOME).forEach(k => { const el = $(HOME[k]), i = L.indexOf(k); el.style.display = i < 0 ? "none" : ""; el.style.order = i < 0 ? 0 : i; });
}
function cams() {   // snapshot fallback for cameras that aren't live
  if (!camPage() || (onHome() && !camsOn())) return;
  camList().forEach(c => { if (!c.live) camSnap(c); });
}
const camMem = {   // one small still per camera kept on this device (localStorage), refreshed at most every 5 min
  get: id => { try { return localStorage.getItem("dcam:" + id) || ""; } catch (e) { return ""; } },
  put: (id, v) => { try {
    const k = "dcamt:" + id; if (Date.now() - (+localStorage.getItem(k) || 0) < 300000 || !v.videoWidth) return;
    const cv = document.createElement("canvas"), w = 480, h = Math.round(w * v.videoHeight / v.videoWidth); cv.width = w; cv.height = h; const cx = cv.getContext("2d"); cx.drawImage(v, 0, 0, w, h);
    if (thBlack(cx, w, h)) return; localStorage.setItem("dcam:" + id, cv.toDataURL("image/jpeg", .55)); localStorage.setItem(k, Date.now());
  } catch (e) {} }
};
function camSnap(c) {   // phones: cameras scrolled out of view aren't fetched until they come into view
  if (isMobile() && c.o.el._vis === false) return;
  const s = states[camEnt(c)], p = s && s.attributes.entity_picture; if (!p) return;
  const im = new Image(); im.onload = () => { c.o.img.src = im.src; };
  im.src = CONFIG.url + p + (p.indexOf("?") > -1 ? "&" : "?") + "t=" + Date.now();
}
// tiles use the light "_fluent" (sub) stream; full screen and the popup view switch to "_clear" (main)
function camEnt(c) {
  const cl = c.o.el.classList; if (cl.contains("fs") || cl.contains("vf")) return c.id;
  const f = c.id.replace(/_clear$/, "_fluent"); return f !== c.id && states[f] ? f : c.id;
}
function camLiveSync() { document.documentElement.classList.toggle("camlive", CONFIG.cameras.concat(CONFIG.security, VWC, NPC).some(c => c.live)); }   // lets CSS pause decorative effects while video is playing
function dropOld(c) { clearTimeout(c.swapT); if (c.old) { try { c.old.pc.close(); } catch (x) {} delete subs[c.old.sub]; c.old = null; } }   // the stream that was playing until the new one had its first picture
function stopCam(c) {
  dropOld(c);
  if (c.pc) { try { c.pc.close(); } catch (x) {} c.pc = null; }
  if (c.sub) { delete subs[c.sub]; c.sub = 0; }
  const o = c.o; c.live = false; o.el.classList.remove("live"); o.vid.classList.remove("on"); o.vid.srcObject = null; camLiveSync();
}
function stopCams() { CONFIG.cameras.concat(CONFIG.security, VWC, NPC).forEach(c => { clearTimeout(c.rt); stopCam(c); micOff(c); }); }
function startCams() { if (onView()) { VW.mode = ""; applyView(); return; } if (onHome() && !camsOn()) return; cams(); camList().forEach((c, i) => { if (!isMobile() || (CONFIG.mobileLive !== false && c.o.el._vis !== false)) { clearTimeout(c.rt); c.rt = setTimeout(() => { if (camPage()) liveCam(c); }, i * 160); } }); }   // staggered so several streams do not negotiate and decode at once   // phones: live too, but only for tiles on screen (CONFIG.mobileLive:false = snapshots, live on tap)
function retryCam(c, ms) { stopCam(c); clearTimeout(c.rt); c.rt = setTimeout(() => { if ((c.np && document.body.classList.contains("np-open")) || camPage() && (onSec() || camsOn() || onView()) && (!isMobile() || c.o.el.classList.contains("fs") || (CONFIG.mobileLive !== false && c.o.el._vis !== false))) liveCam(c); }, ms); }
function liveCam(c, up) {   // HA built-in WebRTC (go2rtc); falls back to snapshots if it fails. up = a switch between the light and the clear stream: the picture that is playing keeps playing until the new one has its first picture
  const o = c.o, sid = { v: null }, q = [], eid = camEnt(c);
  dropOld(c); if (up && c.live && c.pc && o.vid.srcObject && c.eid && c.eid !== eid) { c.old = { pc: c.pc, sub: c.sub }; c.pc = null; c.sub = 0; clearTimeout(c.rt); } else stopCam(c);
  clearTimeout(c.rt); c.eid = eid;
  o.vid.muted = !(c.snd && (o.el.classList.contains("fs") || o.el.classList.contains("vf")));
  send({ type: "camera/webrtc/get_client_config", entity_id: eid }, cfg => {
    try {
      const pc = new RTCPeerConnection(cfg.configuration); c.pc = pc;
      if (c.old) c.swapT = setTimeout(() => { if (c.pc !== pc || !c.old) return; try { pc.close(); } catch (x) {} delete subs[c.sub]; c.pc = c.old.pc; c.sub = c.old.sub; c.old = null; c.eid = ""; }, 8000);   // the new picture never came: the one that was playing stays
      pc.ontrack = e => { if (e.track.kind !== "video") return; const ms = e.streams[0] || new MediaStream([e.track]);
        if (!c.old) { o.vid.srcObject = ms; o.vid.play().catch(() => {}); return; }
        const tv = document.createElement("video"); tv.muted = true; tv.playsInline = true; tv.srcObject = ms;   // the new picture is waited for off screen
        tv.addEventListener("playing", () => { tv.srcObject = null; if (c.pc !== pc) return; o.vid.srcObject = ms; o.vid.play().catch(() => {}); dropOld(c); }, { once: true }); tv.play().catch(() => {});
        };
      pc.addTransceiver("video", { direction: "recvonly" });
      const mt = c.mic && c.mic.getAudioTracks()[0];
      if (mt) pc.addTransceiver(mt, { direction: "sendrecv", streams: [c.mic] }); else pc.addTransceiver("audio", { direction: "recvonly" }); pc.createDataChannel("dataSendChannel");
      const cand = x => send({ type: "camera/webrtc/candidate", entity_id: eid, session_id: sid.v, candidate: x });
      pc.onicecandidate = e => { if (!e.candidate) return; const x = e.candidate.toJSON(); if (sid.v) cand(x); else q.push(x); };
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" || pc.connectionState === "disconnected") retryCam(c, 5000); };
      pc.createOffer().then(of => pc.setLocalDescription(of).then(() => {
        const id = msgId++; c.sub = id;
        subs[id] = ev => {
          if (ev.type === "session") { sid.v = ev.session_id; q.splice(0).forEach(cand); }
          else if (ev.type === "answer") pc.setRemoteDescription({ type: "answer", sdp: ev.answer });
          else if (ev.type === "candidate") pc.addIceCandidate(ev.candidate).catch(() => {});
          else if (ev.type === "error") retryCam(c, 30000);
        };
        ws.send(JSON.stringify({ id: id, type: "camera/webrtc/offer", entity_id: eid, offer: of.sdp }));
      })).catch(() => retryCam(c, 30000));
    } catch (x) { retryCam(c, 30000); }
  });
}

