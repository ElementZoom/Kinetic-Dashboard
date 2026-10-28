// ---------- live updates for the new pages ----------
const REL = {
  weather: rxj(/^(weather\.|geo_location\.|sun\.sun$)/, [(CONFIG.relevance || {}).weather, polRx()].filter(Boolean).join("|")),
  irrigation: rxj(/(water_tap|sprinkler|soil|water_restriction|water_level)/, (CONFIG.relevance || {}).irrigation),
  scenes: rxj(/(dynamic_scene|gradient_scene)/, (CONFIG.relevance || {}).scenes),
  media: /^media_player\./,
  vehicle: new RegExp(((CONFIG.vehicle || {}).prefix || "\\u0000nomatch")),
  hazards: /^(geo_location\.|sensor\.volcano_|zone\.home$)/
};
let pq = 0;
function queuePg() { if (!pq) pq = requestAnimationFrame(() => { pq = 0; const p = curPg(); if (p === "weather") drawWeather(); else if (p === "irrigation") drawIrr(); else if (p === "scenes") updScenes(); else if (p === "media") drawMedia(); else if (p === "vehicle") drawVehicle(); else if (p === "hazards") drawHaz(); }); }


// Skip re-writing a container when its markup has not changed. The pages below are redrawn on every related sensor update; rebuilding them
// when nothing changed made them flash and replayed their animations (Now Playing, Weather, GeoNet, Energy).
function keepH(el) {
  if (!el || el._kh) return el; el._kh = 1;
  const d = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(el, "innerHTML", { configurable: true, get() { return d.get.call(this); }, set(v) {
    v = String(v); const k = v.replace(/ data-(pos|upd)="[^"]*"/g, "");   // the progress timing changes on every call; it does not count as a change
    if (this._k === k && (v === "" ? !this.firstChild : this.firstChild)) {
      if (this._h !== v) {   // only the progress timing differs: refresh it in place so the bar and ring carry on smoothly
        this._h = v; const t = document.createElement("template"); t.innerHTML = v;
        const nb = t.content.querySelectorAll("[data-pos]"), ob = this.querySelectorAll("[data-pos]");
        if (nb.length === ob.length) nb.forEach((e, i) => Object.assign(ob[i].dataset, e.dataset));
      }
      return;
    }
    this._k = k; this._h = v; d.set.call(this, v);
  } });
  return el;
}
["#gsum", "#npw", "#npmini", "#npfab", "#npbody", "#hnp", "#wx", "#energy", "#hazards"].forEach(q => keepH($(q)));
