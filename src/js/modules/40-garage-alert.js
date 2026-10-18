// ---------- garage door alert: red frame + band on the garage camera while the door is open, amber while it moves ----------
// config.js -> garageAlert: { "camera.garage": { sensor: "binary_sensor.garage_door_contact", opener: "switch.garage_opener", travel: 15, invert: false } }
// sensor = the door contact (on = open; invert:true if yours is the other way round). opener (optional) = the switch / button / cover that moves the door.
// A door only reports "open" or "closed", so the movement is worked out here: sensor turns on -> OPENING for `travel` seconds, then OPEN;
// opener pressed while the door is open -> CLOSING until the sensor turns off. A cover opener that reports opening / closing is used directly.
const GAL = {}, GALOP = {};
const galCfg = () => (CONFIG.garageAlert && typeof CONFIG.garageAlert === "object") ? CONFIG.garageAlert : {};
function galPaint(cam, st) {
  CAMREG.forEach(r => {
    if (r.id !== cam) return;
    const el = r.el;
    if (st === "closed") { if (el.dataset.gal !== undefined) delete el.dataset.gal; return; }
    if (el.dataset.gal === st) return;
    el.dataset.gal = st;
    const b = el.querySelector(".gal"); if (b) b.innerHTML = "<b>" + mdi(st === "closing" ? "garage-variant" : "garage-open-variant") + "GARAGE " + st.toUpperCase() + "</b>";
  });
}
function galStep(cam, press) {
  const c = galCfg()[cam]; if (!c || !c.sensor) return;
  const s = states[c.sensor]; if (!s) return;
  const open = (s.state === "on") !== !!c.invert, now = Date.now();
  let g = GAL[cam]; if (!g) GAL[cam] = g = { open: open, st: open ? "open" : "closed", t: 0 };   // first sight of the sensor: no animation, just the current state
  if (open !== g.open) { g.open = open; if (!open) g.st = "closed"; else if (g.st !== "opening") { g.st = "opening"; g.t = now; } }
  if (press) { g.st = g.open ? "closing" : "opening"; g.t = now; }
  const cv = c.opener && c.opener.indexOf("cover.") === 0 && states[c.opener];
  if (cv && (cv.state === "opening" || cv.state === "closing") && g.st !== cv.state) { g.st = cv.state; g.t = now; }
  const tr = (c.travel > 0 ? c.travel : 15) * 1000;
  if (g.st === "opening") { if (g.open) { if (now - g.t > tr) g.st = "open"; } else if (now - g.t > tr + 10000) g.st = "closed"; }
  else if (g.st === "closing") { if (!g.open) g.st = "closed"; else if (now - g.t > tr + 10000) g.st = "open"; }
  galPaint(cam, g.st);
}
function galOnState(id, s) {
  const m = galCfg();
  Object.keys(m).forEach(cam => {
    const c = m[cam]; if (!c) return;
    if (id === c.sensor) galStep(cam, false);
    else if (id === c.opener) {
      const prev = GALOP[id]; GALOP[id] = s.state;
      const press = prev !== undefined && prev !== s.state && (/^(button|input_button)\./.test(id) || s.state === "on");
      galStep(cam, press);
    }
  });
}
setInterval(() => { try { Object.keys(galCfg()).forEach(k => galStep(k, false)); } catch (e) {} }, 1000);
