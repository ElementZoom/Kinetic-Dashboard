// ---------- climate page ----------
function label(r, m) { return (!r.main && m === "heat_cool") ? "ON" : (MODE[m] || String(m).toUpperCase()); }
function tint(r, s) {
  if (r.main) return cls[s.state] || "";
  if (s.state === "off") return "";
  const h = states[MAIN]; return (h && cls[h.state]) || "auto";   // zones take the heat pump's colour when on
}
function build(r) {
  const el = document.createElement("section");
  el.className = "card" + (r.main ? " main2" : "");
  el.innerHTML = '<div class="lbl il">' + (r.icon ? mdi(r.icon) : "") + esc(r.name) + '</div><div class="md">--</div>' +
    '<div class="temp"><span class="cur">--</span><small>°C</small></div>' +
    '<div class="row"><button class="rnd" data-d="-1" aria-label="Lower">−</button><div class="tg"><span>TARGET</span><b class="tgt">--</b></div><button class="rnd" data-d="1" aria-label="Raise">+</button></div>' +
    '<div class="chips"></div><button class="fanb"><span>FAN</span><b>--</b></button>';
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
  const c = cards[id], s = states[id], el = c.el, base = "card" + (c.r.main ? " main2" : "");
  if (!s || s.state === "unavailable" || s.state === "unknown") { el.className = base + " na"; $(".md", el).textContent = "UNAVAILABLE"; return; }
  const a = s.attributes;
  { const tt = tint(c.r, s), hp = states[MAIN], on = s.state !== "off" && hp && hp.state !== "off" && hp.state !== "unavailable" && hp.state !== "unknown" && tt; el.className = base + " " + tt + (on ? " aur" : ""); if (on) el.dataset.hm = hp.state; else delete el.dataset.hm; }
  $(".md", el).textContent = label(c.r, s.state);
  { let ct = a.current_temperature; if ((ct == null || isNaN(parseFloat(ct))) && c.r.main) {   // heat pump has no sensor of its own: house average, else the average of the room climates
      ct = null; try { ct = sv(CONFIG.indoor); } catch (e) {}
      if (ct == null || isNaN(parseFloat(ct))) { try { ct = avgOf(CONFIG.derived.houseTemps); } catch (e) {} }
      if (ct == null || isNaN(parseFloat(ct))) { const z = CONFIG.rooms.filter(r => !r.main).map(r => states[r.id] && parseFloat(states[r.id].attributes.current_temperature)).filter(x => x != null && !isNaN(x)); ct = z.length ? z.reduce((p, x) => p + x, 0) / z.length : null; }
    } $(".cur", el).textContent = f1(ct); }
  showT(id);
  const modes = a.hvac_modes || [], key = modes.join(), chips = $(".chips", el);
  if (c.key !== key) { chips.innerHTML = modes.map(m => '<button class="chip" data-m="' + m + '">' + label(c.r, m) + '</button>').join(""); c.key = key; }
  $$(".chip", chips).forEach(b => b.classList.toggle("on", b.dataset.m === s.state));
  const fan = $(".fanb", el);
  fan.style.display = a.fan_modes ? "" : "none";
  $("b", fan).textContent = (a.fan_mode || "--").toUpperCase();
}

