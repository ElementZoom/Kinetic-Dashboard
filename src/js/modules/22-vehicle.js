// ---------- vehicle (Mercedes me) ----------
function drawVehicle() {
  const V = CONFIG.vehicle, pg = $("#vehicle"); if (!V || !pg) return;
  const E = k => states[(/^(binary_sensor|device_tracker)/.test(k) ? "" : "sensor.") + V.prefix + "_" + k] || states["binary_sensor." + V.prefix + "_" + k];
  const N = k => { const e = E(k); return e && e.state !== "unavailable" && e.state !== "unknown" && !isNaN(+e.state) ? +e.state : null; };
  const B = k => { const e = states["binary_sensor." + V.prefix + "_" + k]; return e ? e.state === "on" : null; };
  const fx = (v, d) => v == null ? "--" : (+v).toLocaleString(undefined, { maximumFractionDigits: d == null ? 0 : d });
  const T = (m, v) => v == null ? "--" : (m[v] != null ? m[v] : "Code " + v);
  const fuel = N("fuel_level"), range = N("range_liquid"), odo = N("odometer"), lk = N("lock"), ig = N("ignition_state");
  const fcol = fuel == null ? "var(--mut)" : fuel <= V.lowFuelPct ? "var(--heat)" : fuel <= 30 ? "#ffaa00" : "var(--mint)";
  const C = 2 * Math.PI * 54, off = fuel == null ? C : C * (1 - Math.min(100, fuel) / 100);
  const chip = (ic, t, on) => '<span class="vch' + (on ? " on" : "") + '">' + mdi(ic) + t + '</span>';
  const locked = lk === 1 || lk === 2, pb = B("park_brake_status");
  const car = '<div class="vcar">' + (V.photo ? '<img alt="" src="' + esc(V.photo) + '" onerror="this.parentNode.classList.add(\'np\');this.remove()">' : "") + '<svg viewBox="0 0 400 170"><defs><linearGradient id="vcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34343c"/><stop offset=".45" stop-color="' + esc(V.color || "#16161a") + '"/><stop offset="1" stop-color="#050507"/></linearGradient></defs><ellipse cx="200" cy="146" rx="170" ry="9" fill="rgba(0,0,0,.45)"/><path d="M16 112C16 100 22 94 34 90L46 54C50 42 60 34 78 34H266C292 34 312 50 334 78L368 88C384 92 392 102 392 116V126H16Z" fill="url(#vcg)" stroke="rgba(255,255,255,.18)" stroke-width="1.4"/>\n<path d="M62 78L70 47H166V78ZM176 47H262C282 47 298 60 314 78H176Z" fill="#8fb0c8" fill-opacity=".38" stroke="rgba(255,255,255,.2)"/>\n<path d="M22 108H388" stroke="rgba(255,255,255,.12)" stroke-width="1.2"/><rect x="372" y="98" width="16" height="6" rx="3" fill="#ffe7a6" fill-opacity=".85"/><rect x="16" y="98" width="10" height="7" rx="3" fill="#ff5a5a" fill-opacity=".8"/><g><circle cx="94" cy="126" r="27" fill="#0a0a0c"/><circle cx="94" cy="126" r="16" fill="#3a3a42"/><circle cx="94" cy="126" r="6" fill="#16161a"/><circle cx="312" cy="126" r="27" fill="#0a0a0c"/><circle cx="312" cy="126" r="16" fill="#3a3a42"/><circle cx="312" cy="126" r="6" fill="#16161a"/></g></svg></div>';
  const hero = '<div class="pn vhero"><div class="vring"><svg viewBox="0 0 130 130"><circle cx="65" cy="65" r="54" class="vr0"/><circle cx="65" cy="65" r="54" class="vr1" stroke="' + fcol + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 65 65)"/></svg><div class="vrt"><b>' + fx(fuel) + '<small>%</small></b><span class="lbl">Fuel</span></div></div>' +
    '<div class="vmain"><div class="lbl">' + esc(V.name || "Vehicle") + (V.plate ? " · " + esc(V.plate) : "") + '</div><div class="vbig">' + fx(range) + '<small> km range</small></div><div class="vodo">' + mdi("v-road") + fx(odo) + ' km odometer</div>' +
    '<div class="vchips">' + chip(locked ? "v-lock" : "v-unlock", T(V.lockText, lk), locked) + chip("v-key", "Ignition " + T(V.ignitionText, ig).toLowerCase(), ig >= 2) + (pb != null ? chip("v-park", pb ? "Park brake on" : "Park brake off", pb) : "") + '</div></div>' + car + '</div>';
  const tr = (t, d, sp, co) => '<div class="vtr"><div class="lbl">' + t + '</div><div class="vtv"><div><b>' + fx(d, d < 100 ? 1 : 0) + '</b><span>km</span></div><div><b>' + fx(sp) + '</b><span>km/h avg</span></div><div><b>' + fx(co, 1) + '</b><span>L/100km</span></div></div></div>';
  const trips = '<div class="pn"><div class="lbl">' + mdi("v-speed") + ' Trips</div>' + tr("Current trip", N("distance_start"), N("average_speed_start"), N("liquid_consumption_start")) + tr("Since reset", N("distance_reset"), N("average_speed_reset"), N("liquid_consumption_reset")) + '</div>';
  const ecoCol = v => v == null ? "rgba(var(--w),.3)" : v < 40 ? "#f2b94b" : v < 70 ? "#c9e26b" : "#6fdcae";
  const ring = (t, v) => { const C = 2 * Math.PI * 46, p = v == null ? 0 : Math.max(0, Math.min(100, v)), col = ecoCol(v); return '<div class="vec"><div class="rg"><svg viewBox="0 0 110 110"><circle class="a" cx="55" cy="55" r="46"/><circle class="b" cx="55" cy="55" r="46" stroke="' + col + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - p / 100)).toFixed(1) + '" transform="rotate(-90 55 55)"/></svg><b>' + (v == null ? "--" : Math.round(v)) + '<small>%</small></b></div><span>' + t + '</span></div>'; };
  const bonus = N("eco_score_bonus_range");
  const eco = '<div class="pn"><div class="vech"><div class="lbl">' + mdi("v-leaf") + ' Eco score</div>' + (bonus != null ? '<span class="vbn">+' + fx(bonus, 1) + ' km range</span>' : "") + '</div><div class="veco">' + ring("Acceleration", N("eco_score_acceleration")) + ring("Constant speed", N("eco_score_constant")) + ring("Free wheel", N("eco_score_free_wheel")) + '</div></div>';
  const row = (k, ic, t, st, open) => '<div class="bd" data-k="' + k + '"' + '><i>' + mdi(ic) + '</i><span class="nm">' + t + '</span><span class="st">' + st + '</span></div>';
  const rowC = (k, ic, t, st, open) => row(k, ic, t, st).replace('class="bd"', 'class="bd' + (open ? " on" : "") + '"');
  const WN = [["window_status_front_left", "Front left"], ["window_status_front_right", "Front right"], ["window_status_rear_left", "Rear left"], ["window_status_rear_right", "Rear right"]];
  let rows = WN.map(w => { const v = N(w[0]), op = v != null && v !== 2; return [op, rowC("window", op ? "m3-window-open" : "m3-window-closed", w[1], T(V.windowText, v), op)]; });
  const sr = N("sunroof_status"); if (sr != null) { const op = sr !== 0 && sr !== 4; rows.push([op, rowC("window", op ? "m3-window-open" : "m3-window-closed", "Sunroof", T(V.sunroofText, sr), op)]); }
  const dl = B("deck_lid"); if (dl != null) rows.push([dl, rowC("door", "v-boot", "Boot", dl ? "Open" : "Closed", dl)]);
  const dll = B("deck_lid_lock"); if (dll != null) rows.push([dll, rowC("door", dll ? "v-unlock" : "v-lock", "Boot lock", dll ? "Unlocked" : "Locked", dll)]);
  rows.sort((a, b) => b[0] - a[0]);
  const open = rows.filter(r => r[0]).length;
  const openings = '<div class="pn"><div class="lbl">' + mdi("m3-window-closed") + ' Windows, sunroof &amp; boot' + (open ? " · " + open + " open" : " · all closed") + '</div><div class="bl vbl">' + rows.map(r => r[1]).join("") + '</div></div>';
  const bs = N("starter_battery_state");
  const W = [["low_brake_fluid_warning", "v-brake", "Brake fluid"], ["low_coolant_level_warning", "v-coolant", "Coolant level"], ["engine_light_warning", "v-engine", "Engine light"], ["low_wash_water_warning", "v-wash", "Washer water"]];
  const hr = (ic, t, ok, st) => '<div class="vhr' + (ok ? "" : " bad") + '">' + mdi(ic) + '<span>' + t + '</span><b>' + mdi(ok ? "v-ok" : "v-alert") + st + '</b></div>';
  let health = W.filter(w => B(w[0]) != null).map(w => hr(w[1], w[2], !B(w[0]), B(w[0]) ? "Warning" : "OK")).join("");
  if (bs != null) health += hr("v-batt", "Starter battery", bs === 0, T(V.batteryText, bs));
  const bad = W.filter(w => B(w[0])).length + (bs != null && bs !== 0 ? 1 : 0);
  const healthC = '<div class="pn"><div class="lbl">' + mdi("v-engine") + ' Vehicle health' + (bad ? " · " + bad + " to check" : " · all good") + '</div>' + health + '</div>';
  pg.innerHTML = '<div class="vgrid">' + hero + trips + eco + openings + healthC + '</div>';
}
function irrRain() {   // next 12 hours only, as hour columns (the Weather page chart covers 24 h)
  const d = fcH.filter(x => Date.parse(x.datetime) > Date.now() - 3600000).slice(0, 12);
  if (d.length < 3) return "";
  const mm = d.map(x => +x.precipitation || 0), pr = d.map(x => +x.precipitation_probability || 0), tot = mm.reduce((p, q) => p + q, 0), pk = Math.max.apply(null, pr), mx = Math.max(2, Math.max.apply(null, mm));
  const fi = d.findIndex((x, i) => mm[i] >= 0.1 || pr[i] >= 50), skip = CONFIG.rainSkipMm != null ? CONFIG.rainSkipMm : 2;
  const v = tot >= skip ? ["rain-skip", "Rain on the way, likely enough to skip watering"] : fi > -1 ? ["rain-light", "A little rain possible, watering is still fine"] : ["rain-dry", "Dry for the next 12 hours"];
  const col = q => q < 0.5 ? "#7fd3f7" : q < 2.5 ? "#4FC3F7" : q < 7.6 ? "#2d8fe0" : "#1a5fb4";
  return '<div class="pn pg rn12 ' + v[0] + '"><div class="lbl">' + mdi("weather-rainy") + ' Rain · next 12 hours</div><div class="h3" style="margin:6px 0 10px">' + v[1] + '</div>' +
    '<div class="wg">' + [["Expected", f1(tot) + " mm"], ["Chance (peak)", pk ? Math.round(pk) + "%" : "--"], ["First rain", fi < 0 ? "none" : fi === 0 ? "now" : "in " + fi + " h"]].map(x => '<div class="ws"><span class="lbl">' + x[0] + '</span><b>' + x[1] + '</b></div>').join("") + '</div>' +
    '<div class="r12">' + d.map((x, i) => '<div><span>' + (pr[i] ? Math.round(pr[i]) + "%" : "") + '</span><span class="bar"><i style="height:' + (mm[i] > 0 ? Math.max(6, mm[i] / mx * 100) : 0) + '%;background:' + col(mm[i]) + '"></i></span>' + wic(x.condition) + '<span>' + hr(x).replace(/m$/, "") + '</span></div>').join("") + '</div>' +
    '<div class="sm" style="margin-top:8px">Bar height = rain (mm) · % = chance of rain</div></div>';
}
const irrW = {};   // per-zone wave state so the water rises, sways and drains without restarting on every redraw
function irrWave(id, on, fl) {
  const now = Date.now(), r = irrW[id] || (irrW[id] = { on: false, l0: 100, lv: 100, sp: 4, t0: 0, chg: 0 });
  const tgt = Math.round(52 - Math.min(1, fl / .8) * 38);
  if (on && !r.on) { r.on = true; r.t0 = now; r.sp = +(5 - Math.min(1, fl / .8) * 2.6).toFixed(1); r.l0 = 100; r.lv = tgt; r.chg = now; }
  else if (on && Math.abs(tgt - r.lv) >= 2) { r.l0 = r.l0 + (r.lv - r.l0) * Math.min(1, (now - r.chg) / 1500); r.lv = tgt; r.chg = now; }
  else if (!on && r.on) { r.on = false; r.l0 = r.l0 + (r.lv - r.l0) * Math.min(1, (now - r.chg) / 1500); r.lv = 100; r.chg = now; }
  if (!r.on && now - r.chg > 1500) return "";
  const dl = -(now - r.chg) + "ms", ph = -((now - r.t0) / 1000).toFixed(2) + "s";
  return '<div class="zwv" style="--l0:' + r.l0.toFixed(1) + '%;--lv:' + r.lv + '%;--sp:' + r.sp + 's;animation-delay:' + dl + '"><svg viewBox="0 0 400 40" preserveAspectRatio="none" style="animation-delay:' + ph + '"><path d="M0 20 Q50 2 100 20 T200 20 T300 20 T400 20 V40 H0Z"/></svg><svg viewBox="0 0 400 40" preserveAspectRatio="none" style="animation-delay:' + ph + '"><path d="M0 20 Q50 38 100 20 T200 20 T300 20 T400 20 V40 H0Z"/></svg></div>';
}
