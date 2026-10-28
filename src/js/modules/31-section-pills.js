// Section tabs (phones): the Rooms-style capsule row, sticky under the page title on the long pages (Room, Theme, Weather, Vehicle). Like the Notifications pop-up, one capsule shows only its own card(s).
const SECP = { sel: {}, want: null };   // want: {page, q} - a link (#weather/pollen, #rooms/<id>/doors) asks for the tab whose card matches the selector q; used once, on the next draw
function secPills(page, host, anchor, min) {
  if (!page || !host) return;
  const old = page.querySelector(":scope > .secw");
  const cls = (c, n) => new RegExp("(^|\\s)" + n + "(\\s|$)").test(c.className);
  const cards = [...host.children].filter(c => c.nodeType === 1 && (cls(c, "pn") || cls(c, "wcols")));
  const lab = c => { if (cls(c, "wcols")) return "Now"; if (cls(c, "vhero")) return "Car"; const l = c.querySelector(".lbl,h2,h3"); let t = l ? l.textContent : ""; if (/^Kinetic \d/i.test(t.trim())) t = "About"; t = t.split("·")[0].replace(/\s+/g, " ").trim().replace(/\s*(all off|all on|all closed|off all|open all).*$/i, "").trim(); return t.length > 18 ? t.slice(0, 17).trim() + "…" : t; };
  const lts = cards.filter(c => c.dataset.grp === "lt");   // a room with several light areas shows them together under one ROOM tab
  const items = []; cards.forEach(c => { if (lts.length > 1 && c.dataset.grp === "lt") { if (c === lts[0]) items.push({ n: "Room", els: lts }); return; } const n = lab(c); if (n) items.push({ n: n, els: cls(c, "wcols") && c.nextElementSibling && cls(c.nextElementSibling, "wdots") ? [c, c.nextElementSibling] : [c] }); });
  if (!isMobile() || items.length < (min || 3)) { if (SECP.want && SECP.want.page === page.id) SECP.want = null; if (old) old.remove(); cards.forEach(c => { c.style.display = ""; }); host.querySelectorAll(":scope > .wdots").forEach(c => { c.style.display = ""; }); return; }
  const key = page.id, apply = k => { items.forEach((x, i) => x.els.forEach(e => { e.style.display = i === k ? "" : "none"; })); };
  const W = SECP.want; if (W && W.page === key) { const j = items.findIndex(x => x.els.some(e => e.matches(W.q) || e.querySelector(W.q))); if (j > -1) SECP.sel[key] = items[j].n; SECP.want = null; }
  let k = items.findIndex(x => x.n === SECP.sel[key]); if (k < 0) k = 0; SECP.sel[key] = items[k].n; apply(k);
  const sig = items.map(x => x.n).join("|");
  if (old && old.dataset.sig === sig) { const r = old.firstElementChild; r._items = items; [...r.children].forEach((c, i) => c.classList.toggle("on", i === k)); return; }
  if (old) old.remove();
  const wrap = document.createElement("div"); wrap.className = "hsw secw"; wrap.dataset.sig = sig;
  wrap.innerHTML = hsw('<div class="chips tabs secnav">' + items.map((x, i) => '<button class="chip' + (i === k ? " on" : "") + '" data-i="' + i + '">' + esc(x.n).toUpperCase() + '</button>').join("") + '</div>').replace(/^<div class="hsw">|<\/div>$/g, "");
  const row = wrap.firstElementChild; row._items = items;
  (anchor || host).parentNode.insertBefore(wrap, anchor || host);
  row.addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; const i = +b.dataset.i, it = row._items[i]; if (!it) return; SECP.sel[key] = it.n; row._items.forEach((x, j) => x.els.forEach(el => { el.style.display = j === i ? "" : "none"; })); [...row.children].forEach((c, j) => c.classList.toggle("on", j === i)); page.scrollTop = 0; });
}
(() => {
  const wrap = (name, fn) => { const f = window[name]; if (typeof f !== "function") return; window[name] = function () { const r = f.apply(this, arguments); try { fn(); } catch (e) {} return r; }; };
  wrap("drawWeather", () => { const w = $("#wx"); secPills($("#weather"), w, w); });
  wrap("drawVehicle", () => { const g = $("#vehicle .vgrid"); secPills($("#vehicle"), g, g); });
  wrap("drawPalette", () => { const g = $("#theme .thl"); secPills($("#theme"), g, $("#theme .thg")); });
  wrap("drawAdmin", () => { const g = $("#admin .thl"); secPills($("#admin"), g, $("#admin .thg")); });
  wrap("drawRoom", () => { secPills($("#roomspg"), $("#rv"), $("#rv"), 2); });
})();
