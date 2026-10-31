// ---------- climate page ----------
function label(r, m) {   // a room that is on shows what the heat pump is doing (HEAT, COOL, AUTO ...); off stays OFF
  if (!r.main && m === "heat_cool") { const h = states[MAIN], hs = h && h.state; return hs && hs !== "off" && hs !== "unavailable" && hs !== "unknown" ? (MODE[hs] || String(hs).toUpperCase()) : "ON"; }
  return MODE[m] || String(m).toUpperCase();
}
const CBAR = [14, 30];   // the comfort bar runs from cool to warm
const cbPos = v => Math.max(0, Math.min(100, (parseFloat(v) - CBAR[0]) / (CBAR[1] - CBAR[0]) * 100));
function cbar(id) {   // the room's comfort bar: dot = the room now, tick = the target
  const c = cards[id]; if (!c || c.r.main) return; const a = (states[id] || {}).attributes || {}, t = T[id], tv = t && t.v != null ? t.v : a.temperature, ct = parseFloat(a.current_temperature);
  const dot = $(".cbar i", c.el), tick = $(".cbar u", c.el); if (!dot) return;
  dot.style.left = isNaN(ct) ? "50%" : cbPos(ct) + "%"; dot.style.setProperty("--kc", isNaN(ct) ? "transparent" : tempColor(ct));
  tick.style.display = tv == null || isNaN(parseFloat(tv)) ? "none" : ""; if (tv != null) tick.style.left = cbPos(tv) + "%";
}
function tint(r, s) {
  if (r.main) return cls[s.state] || "";
  if (s.state === "off") return "";
  const h = states[MAIN]; return (h && cls[h.state]) || "auto";   // zones take the heat pump's colour when on
}
function build(r) {
  const el = document.createElement("section");
  el.className = "card" + (r.main ? " main2 czh" : " rm");
  if (r.main) el.innerHTML = '<div class="lbl il">House</div>' +
    '<div class="czm"><div class="temp"><span class="cur">--</span><small>°</small></div>' +
    '<div class="czs"><div class="czt"><span class="md">--</span><div class="row"><button class="rnd" data-d="-1" aria-label="Lower">−</button><div class="tg"><span>TARGET</span><b class="tgt">--</b></div><button class="rnd" data-d="1" aria-label="Raise">+</button></div></div>' +
    '<div class="cout"><span>Outside</span><b>--</b></div><button class="fanb"><span>Fan</span><b>--</b></button></div></div>' +
    '<div class="chips"></div><div class="czg" hidden><svg viewBox="0 0 300 84" preserveAspectRatio="none" aria-hidden="true"></svg><small>LAST 24 HOURS</small></div>';
  else el.innerHTML = '<div class="lbl il">' + (r.icon ? mdi(r.icon) : "") + esc(r.name) + '</div><button class="shx" aria-label="Close">' + mdi("close") + '</button><div class="md">--</div>' +
    '<div class="temp"><span class="cur">--</span><small>°C</small></div><div class="sub"></div>' +
    '<div class="row"><button class="rnd" data-d="-1" aria-label="Lower">−</button><div class="tg"><span>TARGET</span><b class="tgt">--</b></div><button class="rnd" data-d="1" aria-label="Raise">+</button></div>' +
    '<div class="chips"></div><button class="fanb"><span>FAN</span><b>--</b></button><div class="cbar"><u></u><i></i><b class="mk h" hidden></b><b class="mk c" hidden></b></div>';
  cards[r.id] = { el: el, r: r, key: "" };
  $$(".rnd", el).forEach(b => b.onclick = () => bump(r.id, +b.dataset.d));
  $(".chips", el).onclick = e => { const m = e.target.dataset.m; if (m) call("climate", "set_hvac_mode", r.id, { hvac_mode: m }); };
  $(".fanb", el).onclick = () => {
    const a = (states[r.id] || {}).attributes || {}, fm = a.fan_modes || [];
    if (fm.length) call("climate", "set_fan_mode", r.id, { fan_mode: fm[(fm.indexOf(a.fan_mode) + 1) % fm.length] });
  };
  return el;
}
function render(id) {
  const c = cards[id], s = states[id], el = c.el;
  if (!s || s.state === "unavailable" || s.state === "unknown") { el.classList.add("na"); $(".md", el).textContent = "UNAVAILABLE"; return; }
  el.classList.remove("na");
  const a = s.attributes, hp = states[MAIN], hs = hp && hp.state, hon = !!hs && hs !== "off" && hs !== "unavailable" && hs !== "unknown";
  { const hm = c.r.main ? (s.state !== "off" ? cls[s.state] || "auto" : "") : (s.state !== "off" && hon ? cls[hs] || "auto" : ""); if ((el.dataset.hm || "") !== hm) { if (hm) el.dataset.hm = hm; else delete el.dataset.hm; } }   // the colour follows the heat pump; classes are only touched when something really changed (no redraw flicker)
  $(".md", el).textContent = c.r.main ? ({ heat: "Heating to", cool: "Cooling to", heat_cool: "Auto at", auto: "Auto at", fan_only: "Fan only", dry: "Drying to", off: "Off" }[s.state] || label(c.r, s.state)) : label(c.r, s.state);
  if (c.r.main) el.classList.toggle("hoff", s.state === "off");
  { let ct = a.current_temperature; if ((ct == null || isNaN(parseFloat(ct))) && c.r.main) {   // heat pump has no sensor of its own: house average, else the average of the room climates
      ct = null; try { ct = sv(CONFIG.indoor); } catch (e) {}
      if (ct == null || isNaN(parseFloat(ct))) { try { ct = avgOf(CONFIG.derived.houseTemps); } catch (e) {} }
      if (ct == null || isNaN(parseFloat(ct))) { const z = CONFIG.rooms.filter(r => !r.main).map(r => states[r.id] && parseFloat(states[r.id].attributes.current_temperature)).filter(x => x != null && !isNaN(x)); ct = z.length ? z.reduce((p, x) => p + x, 0) / z.length : null; }
    } $(".cur", el).textContent = f1(ct); }
  showT(id);
  const modes = a.hvac_modes || [], key = modes.join() + (c.r.main ? "" : "|" + ((states[MAIN] || {}).state || "")), chips = $(".chips", el);
  if (c.key !== key) { chips.innerHTML = modes.map(m => '<button class="chip" data-m="' + m + '">' + label(c.r, m) + '</button>').join(""); c.key = key; }
  $$(".chip", chips).forEach(b => b.classList.toggle("on", b.dataset.m === s.state));
  const fan = $(".fanb", el);
  fan.style.display = a.fan_modes ? "" : "none";
  $("b", fan).textContent = (a.fan_mode || "--").toUpperCase();
  if (c.r.main) { const o = $(".cout", el), ov = CONFIG.outside ? sv(CONFIG.outside) : null; if (o) { o.style.display = ov != null && !isNaN(parseFloat(ov)) ? "" : "none"; $("b", o).textContent = f1(ov) + "°"; } }
  else { el.classList.toggle("coff", s.state === "off"); cbar(id); clSub(id); }
  if (c.r.main) hzLoad();
}

