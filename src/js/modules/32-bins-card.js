// ---------- bins card (Alerts tab): the night before pickup a reminder with the Reminded > Bins out > Collected steps, on pickup day a quick check with the road camera ----------
// config bins: { due: [[switch, "Recycling", "recycle"], [switch, "Rubbish", "trash-can"], [switch, "Garden", "leaf"]], out: "input_boolean.bins_out", camera: "road", eveningFrom: 16 }
// a due switch is on from the evening before pickup until the bins are collected; "out" is on once the bins are at the kerb. "Collected" turns them all off.
Object.assign(MDI, {"recycle":"M21.82,15.42L19.32,19.75C18.83,20.61 17.92,21.06 17,21H15V23L12.5,18.5L15,14V16H17.82L15.6,12.15L19.93,9.65L21.73,12.77C22.25,13.54 22.32,14.57 21.82,15.42M9.21,3.06H14.21C15.19,3.06 16.04,3.63 16.45,4.45L17.45,6.19L19.18,5.19L16.54,9.6L11.39,9.69L13.12,8.69L11.71,6.24L9.5,10.09L5.16,7.59L6.96,4.47C7.37,3.64 8.22,3.06 9.21,3.06M5.05,19.76L2.55,15.43C2.06,14.58 2.13,13.56 2.64,12.79L3.64,11.06L1.91,10.06L7.05,10.14L9.7,14.56L7.97,13.56L6.56,16H11V21H7.4C6.47,21.07 5.55,20.61 5.05,19.76Z","trash-can":"M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M9,8H11V17H9V8M13,8H15V17H13V8Z","leaf":"M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"});   // recycle / bin / leaf (Material Design Icons)
function binsCfg() { const b = CONFIG.bins; return b && Array.isArray(b.due) && b.due.length ? b : null; }
function binsDue() { const b = binsCfg(); return b ? b.due.filter(x => isOn(x[0])) : []; }
function binsOut() { const b = binsCfg(); return !!(b && b.out && isOn(b.out)); }
function binsIds() { const b = binsCfg(); return b ? b.due.map(x => x[0]).concat(b.out ? [b.out] : []) : []; }
function binsEvening() { const f = (binsCfg() || {}).eveningFrom; return new Date().getHours() >= (typeof f === "number" ? f : 16); }   // from this hour the pickup is "tomorrow", before it "today"
function binsWaiting() { return binsDue().length > 0 && !binsOut(); }   // something still has to go out: counts as an alert and shows in the header strip
function binsCard() {
  const b = binsCfg(), due = binsDue(); if (!b || !due.length) return "";
  const out = binsOut(), eve = binsEvening(), nm = due.map(x => x[1]), list = nm.length > 1 ? nm.slice(0, -1).join(", ") + " and " + nm[nm.length - 1] : nm[0];
  const ico = '<div class="bn-i">' + due.map(x => '<span class="bn-b" data-ic="' + esc(x[2] || "trash-can") + '">' + mdi(x[2] || "trash-can") + '</span>').join("") + '</div>';
  const title = out ? "Bins are out" : eve ? "Bins out tonight" : "Bring the bins out", sub = esc(list) + " · " + (eve ? "pickup tomorrow" : out ? "waiting for pickup today" : "pickup today");
  const step = (c, t) => '<div class="bn-s ' + c + '"><span class="bn-d">' + (c === "done" ? mdi("check") : "") + '</span>' + t + '</div>';
  const tl = eve ? '<div class="bn-tl">' + step("done", "Reminded") + '<i class="bn-ln done"></i>' + step(out ? "done" : "cur", "Bins out") + '<i class="bn-ln' + (out ? " done" : "") + '"></i>' + step("", "Collected") + '</div>' : "";
  const cam = !eve && b.camera ? npCamFor(b.camera) : null, cs = cam ? '<div class="snap npcam" data-vw="' + esc(cam.key) + '" data-npc="' + esc(cam.id) + '" data-name="' + esc(cam.name) + '"></div>' : "";
  const btn = out && !eve ? '<button class="bn-btn" data-bn="done">Collected</button>' : !out && b.out ? '<button class="bn-btn" data-bn="out">Bins are out</button>' : !b.out ? '<button class="bn-btn" data-bn="done">Done</button>' : "";
  return '<div class="bn' + (out ? " out" : "") + '"><div class="bn-h">' + ico + '<div class="bn-t"><b>' + title + '</b><span>' + sub + '</span></div></div>' + tl + cs + btn + '</div>';
}
function binsTap(k) {
  const b = binsCfg(); if (!b) return;
  if (k === "out" && b.out) call("input_boolean", "turn_on", b.out);
  else call("homeassistant", "turn_off", binsIds());
}
