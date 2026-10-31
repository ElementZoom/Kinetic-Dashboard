// ---------- Climate page: one switch for the climate automations ----------
// config climateAuto: ["automation.x", ...]  or  { name: "Auto climate", entities: ["automation.x", ...] }
// It only turns those automations on or off (nothing else is needed in Home Assistant). Off = the house stays as you set it.
const CAUTO = (() => { const c = CONFIG.climateAuto; if (!c) return null; const o = Array.isArray(c) ? { entities: c } : c; return o.entities && o.entities.length ? { name: o.name || "Auto climate", ids: o.entities } : null; })();
let caBusy = 0;
function caIds() { return CAUTO ? CAUTO.ids.filter(x => states[x] && states[x].state !== "unavailable") : []; }
function caDraw() {
  const el = $("#cauto"); if (!el || !CAUTO) return; const ids = caIds();
  if (!ids.length) { el.hidden = true; document.body.classList.remove("ca-off"); return; }
  const n = ids.filter(x => states[x].state === "on").length, all = n === ids.length, none = n === 0;
  { const was = document.body.classList.contains("ca-off"); document.body.classList.toggle("ca-off", none); if (was !== none) { try { ctDraw(); } catch (e) {} } }   // auto climate off: the trigger steppers, the sleeping switch and the trigger triangles are hidden (they only matter while it runs)
  el.hidden = false; el.classList.toggle("on", !none); el.classList.toggle("part", !none && !all);
  el.querySelector("b").textContent = CAUTO.name;
  el.querySelector("small").textContent = all ? "On · rooms start and stop by themselves" : none ? "Off · you are in charge, nothing switches by itself" : "Partly on · " + n + " of " + ids.length + " automations running";
  const sw = el.querySelector(".csw"); sw.setAttribute("aria-checked", none ? "false" : "true");
}
function caInit() {
  if (!CAUTO || $("#cauto")) return;
  const el = document.createElement("div"); el.className = "pn"; el.id = "cauto"; el.hidden = true;
  el.innerHTML = '<span class="cai">' + mdi("thermometer") + '</span><div class="cat"><b></b><small></small></div><button class="csw" role="switch" aria-checked="false" aria-label="Auto climate"><i></i></button>';
  $("#climate").insertBefore(el, $("#climate").firstChild);
  el.querySelector(".csw").onclick = () => { const ids = caIds(); if (!ids.length) return; const off = ids.some(x => states[x].state === "on"); call("automation", off ? "turn_off" : "turn_on", ids); };
  caDraw();
}
caInit();
