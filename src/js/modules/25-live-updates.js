// ---------- live updates for the new pages ----------
const REL = {
  weather: rxj(/^(weather\.|geo_location\.)/, (CONFIG.relevance || {}).weather),
  irrigation: rxj(/(water_tap|sprinkler|soil|water_restriction|water_level)/, (CONFIG.relevance || {}).irrigation),
  scenes: rxj(/(dynamic_scene|gradient_scene)/, (CONFIG.relevance || {}).scenes),
  media: /^media_player\./,
  vehicle: new RegExp(((CONFIG.vehicle || {}).prefix || "\\u0000nomatch")),
  hazards: /^(geo_location\.|sensor\.volcano_|zone\.home$)/
};
let pq = 0;
function queuePg() { if (!pq) pq = requestAnimationFrame(() => { pq = 0; const p = curPg(); if (p === "weather") drawWeather(); else if (p === "irrigation") drawIrr(); else if (p === "scenes") updScenes(); else if (p === "media") drawMedia(); else if (p === "vehicle") drawVehicle(); else if (p === "hazards") drawHaz(); }); }

