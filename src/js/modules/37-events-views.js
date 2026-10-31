// ---------- Events: more ways to look at the calendar ----------
// tablet: MONTH | WEEK | LIST      phone: AGENDA | WEEK | MONTH
// the choice is kept per device (localStorage); config.js can set the starting view: eventsView: { tablet: "month", mobile: "agenda" }
function evView() {
  const m = isMobile(), k = m ? "p" : "t", ok = EVV[k]; let v = evVs[k];
  if (ok.indexOf(v) < 0) { try { v = (JSON.parse(localStorage.kinEvView || "{}"))[k]; } catch (e) { v = ""; } }
  if (ok.indexOf(v) < 0) v = (CONFIG.eventsView || {})[m ? "mobile" : "tablet"];
  return ok.indexOf(v) < 0 ? ok[0] : v;
}
const evMon = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
function evSetView(v) {
  const prev = evView(), k = isMobile() ? "p" : "t"; evVs[k] = v;
  try { const o = JSON.parse(localStorage.kinEvView || "{}"); o[k] = v; localStorage.kinEvView = JSON.stringify(o); } catch (e) {}
  const t = new Date();
  if (v === "week" && prev !== "week") evw = evMon(t.getFullYear() === cy && t.getMonth() === cm ? t : new Date(cy, cm, 1));
  if (prev === "week" && v !== "week") { const wd = d => new Date(evw.getFullYear(), evw.getMonth(), evw.getDate() + d), m = t >= wd(0) && t < wd(7) ? t : wd(3);   // the week with today in it opens today's month; any other week opens the month of its middle day
    cy = m.getFullYear(); cm = m.getMonth(); }
  evSel = null; evJump = true; evTitle(cy, cm); txGo($("#cg"), 0, false); loadEvents();
}
function evSwitch() {
  const b = $("#evsw"), v = evView(), k = isMobile() ? "p" : "t", nm = { month: "Month", week: "Week", list: "List", agenda: "Agenda" }, sig = k + v;
  if (b.dataset.s === sig) return; b.dataset.s = sig;
  b.innerHTML = EVV[k].map(x => '<button data-v="' + x + '" role="tab" aria-selected="' + (x === v) + '" class="eb' + (x === v ? " on" : "") + '">' + nm[x].toUpperCase() + '</button>').join("");
}
$("#evsw").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b && b.dataset.v !== evView()) evSetView(b.dataset.v); });
function evRedraw() { if (evLast.gs) drawEvents(evLast.gs, evLast.map); }
const evTr = (a, b2, tm) => a.ad ? "All day" : tm(a) + (b2 && a.e && a.e > a.t ? " – " + tm({ t: a.e }) : "");
const evDots = (l, max) => { const c = []; l.forEach(v => { if (c.indexOf(v.c) < 0) c.push(v.c); }); return c.slice(0, max || 3).map(x => '<i style="--c:' + x + '"></i>').join(""); };
function evDayList(k, map, tm, srt, head) {   // one day's events as rows (phone week + phone month)
  const a = k.split("-"), d = new Date(+a[0], +a[1] - 1, +a[2]), l = srt((map[k] || []).slice());
  return '<div class="ah' + (k === dk(new Date()) ? " t" : "") + '">' + d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }).toUpperCase() + '</div>' +
    (l.length ? l.map(v => '<div class="ce" data-ev="' + v.i + '" style="--c:' + v.c + '"><span class="mo">' + evTr(v, false, tm) + '</span> ' + esc(v.s) + '</div>').join("") : '<div class="lbl evnone">Nothing on this day</div>');
}
function evSelDay(gs, today, wk) {   // the day the phone shows under the strip / grid
  const days = wk ? 7 : 0, first = wk ? dk(gs) : dk(new Date(cy, cm, 1)), inr = k => wk ? (k >= dk(gs) && k <= dk(new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + 6))) : (k.slice(0, 7) === dk(new Date(cy, cm, 1)).slice(0, 7));
  if (evSel && inr(evSel)) return evSel; return inr(today) ? today : first;
}
function evViews(V, gs, map, today, tm, srt, fin) {
  const g = $("#cg"), mob = isMobile(), WDS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  g.style.removeProperty("--rows");
  if (V === "week" && !mob) return evWeekGrid(g, gs, map, today, tm, srt, fin);
  if (V === "list") {   // tablet: day-grouped list with a little month beside it
    let h = ""; const m0 = new Date(cy, cm, 1), start = dk(m0) > today || dk(m0).slice(0, 7) !== today.slice(0, 7) ? dk(m0) : today, end = dk(new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + mrows() * 7));
    for (let i = 0, d = new Date(gs); i < mrows() * 7; i++, d = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i)) {
      const k = dk(d), l = srt((map[k] || []).slice()); if (!l.length || k < start || k >= end) continue;
      const tt = k === today ? "TODAY · " : k === dk(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1)) ? "TOMORROW · " : "";
      h += '<div class="ah' + (k >= today ? " up" : "") + (k === today ? " t" : "") + '" data-k="' + k + '">' + tt + d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + '</div>' +
        l.map(v => '<div class="ce" data-ev="' + v.i + '" style="--c:' + v.c + '"><span class="mo">' + evTr(v, true, tm) + '</span><b>' + esc(v.s) + '</b><em>' + esc(v.n) + '</em></div>').join("");
    }
    let mm = WDS.map(n => '<span class="dnm">' + n[0] + '</span>').join("");
    for (let i = 0; i < mrows() * 7; i++) { const d = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i), k = dk(d); mm += '<button class="' + (d.getMonth() !== cm ? "o " : "") + (k === today ? "t" : "") + '" data-jump="' + k + '">' + d.getDate() + '</button>'; }
    g.className = "cg ag evl"; g.innerHTML = '<div class="evla">' + (h || '<div class="lbl" style="margin-top:18px">No events this month</div>') + '</div><div class="evlm"><h4>' + esc(new Date(cy, cm, 1).toLocaleDateString([], { month: "long", year: "numeric" })) + '</h4><div class="emg">' + mm + '</div></div>';
    return;
  }
  if (V === "week") {   // phone: the week as a strip of days, the picked day's events underneath
    const sel = evSelDay(gs, today, true); let st = "";
    for (let i = 0; i < 7; i++) { const d = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i), k = dk(d); st += '<button data-pick="' + k + '" class="' + (k === today ? "t " : "") + (k === sel ? "on" : "") + '"><small>' + WDS[i] + '</small><b>' + d.getDate() + '</b><span>' + evDots(map[k] || [], 3) + '</span></button>'; }
    g.className = "cg ag evp"; g.innerHTML = '<div class="evstrip">' + st + '</div>' + evDayList(sel, map, tm, srt);
    return;
  }
  // phone month: compact grid with a dot per calendar, the picked day's events underneath
  const sel = evSelDay(gs, today, false), rows = mrows(); let c = WDS.map(n => '<span class="dnm">' + n[0] + '</span>').join("");
  for (let i = 0; i < rows * 7; i++) { const d = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i), k = dk(d); c += '<button data-pick="' + k + '" class="' + (d.getMonth() !== cm ? "o " : "") + (k === today ? "t " : "") + (k === sel ? "on" : "") + '"><b>' + d.getDate() + '</b><span>' + evDots(map[k] || [], 3) + '</span></button>'; }
  g.className = "cg ag evp"; g.innerHTML = '<div class="evmg">' + c + '</div>' + evDayList(sel, map, tm, srt);
}
function evWeekGrid(g, gs, map, today, tm, srt, fin) {   // tablet week: 7 columns, hours down the side, an all-day strip on top, a line for now
  const HH = 40, WDS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], days = [];
  let h0 = 7, h1 = 20; const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d0 = new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + i), d1 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1), k = dk(d0), l = srt((map[k] || []).slice()), ad = [], tl = [];
    l.forEach(v => { if (v.ad) return ad.push(v); const a = v.t > d0 ? v.t : d0, b = v.e && v.e < d1 ? v.e : d1; tl.push({ v: v, a: a, b: b > a ? b : new Date(a.getTime() + 30 * 6e4) }); });
    tl.forEach(x => { h0 = Math.min(h0, x.a.getHours()); h1 = Math.max(h1, x.b.getHours() + (x.b.getMinutes() || x.b.getDate() !== x.a.getDate() ? 1 : 0)); });
    tl.sort((p, q) => p.a - q.a); const ends = [];   // side by side when they overlap
    tl.forEach(x => { let ln = ends.findIndex(e => e <= x.a); if (ln < 0) ln = ends.length; ends[ln] = x.b; x.ln = ln; }); tl.forEach(x => x.n = ends.length);
    days.push({ d: d0, k: k, ad: ad, tl: tl });
  }
  if (days.some(d => d.k === today)) { h0 = Math.min(h0, Math.max(0, now.getHours() - 1)); h1 = Math.max(h1, Math.min(24, now.getHours() + 2)); }
  h1 = Math.min(24, Math.max(h1, h0 + 6));
  const y = d => (d.getHours() - h0 + d.getMinutes() / 60) * HH, hl = [];
  for (let hh = h0; hh < h1; hh++) hl.push('<span style="top:' + (hh - h0) * HH + 'px">' + (new Date(2000, 0, 1, hh)).toLocaleTimeString([], tmo({ hour: "numeric" })).replace(" ", "").toLowerCase() + '</span>');
  let hd = '<i></i>', al = '<i>ALL DAY</i>', bd = '<div class="wh" style="height:' + (h1 - h0) * HH + 'px">' + hl.join("") + '</div>';
  days.forEach((x, i) => {
    hd += '<div class="' + (x.k === today ? "t" : "") + '"><small>' + WDS[i] + '</small><b>' + x.d.getDate() + '</b></div>';
    al += '<div data-d="' + x.k + '">' + x.ad.map(v => '<div class="ce" data-ev="' + v.i + '" style="--c:' + v.c + '">' + esc(v.s) + '</div>').join("") + '</div>';
    bd += '<div class="wc' + (x.k === today ? " t" : "") + '" data-d="' + x.k + '" style="height:' + (h1 - h0) * HH + 'px">' + x.tl.map(o => {
      const t0 = y(o.a), t1 = o.b.getDate() !== o.a.getDate() ? (h1 - h0) * HH : y(o.b), ht = Math.max(22, t1 - t0 - 2);
      return '<div class="wev" data-ev="' + o.v.i + '" style="--c:' + o.v.c + ';top:' + t0 + 'px;height:' + ht + 'px;left:calc(' + o.ln + '*100%/' + o.n + ' + 2px);width:calc(100%/' + o.n + ' - 4px)"><b>' + esc(o.v.s) + '</b>' + (ht > 34 ? '<small>' + tm(o.v) + '</small>' : "") + '</div>';
    }).join("") + (x.k === today ? '<u class="wn" style="top:' + y(now) + 'px"></u>' : "") + '</div>';
  });
  g.className = "cg ag evwk"; g.innerHTML = '<div class="wk"><div class="wkh">' + hd + '</div><div class="wka">' + al + '</div><div class="wkb">' + bd + '</div></div>';
  const sc = g.querySelector(".wkb"); if (sc && fin && evJump) { evJump = false; const first = days.some(d => d.k === today) ? y(now) - HH : Math.min.apply(null, days.reduce((a, d) => a.concat(d.tl.map(o => y(o.a))), [h1 * HH])) - 10; sc.scrollTop = Math.max(0, first); }
}
document.addEventListener("click", e => { const j = e.target.closest("[data-jump]"); if (!j || !$("#events").contains(j)) return; const t = $('#cg .ah[data-k="' + j.dataset.jump + '"]') || [].slice.call($$("#cg .ah[data-k]")).filter(x => x.dataset.k >= j.dataset.jump)[0]; if (t) t.scrollIntoView({ block: "start", behavior: "smooth" }); });
{ let x0 = 0, y0 = 0;   // phone: swipe along the week strip / month for the next or previous one
  $("#cg").addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  $("#cg").addEventListener("touchend", e => { const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (isMobile() && evView() !== "agenda" && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && !evSq.on) shiftMonth(dx < 0 ? 1 : -1); }, { passive: true }); }
