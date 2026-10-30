// ---------- Home: today's schedule ----------
// Tablet: one thin strip under the cameras (TODAY + the next events as colour-coded chips, "+n" for the rest). Phone: a card under the greeting with the next events as rows.
// Reads today's events from the same calendars as the Events page (CONFIG.calendars); drawn only while something today is still to come, so a quiet day or an evening with
// everything done leaves no card. CONFIG.schedule = false turns it off; put "schedule" in layout.tablet / layout.mobile to choose where it sits.
let SCH = { ev: [], t: 0, busy: false };
const schOn = () => CONFIG.schedule !== false && Array.isArray(CONFIG.calendars) && CONFIG.calendars.length > 0;
function schLoad(force) {
  if (!schOn() || SCH.busy || (!force && Date.now() - SCH.t < 120000)) return; SCH.busy = true;
  const s = new Date(), a = new Date(s.getFullYear(), s.getMonth(), s.getDate()), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
  const q = "?start=" + encodeURIComponent(a.toISOString()) + "&end=" + encodeURIComponent(b.toISOString()), out = [];
  Promise.all(CONFIG.calendars.map((c, i) => getToken().then(tk => fetch(CONFIG.url + "/api/calendars/" + c + q, { headers: { Authorization: "Bearer " + tk } }))
    .then(r => r.json()).then(j => { if (!Array.isArray(j)) return; j.forEach(v => { try {
      const ad = !v.start.dateTime, st = pd(v.start), en = pd(v.end);
      if (ad ? !(st < b && en > a) : !(st < b && en > a)) return;
      out.push({ ad: ad, t: st, e: en, s: v.summary || "", c: (typeof evColOf === "function" && evColOf(c, v)) || CALCOL[i % CALCOL.length] });
    } catch (_) {} }); }).catch(() => {}))).then(() => { SCH.ev = out.sort((x, y) => (y.ad - x.ad) || (x.t - y.t)); SCH.t = Date.now(); SCH.busy = false; schDraw(); }, () => { SCH.busy = false; });
}
const schTm = d => d.toLocaleTimeString([], tmo({ hour: "numeric", minute: "2-digit" })).replace(" ", "").toLowerCase();
function schDraw() {
  const el = $("#sch"); if (!el) return;
  const now = new Date(), live = SCH.ev.filter(v => v.ad || v.e > now);   // all-day events and anything not finished yet
  if (!schOn() || !live.length) { el.hidden = true; el.innerHTML = ""; hsFit(); return; }
  const nx = live.filter(v => !v.ad)[0], past = SCH.ev.filter(v => !v.ad && v.e <= now), n = SCH.ev.length;
  const when = v => v.ad ? "ALL DAY" : schTm(v.t);
  const chip = v => '<span class="sch-c' + (v === nx ? " nx" : "") + (v.ad ? " ad" : "") + '" style="--c:' + v.c + '"><i></i><small>' + when(v) + '</small><span>' + esc(v.s) + '</span></span>';
  const left = (nx ? Math.round((nx.t - now) / 60000) : null);
  const eta = left != null && left > 0 && left < 180 ? (left < 60 ? "in " + left + " min" : "in " + Math.floor(left / 60) + " h " + (left % 60 ? left % 60 + " min" : "")).trim() : "";
  el.innerHTML = '<div class="sch-l"><b class="lbl">Today</b>' + live.map(chip).join("") + '<span class="sch-n"></span></div>' +
    '<div class="sch-m"><div class="sch-h"><b class="lbl">Today</b><span class="lbl">' + n + (n === 1 ? ' event' : ' events') + '</span></div>' +
    live.slice(0, 3).map(v => '<div class="sch-r' + (v === nx ? " nx" : "") + '" style="--c:' + v.c + '"><small>' + when(v) + '</small><span>' + esc(v.s) + '</span>' + (v === nx && eta ? '<em>' + eta + '</em>' : '') + '</div>').join("") +
    (live.length > 3 ? '<div class="sch-x lbl">+' + (live.length - 3) + ' more</div>' : "") + (past.length ? '<div class="sch-x lbl">' + past.length + ' done</div>' : "") + '</div>' +
    '<span class="sch-g">' + mdi("chevron-right") + '</span>';
  el.hidden = false; hsFit(); schFit();
}
// tablet: the Leaving card and the Today strip share one row under the greeting (#hstrip); alone, either one takes the whole row. A layout.tablet that lists "schedule" keeps Today where config.js puts it.
function hsFit() {
  const h = $("#hstrip"), s = $("#sch"), a = $("#lvc"); if (!h || !s || !a) return;
  const own = !isMobile() && ((CONFIG.layout || {}).tablet || []).indexOf("schedule") < 0;
  if (own && s.parentNode !== h) h.appendChild(s); else if (!own && s.parentNode === h) $(".camcol").appendChild(s);
  const n = [a, s].filter(x => x.parentNode === h && !x.hidden).length;
  h.dataset.n = n; h.hidden = !n; if (own && n) schFit();
}
function schFit() {   // tablet strip: chips that do not fit are hidden and counted as "+n"
  const el = $("#sch"); if (!el || el.hidden) return; const l = $(".sch-l", el), cs = $$(".sch-c", l), nn = $(".sch-n", l); if (!l.offsetWidth) return;
  cs.forEach(c => { c.style.display = ""; }); nn.textContent = "";
  const lim = () => l.getBoundingClientRect().right - 4; let hid = 0;
  const over = () => { const last = cs.filter(c => c.style.display !== "none").pop(); return last && last.getBoundingClientRect().right > lim() - (hid ? 44 : 0); };
  while (cs.length - hid > 1 && over()) { const vis = cs.filter(c => c.style.display !== "none"); vis[vis.length - 1].style.display = "none"; hid++; }
  if (hid) nn.textContent = "+" + hid;
}
document.addEventListener("click", e => { if (e.target.closest("#sch")) location.hash = "#events"; });
setInterval(() => { if (curPg() === "home") { schLoad(); schDraw(); } }, 60000);
addEventListener("resize", () => { clearTimeout(SCH.rs); SCH.rs = setTimeout(() => { hsFit(); schFit(); }, 120); });
