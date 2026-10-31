// ---------- Climate page: change when the automations start heating / cooling ----------
// A room (config rooms: [{ id: "climate.x", heatBelow: "input_number.a", coolAbove: "input_number.b" }]) or the house (config climateTriggers: { heatBelow, coolAbove })
// A room can also have autoClimate: "input_boolean.x" ("sleeping here tonight": the automations only run for rooms where it is on), a switch in the same place.
// gets a "Heat below" / "Cool above" stepper that sets those input_number helpers. The automations read the helpers, so no automation has to be edited again.
const CTROWS = [["heatBelow", "Heat below"], ["coolAbove", "Cool above"]];
const CTV = {}, CTH = {};   // value waiting to be sent, and the send timers, by helper
const ctOwner = r => r.main ? (CONFIG.climateTriggers || {}) : r;
const ctIds = () => { const o = {}; CONFIG.rooms.forEach(r => { CTROWS.forEach(x => { const e = ctOwner(r)[x[0]]; if (e) o[e] = 1; }); if (!r.main && r.autoClimate) o[r.autoClimate] = 1; }); return o; };
const CTSET = ctIds();
function ctMarks(el, o) {   // the two trigger points as little arrows under the room's comfort bar
  [["heatBelow", ".mk.h", "Heats below "], ["coolAbove", ".mk.c", "Cools above "]].forEach(x => {
    const m = $(x[1], el), e = o[x[0]], st = e && states[e], v = st ? (CTV[e] != null ? CTV[e] : parseFloat(st.state)) : NaN; if (!m) return;
    m.hidden = isNaN(v); if (!isNaN(v)) { m.style.left = cbPos(v) + "%"; m.title = x[2] + f1(v) + "°"; }
  });
  el.classList.toggle("hasmk", !!$(".mk:not([hidden])", el));
}
function ctDraw() {
  CONFIG.rooms.forEach(r => {
    const c = cards[r.id], box = c && $(".ctr", c.el); if (!box) return; const o = ctOwner(r);
    const rows = CTROWS.filter(x => o[x[0]] && states[o[x[0]]] && states[o[x[0]]].state !== "unavailable");
    ctMarks(c.el, o);
    const ac = !r.main && r.autoClimate && states[r.autoClimate] && states[r.autoClimate].state !== "unavailable" ? r.autoClimate : "", acOn = ac && states[ac].state === "on";
    c.el.classList.toggle("slp", !!acOn);
    box.hidden = !rows.length && !ac; if (!rows.length && !ac) { box.innerHTML = ""; return; }
    box.innerHTML = (ac ? '<div class="ct"><span>' + esc(r.autoLabel || "Sleeping here tonight") + '</span><button class="csw" role="switch" aria-checked="' + acOn + '" data-cb="' + esc(ac) + '" aria-label="' + esc(r.autoLabel || "Sleeping here tonight") + '"><i></i></button></div>' : "") + rows.map(x => { const e = o[x[0]], v = CTV[e] != null ? CTV[e] : parseFloat(states[e].state);
      return '<div class="ct"><span>' + x[1] + '</span><button class="rnd" data-ct="' + esc(e) + '" data-d="-1" aria-label="Lower ' + x[1] + '">−</button><b>' + (isNaN(v) ? "--" : f1(v) + "°") + '</b><button class="rnd" data-ct="' + esc(e) + '" data-d="1" aria-label="Raise ' + x[1] + '">+</button></div>'; }).join("");
  });
}
function ctBump(e, d) {
  const s = states[e]; if (!s) return; const a = s.attributes || {}, step = parseFloat(a.step) || 0.5, mn = a.min != null ? +a.min : 10, mx = a.max != null ? +a.max : 35;
  const base = CTV[e] != null ? CTV[e] : parseFloat(s.state); if (isNaN(base)) return;
  CTV[e] = Math.min(mx, Math.max(mn, Math.round((base + step * d) / step) * step)); ctDraw();
  clearTimeout(CTH[e]); CTH[e] = setTimeout(() => { call("input_number", "set_value", e, { value: CTV[e] }); setTimeout(() => { delete CTV[e]; ctDraw(); }, 4000); }, 700);
}
CONFIG.rooms.forEach(r => { const c = cards[r.id]; if (!c || !Object.keys(CTSET).length) return; const o = ctOwner(r); if (!CTROWS.some(x => o[x[0]]) && !(!r.main && r.autoClimate)) return; const box = document.createElement("div"); box.className = "ctr"; box.hidden = true; c.el.appendChild(box); });
$("#grid").addEventListener("click", e => { const b = e.target.closest("[data-ct]"); if (b) ctBump(b.dataset.ct, +b.dataset.d);
  const t = e.target.closest("[data-cb]"); if (t) { const id = t.dataset.cb; call("input_boolean", states[id] && states[id].state === "on" ? "turn_off" : "turn_on", id); } });
ctDraw();
