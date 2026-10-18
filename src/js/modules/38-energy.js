// ---------- energy ----------
const EN_COL = ["#6bb8ff", "#8ff0c4", "#ffd166", "#ef476f", "#cdb4db", "#f78c6b", "#06d6a0", "#a2d2ff", "#ffafcc", "#b8f2e6"];
let en = { r: "day", o: 0, prefs: null, data: null, mode: "bar", err: "", busy: false };
function enSpan(oo) {  if (oo == null) oo = en.o;
  const n = new Date(), s = new Date(n.getFullYear(), n.getMonth(), n.getDate()); let e, per, lab;
  if (en.r === "day") { s.setDate(s.getDate() + oo); e = new Date(s); e.setDate(e.getDate() + 1); per = "hour"; lab = s.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }); }
  else if (en.r === "week") { s.setDate(s.getDate() - ((s.getDay() + 6) % 7) + oo * 7); e = new Date(s); e.setDate(e.getDate() + 7); per = "day"; const l = new Date(e - 864e5); lab = s.toLocaleDateString([], { day: "numeric", month: "short" }) + " – " + l.toLocaleDateString([], { day: "numeric", month: "short" }); }
  else if (en.r === "month") { s.setDate(1); s.setMonth(s.getMonth() + oo); e = new Date(s); e.setMonth(e.getMonth() + 1); per = "day"; lab = s.toLocaleDateString([], { month: "long", year: "numeric" }); }
  else { s.setMonth(0, 1); s.setFullYear(s.getFullYear() + oo); e = new Date(s); e.setFullYear(e.getFullYear() + 1); per = "month"; lab = String(s.getFullYear()); }
  return { s: s, e: e, per: per, lab: lab };
}
function loadEnergy() {
  if (en.busy || !ws || ws.readyState !== 1) return; en.busy = true; setTimeout(() => { en.busy = false; }, 15000);
  const go = () => {
    const sp = enSpan(), ids = en.prefs.device_consumption.map(d => d.stat_consumption);
    if (!ids.length) { en.busy = false; en.data = {}; en.err = "No individual devices are set up in Home Assistant’s Energy settings."; drawEnergy(); return; }
    send({ type: "recorder/statistics_during_period", start_time: sp.s.toISOString(), end_time: sp.e.toISOString(), statistic_ids: ids, period: sp.per, types: ["change"] }, (r, raw) => {
      en.err = r ? "" : "Could not load statistics: " + (raw && raw.error ? raw.error.message : "no response"); en.data = r || {}; en.key = en.r + en.o;
      const gs = (en.prefs.energy_sources || []).filter(x => x.type === "grid"); let gid = [];
      gs.forEach(g => (g.flow_from || []).forEach(f => { if (f.stat_energy_from) gid.push(f.stat_energy_from); }));
      en.gridSrc = gid.length ? "grid" : "devices"; if (!gid.length) gid = ids.slice();   // no grid meter in HA's Energy settings: price the tracked devices instead
      en.grid = undefined;
      en.devH = undefined; en.prev = undefined;
      if (!gid.length || en.err) { en.busy = false; en.grid = null; drawEnergy(); return; }
      { const ps = enSpan(en.o - 1), nw = Date.now(); let pe = ps.e; if (sp.e > nw) pe = new Date(+ps.s + (nw - sp.s));
        send({ type: "recorder/statistics_during_period", start_time: ps.s.toISOString(), end_time: ps.e.toISOString(), statistic_ids: gid, period: "hour", types: ["change"] }, g => { const m = {}; Object.keys(g || {}).forEach(k => g[k].forEach(x => { const t = +new Date(x.start); if (t <= +pe) m[t] = (m[t] || 0) + (x.change || 0); })); en.prev = g ? m : null; drawEnergy(); }); }
      drawEnergy();
      const sumH = g => { const m = {}; Object.keys(g || {}).forEach(k => g[k].forEach(x => { const t = +new Date(x.start); m[t] = (m[t] || 0) + (x.change || 0); })); return m; };
      // hourly per-device usage: needed to price each device and each bar (the rate depends on the hour)
      send({ type: "recorder/statistics_during_period", start_time: sp.s.toISOString(), end_time: sp.e.toISOString(), statistic_ids: ids, period: "hour", types: ["change"] }, h => {
        en.devH = h || null;
        if (en.gridSrc === "devices") { en.busy = false; en.grid = h ? sumH(h) : null; drawEnergy(); return; }
        drawEnergy();
        send({ type: "recorder/statistics_during_period", start_time: sp.s.toISOString(), end_time: sp.e.toISOString(), statistic_ids: gid, period: "hour", types: ["change"] }, g => { en.busy = false; en.grid = g ? sumH(g) : null; drawEnergy(); });
      });
    });
  };
  if (en.prefs) go(); else send({ type: "energy/get_prefs" }, (r, raw) => { if (!r) { en.busy = false; en.err = "Energy isn’t configured: " + (raw && raw.error ? raw.error.message : "no response"); en.data = {}; drawEnergy(); return; } en.prefs = r; go(); });
}
function enBuckets(sp) {
  const o = [], d = new Date(sp.s);
  while (d < sp.e) { o.push(+d); if (sp.per === "hour") d.setHours(d.getHours() + 1); else if (sp.per === "day") d.setDate(d.getDate() + 1); else d.setMonth(d.getMonth() + 1); }
  return o;
}
const TARIFF_DEF = { symbol: "$", daily: 2.687, periods: [{ from: 0, to: 21, rate: 0.364, name: "Charged (midnight – 9pm)" }, { from: 21, to: 24, rate: 0, name: "Free (9pm – midnight)" }] };   // used when CONFIG.tariff is missing
const enRate = h => { const T = CONFIG.tariff || TARIFF_DEF, k = T.periods.filter(p => h >= p.from && h < p.to)[0]; return k ? k.rate : 0; };
function enBk(sp, t) { const d = new Date(t); return sp.per === "hour" ? +d : sp.per === "day" ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : +new Date(d.getFullYear(), d.getMonth(), 1); }
function enCost(sp) {   // grid import split into the tariff periods + daily charge
  const T = CONFIG.tariff || TARIFF_DEF, m = en.grid; if (!T || !m) return null;
  const per = T.periods.map(p => ({ p: p, kwh: 0, cost: 0 })), cols = {};
  Object.keys(m).forEach(t => { const d = new Date(+t), h = d.getHours(), k = per.filter(x => h >= x.p.from && h < x.p.to)[0]; if (!k) return; k.kwh += m[t]; k.cost += m[t] * k.p.rate; const b = sp.per === "hour" ? +d : sp.per === "day" ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : +new Date(d.getFullYear(), d.getMonth(), 1); (cols[b] = cols[b] || per.map(() => 0))[per.indexOf(k)] += m[t]; });
  let days = 0; const now = Date.now(); for (const d = new Date(sp.s); d < sp.e; d.setDate(d.getDate() + 1)) if (+d <= now) days++;
  const use = per.reduce((s, x) => s + x.cost, 0), fixed = days * T.daily;
  return { per: per, use: use, fixed: fixed, days: days, total: use + fixed, kwh: per.reduce((s, x) => s + x.kwh, 0), cols: cols };
}
function drawEnergy() { enDraw(); const pg = $("#energy"); if (pg && pg.classList.contains("hold") && (en.data || en.err)) pgEnter(pg); }
function enDraw() {
  const mob = isMobile(), FS = mob ? 15 : 12, sp = enSpan(), pg = $("#energy"), P = en.prefs, nm = id => { const d = P && P.device_consumption.filter(x => x.stat_consumption === id)[0]; return (d && d.name) || fname(id).replace(/ (energy|consumption|total)$/i, ""); };
  let h = '<div class="eh ehc" style="margin-bottom:14px"><div class="chips tabs">' + [["day", "DAY"], ["week", "WEEK"], ["month", "MONTH"], ["year", "YEAR"]].map(x => '<button class="chip' + (en.r === x[0] ? " on" : "") + '" data-er="' + x[0] + '">' + x[1] + '</button>').join("") + '</div><div class="seg" style="margin-left:auto"><button class="eb" data-eo="-1">' + mdi("chevron-left") + '</button><button class="eb" data-eo="0" style="min-width:210px">' + esc(sp.lab) + '</button><button class="eb" data-eo="1">' + mdi("chevron-right") + '</button></div></div>';
  if (en.err) h += '<div class="pn lbl">' + esc(en.err) + '</div>';
  else if (!en.data || !P) h += '<div class="pn lbl">Loading…</div>';
  else {
    const h0 = h.length, bk = enBuckets(sp), dev = P.device_consumption.map(d => { const id = d.stat_consumption, rows = en.data[id] || [], m = {}; rows.forEach(x => { m[+new Date(x.start)] = x.change || 0; }); return { id: id, n: nm(id), m: m, tot: rows.reduce((s, x) => s + (x.change || 0), 0) }; }).filter(x => x.tot > 0.0005).sort((a, b) => b.tot - a.tot);
    dev.forEach((x, i) => { x.c = i < 9 ? EN_COL[i] : "#8a94a6"; x.cm = {}; x.cost = null; if (en.devH) { x.cost = 0; (en.devH[x.id] || []).forEach(r => { const t = +new Date(r.start), v = (r.change || 0) * enRate(new Date(t).getHours()); x.cost += v; const b = enBk(sp, t); x.cm[b] = (x.cm[b] || 0) + v; }); } });
    const TC = CONFIG.tariff || TARIFF_DEF, mc = v => TC.symbol + v.toFixed(2), cst = x => x.cost == null ? "" : ' <span class="enc">· ' + mc(x.cost) + '</span>', cu = en.unit === "cost" && !!en.devH, val = (x, b) => cu ? (x.cm[b] || 0) : (x.m[b] || 0);
    const total = dev.reduce((s, x) => s + x.tot, 0), mx = dev.length ? dev[0].tot : 1, fm = v => v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
    let ov;
    if (!dev.length) ov = '<div class="lbl" style="margin-top:12px">No consumption recorded in this period</div>';
    else if (en.mode === "bar") ov = '<div class="enb">' + dev.map(x => '<div class="enr"><span class="enn">' + esc(x.n) + '</span><div class="enbar"><i style="width:' + Math.max(1.5, x.tot / mx * 100) + '%;background:' + x.c + '"></i></div><b>' + fm(x.tot) + ' kWh' + cst(x) + '</b></div>').join("") + '</div>';
    else { let a0 = -Math.PI / 2, arcs = ""; dev.forEach(x => { const a1 = a0 + x.tot / total * 6.28318, big = a1 - a0 > Math.PI ? 1 : 0, R = 90, r0 = 56, c = (r, a) => (110 + r * Math.cos(a)).toFixed(2) + " " + (110 + r * Math.sin(a)).toFixed(2); arcs += dev.length === 1 ? '<circle cx="110" cy="110" r="73" fill="none" stroke="' + x.c + '" stroke-width="34"/>' : '<path d="M' + c(R, a0) + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + c(R, a1 - 0.0001) + 'L' + c(r0, a1 - 0.0001) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + c(r0, a0) + 'Z" fill="' + x.c + '"><title>' + esc(x.n) + ' ' + fm(x.tot) + ' kWh</title></path>'; a0 = a1; });
      ov = '<div class="enp"><svg viewBox="0 0 220 220" width="220" height="220">' + arcs + '<text x="110" y="108" text-anchor="middle" fill="currentColor" font-size="26" font-weight="300">' + fm(total) + '</text><text x="110" y="128" text-anchor="middle" fill="currentColor" opacity=".6" font-size="' + FS + '">kWh</text></svg><div class="enb" style="flex:1">' + dev.map(x => '<div class="enr"><i class="end" style="background:' + x.c + '"></i><span class="enn">' + esc(x.n) + '</span><b>' + fm(x.tot) + ' kWh' + cst(x) + '</b></div>').join("") + '</div></div>'; }
    const CS = enCost(sp), TT = CONFIG.tariff || TARIFF_DEF, mny = v => TT.symbol + v.toFixed(2);
    if (CS) {
      const PC = ["#6bb8ff", "#8ff0c4", "#ffd166", "#ef476f"];
      h += '<div class="pn pg"><div class="eh"><div><div class="lbl">Electricity cost</div><div class="h2" style="margin-top:4px">' + mny(CS.total) + '</div></div><div class="lbl ensub" style="margin-left:auto;text-align:right">' + fm(CS.kwh) + ' kWh ' + (en.gridSrc === "devices" ? "from tracked devices" : "from the grid") + '</div></div><div class="enb">' +
        CS.per.map((x, i) => '<div class="enr"><i class="end" style="background:' + PC[i % 4] + '"></i><span class="enn">' + esc(x.p.name || "") + '</span><span class="lbl">' + fm(x.kwh) + ' kWh × ' + (x.p.rate * 100).toFixed(1) + 'c</span><b>' + mny(x.cost) + '</b></div>').join("") +
        '<div class="enr"><i class="end" style="background:#8a94a6"></i><span class="enn">Daily charge</span><span class="lbl">' + CS.days + ' day' + (CS.days === 1 ? "" : "s") + ' × ' + TT.symbol + TT.daily.toFixed(3) + '</span><b>' + mny(CS.fixed) + '</b></div></div>';
      const ks = Object.keys(CS.cols).map(Number), cm = Math.max.apply(null, bk.map(b => (CS.cols[b] || [0]).reduce((a, c) => a + c, 0)).concat([0.001])), W2 = mob ? 420 : 700, H2 = mob ? 150 : 170, L2 = mob ? 50 : 46, B2 = mob ? 28 : 26, bw2 = (W2 - L2) / bk.length; let g2 = '';
      for (let i = 0; i <= 2; i++) { const y = 8 + (H2 - B2 - 8) * (1 - i / 2); g2 += '<line x1="' + L2 + '" x2="' + W2 + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".12"/><text x="' + (L2 - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="' + FS + '" fill="currentColor" opacity=".6">' + fm(cm * i / 2) + '</text>'; }
      bk.forEach((b, i) => { let y = H2 - B2; (CS.cols[b] || []).forEach((v, j) => { const hh = v / cm * (H2 - B2 - 8); if (hh > 0.3) g2 += '<rect x="' + (L2 + i * bw2 + bw2 * 0.12).toFixed(1) + '" y="' + (y - hh).toFixed(1) + '" width="' + (bw2 * 0.76).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + PC[j % 4] + '"><title>' + esc(CS.per[j].p.name || "") + ' ' + fm(v) + ' kWh</title></rect>'; y -= hh; }); const d = new Date(b); g2 += '<text x="' + (L2 + i * bw2 + bw2 / 2).toFixed(1) + '" y="' + (H2 - 7) + '" text-anchor="middle" font-size="' + FS + '" fill="currentColor" opacity=".6">' + (en.r === "day" ? (i % 3 === 0 ? d.getHours() : "") : en.r === "week" ? d.toLocaleDateString([], { weekday: "short" }) : en.r === "month" ? (i % 2 === 0 ? d.getDate() : "") : d.toLocaleDateString([], { month: "short" })) + '</text>'; });
      h += '<div class="lbl" style="margin-top:14px">Usage · kWh</div><svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;margin-top:8px;display:block">' + g2 + '</svg></div>';
    } else h += '<div class="pn lbl">' + (en.grid === undefined ? "Calculating cost…" : "Electricity cost unavailable: no usage data came back for " + (en.gridSrc === "devices" ? "your tracked devices" : "the grid meter") + " in this period.") + '</div>';
    h += '<div class="pn pg"><div class="eh"><div><div class="lbl">Consumption overview</div><div class="h2" style="margin-top:4px">' + fm(total) + ' kWh' + (en.devH ? ' <span class="enc">· ' + mc(dev.reduce((a, x) => a + (x.cost || 0), 0)) + '</span>' : '') + '</div></div><div class="seg" style="margin-left:auto"><button class="eb' + (en.mode === "bar" ? " on" : "") + '" data-em="bar">' + mdi("chart-bar") + '</button><button class="eb' + (en.mode === "pie" ? " on" : "") + '" data-em="pie">' + mdi("chart-pie") + '</button></div></div>' + ov + '</div>';

    if (CS) {
      const hf = x => { const f = k => (k % 12 || 12) + (k % 24 < 12 ? "am" : "pm"); return f(x) + "–" + f(x + 1); }, rows = [], pn = ({ day: "yesterday", week: "last week", month: "last month", year: "last year" })[en.r], pl = en.o === 0 ? pn : "the previous " + en.r, part = sp.e > Date.now() && en.o === 0 ? " so far" : "";
      if (en.prev === undefined) rows.push(["Vs " + pl, "…", "Calculating…", ""]);
      else if (en.prev) {
        let pk = 0, pc = 0; Object.keys(en.prev).forEach(t => { const v = en.prev[t]; pk += v; pc += v * enRate(new Date(+t).getHours()); });
        const useC = pc > 0.005, cur = useC ? CS.use : CS.kwh, prv = useC ? pc : pk, f2 = v => useC ? mny(v) : fm(v) + " kWh";
        if (prv > 0.005) { const d = cur - prv, pc2 = d / prv * 100, up = d > 0.0005; rows.push(["Vs " + pl, (Math.abs(pc2) < 0.5 ? "≈ same" : (up ? "↑ " : "↓ ") + Math.abs(pc2).toFixed(0) + "%"), f2(cur) + " now vs " + f2(prv) + " at this point" + (part ? "" : "") + " · usage only", Math.abs(pc2) < 0.5 ? "" : up ? "var(--heat)" : "var(--mint)"]); }
        else rows.push(["Vs " + pl, "—", "No usage recorded in " + pl, ""]);
      }
      const hr = {}; Object.keys(en.grid || {}).forEach(t => { const k = new Date(+t).getHours(); hr[k] = (hr[k] || 0) + en.grid[t]; });
      const pk = Object.keys(hr).sort((a, b) => hr[b] - hr[a])[0], tp = dev.length ? dev.slice().sort((a, b) => (b.cost || 0) - (a.cost || 0) || b.tot - a.tot)[0] : null, sumC = dev.reduce((a, x) => a + (x.cost || 0), 0);
      if (pk != null && hr[pk] > 0.001) rows.push([en.r === "day" ? "Peak hour" : "Busiest hour of day", hf(+pk), fm(hr[pk]) + " kWh" + (en.r === "day" ? "" : " in total") + (tp ? " · biggest spender: " + tp.n + " (" + (sumC > 0.005 && tp.cost != null ? Math.round(tp.cost / sumC * 100) + "% of cost" : Math.round(tp.tot / total * 100) + "% of kWh") + ")" : ""), ""]);
      const fr = CS.per.filter(x => x.p.rate === 0), pd = CS.per.filter(x => x.p.rate > 0);
      if (fr.length && pd.length && CS.kwh > 0.001) {
        const fk = fr.reduce((a, x) => a + x.kwh, 0), pt = dev.filter(x => x.cost > 0.005).sort((a, b) => b.cost - a.cost)[0], fn = fr.map(x => x.p.name || "").join("").replace(/^.*\((.*)\).*$/, "$1") || "free hours";
        rows.push(["Free hours", Math.round(fk / CS.kwh * 100) + "% free", fm(fk) + " kWh used " + (fn === "free hours" ? fn : fn.replace(/–/, "to")) + (pt ? " · running " + pt.n + " there instead could save up to " + mny(pt.cost) : ""), "var(--mint)"]);
      }
      if (rows.length) h += '<div class="pn pg enins"><div class="lbl">Insights</div><div class="eni">' + rows.map(r => '<div class="eil"><div class="lbl">' + esc(r[0]) + '</div><div class="eiv"' + (r[3] ? ' style="color:' + r[3] + '"' : '') + '>' + esc(r[1]) + '</div><div class="eic">' + esc(r[2]) + '</div></div>').join("") + '</div></div>';
    }
    const nc = (h.slice(h0).match(/<div class="pn/g) || []).length;
    h = h.slice(0, h0) + '<div class="ensl">' + h.slice(h0) + '</div><div class="dots irdots endots">' + Array.from({ length: nc }, (_, i) => '<i data-ei="' + i + '"' + (i === (en.si || 0) ? ' class="on"' : "") + '></i>').join("") + '</div>';
  }
  pg.innerHTML = h;
  { const sl = $(".ensl", pg); if (sl && en.si && isMobile()) sl.scrollLeft = en.si * (sl.clientWidth + 12); }
  if (en.tx != null && en.data) { const d = en.tx; en.tx = null; Array.prototype.slice.call(pg.children, 1).forEach((c, k) => { txGo(c, d, false); c.style.setProperty("--tx", d * 56 + "px"); c.style.setProperty("--ty", d ? "10px" : "22px"); c.style.animationDuration = ".9s"; c.style.animationDelay = k * 110 + "ms"; }); }
}
$("#energy").addEventListener("scroll", e => { const g = e.target; if (!g.classList || !g.classList.contains("ensl") || !g.clientWidth) return; en.si = Math.round(g.scrollLeft / (g.clientWidth + 12)); $$("#energy .endots i").forEach((d, k) => d.classList.toggle("on", k === en.si)); }, true);
$("#energy").onclick = e => {
  const dt = e.target.closest("[data-ei]"); if (dt) { const g = $("#energy .ensl"); if (g) g.scrollTo({ left: +dt.dataset.ei * (g.clientWidth + 12), behavior: "smooth" }); return; }
  const r = e.target.closest("[data-er]"), o = e.target.closest("[data-eo]"), m = e.target.closest("[data-em]"), u = e.target.closest("[data-eu]");
  if (u) { en.unit = u.dataset.eu; drawEnergy(); }
  else if (r) { const ord = ["day", "week", "month", "year"]; en.tx = ord.indexOf(r.dataset.er) > ord.indexOf(en.r) ? 1 : -1; en.r = r.dataset.er; en.o = 0; en.data = null; drawEnergy(); loadEnergy(); }
  else if (o) { en.tx = +o.dataset.eo === 0 ? 0 : (+o.dataset.eo > 0 ? 1 : -1); en.o = +o.dataset.eo === 0 ? 0 : en.o + +o.dataset.eo; en.data = null; drawEnergy(); loadEnergy(); }
  else if (m) { en.mode = m.dataset.em; drawEnergy(); }
};
setInterval(() => { if (curPg() === "energy") loadEnergy(); }, 5 * 60000);

const lzIO = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("lzo"); lzIO.unobserve(e.target); setTimeout(() => e.target.classList.remove("lzp", "lzo"), 700); } }), { rootMargin: "0px 0px -40px 0px" }) : null;
// a page redrawn while its entrance is running (live update, data arriving): the new cards join the fade where it already is, instead of starting again from invisible
(function () {
  if (!window.MutationObserver) return;
  document.querySelectorAll(".page").forEach(pg => new MutationObserver(ms => {
    if (!pg.classList.contains("enter")) return; const el = performance.now() - (pg._enT || 0); if (el < 30) return;
    ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType !== 1) return;
      try { n.getAnimations({ subtree: true }).forEach(a => { if (a.animationName === "cdIn" || a.animationName === "pgFade") a.currentTime = (a.currentTime || 0) + el; }); } catch (e) { pg.classList.remove("enter"); } }));
  }).observe(pg, { childList: true, subtree: true }));
})();
function pgEnter(el) { clearTimeout(el._hold); el.classList.remove("hold", "enter"); void el.offsetWidth; el._enT = performance.now(); el.classList.add("enter"); clearTimeout(el._enX); el._enX = setTimeout(() => el.classList.remove("enter"), 900); }
function pgHold(el, ms) { el.classList.remove("enter"); el.classList.add("hold"); clearTimeout(el._hold); el._hold = setTimeout(() => pgEnter(el), ms); }   // wait (briefly) for the page's data so it fades in once, complete
function lazyIn(pg) {
  if (!lzIO || !isMobile() || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  setTimeout(() => {
    pg.querySelectorAll(".pn,.card,.rc,.cam,.zn,.gal,.sct,.hm>*,.wcols>*").forEach(n => {
      if (n.classList.contains("lzp") || n.classList.contains("fs") || n.closest(".lzp,.fcs,.zg,#grid,.hsc,.thr,.sct")) return;
      const r = n.getBoundingClientRect();
      if (r.height && r.top > innerHeight) { n.classList.add("lzp"); lzIO.observe(n); }
    });
  }, 450);
}
let lastPg = null;
function route() {
  if (/^#palette/.test(location.hash)) { try { history.replaceState(null, "", location.hash.replace("#palette", "#theme")); } catch (_) {} }
  document.body.classList.remove("nav-open", "np-open");
  { const h0 = location.hash.slice(1).split("/")[0], lp = RU && PAGE_ON(RU.landing || "") ? RU.landing : (RU_ALL.filter(PAGE_ON)[0] || "home");
    if (h0 && !PAGE_ON(h0) && h0 !== "home") { location.replace("#" + (PAGE_ON("home") ? "home" : lp)); return; }
    if ((!h0 || h0 === "home") && !PAGE_ON("home")) { location.replace("#" + lp); return; }
    if (h0 === "security" && /^#security\/detections/.test(location.hash) && !ruSec("detections")) { location.replace("#security"); return; } }
  const h = location.hash.slice(1).split("/"), k = h[0] === "camera" ? "view" : h[0], p = ["climate", "events", "rooms", "security", "weather", "energy", "irrigation", "scenes", "media", "theme", "vehicle", "hazards", "view"].indexOf(k) > -1 ? k : "home", pg = p === "rooms" ? "roomspg" : p;
  $("#vw").className = p === "view" ? $("#vw").className : ""; document.body.classList.toggle("vwb", p === "view"); if (p === "view") vwFull(); else vwFullOff(); if (p !== "view") document.querySelectorAll("#vw .cam.ls, #vw .cam.nfs").forEach(e => camLandOff(e, true));
  ["home", "climate", "events", "roomspg", "security", "weather", "energy", "irrigation", "scenes", "media", "theme", "vehicle", "hazards"].forEach(x => $("#" + x).classList.toggle("on", x === pg));
  { const t = $("#ttl"), back = p === "home" || !PAGE_ON("home") ? "" : p === "rooms" && h[1] ? "#rooms" : p === "view" ? (VW.back && VW.back !== location.hash ? VW.back : "#home") : "#home";   // phone: the page title is the back button (room -> Rooms, any other page -> Home)
    t.innerHTML = (back ? '<svg class="tbc" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' : "") + "<span>" + p.charAt(0).toUpperCase() + p.slice(1) + "</span>"; t.dataset.back = back; t.classList.toggle("bk", !!back); }
  { const el = $("#" + pg); if (el && el !== lastPg && bootDone) { if (pg === "energy" && !en.data) pgHold(el, 900); else pgEnter(el); } lastPg = el; if (el) lazyIn(el); }
  $$("nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + p));
  document.body.classList.remove("more-open");
  { const inMore = $$("#mshe a").some(a => a.getAttribute("href") === "#" + p); $$("#btab a, #mshe a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + p)); $("#bmore").classList.toggle("on", inMore); }
  onRooms = p === "rooms"; if (!onRooms) curRoom = null;
  stopCams(); if (p === "home") { applyLayout(); queueHome(); }
  if (p === "home" || (p === "security" && h[1] !== "detections") || p === "view") startCams();
  if (p === "events") loadEvents();
  if (onRooms) {
    if (h[1]) { const was = curRoom && curRoom.id === h[1]; drawRoom(h[1]); if (!was) txGo($("#rv"), 1, true);
      if (h[2] === "doors") [120, 700, 1800].forEach(ms => setTimeout(() => { if (curRoom && curRoom.id === h[1] && location.hash.split("/")[2] === "doors") { const t = $('#rv [data-sec="doors"]'); if (t) { t.scrollIntoView({ block: "center", behavior: ms > 120 ? "auto" : "smooth" }); if (ms === 120) { t.classList.add("flash"); setTimeout(() => t.classList.remove("flash"), 1800); } } } }, ms)); }   // #rooms/<room>/doors scrolls to that room's Doors & windows panel   // list -> room slides in from the right
    else { const was = !!curRoom; drawRooms(); if (was) txGo($("#rl"), -1, true); }   // room -> list slides back from the left
  }
  if (p === "security") secTab(h[1] === "detections" && dtCams().length && CONFIG.detections !== false && ruSec("detections") ? "det" : "live");
  if (p === "weather") {   // #weather/wind | rain | uv opens that forecast tab and scrolls to it
    const ti = { temp: 0, wind: 1, rain: 2, uv: 3, cloud: 3 }[h[1]];
    if (ti != null) fcTab = ti;
    drawWeather();
    if (ti != null) [60, 1500].forEach(ms => setTimeout(() => { if (curPg() === "weather") { fcSync(); const f = $("#wx .fcp"); if (f) f.scrollIntoView({ block: "start" }); } }, ms));
  }
  if (p === "energy") { if (en.key !== en.r + en.o) en.data = null; drawEnergy(); loadEnergy(); }   // same period as last time: show it straight away and refresh quietly
  if (p === "irrigation") { zSheet = false; $("#irrigation").classList.remove("zop"); }
  document.body.classList.remove("pill-open");
  if (p === "irrigation") { drawIrr(); loadIrrH(); }
  if (p === "scenes") { scSheet = false; $("#scenes").classList.remove("scop"); drawScenes(); }
  if (p === "media") drawMedia();
  if (p === "theme") drawPalette();
  npSheet = false; npRender();
  if (p === "vehicle") drawVehicle();
  if (p === "hazards") { HZ.vb = null; HZ.slide = 0; HZ.view = HZ.view || (states["zone.home"] ? "home" : "ni"); requestAnimationFrame(drawHaz); }
  if (h[0] === "disarm") alarmLink("disarm"); else if (h[0] === "arm") alarmLink("arm_" + (h[1] || "away"));
  if (h[0] === "notifications" || h[0] === "active") { npTab = h[0] === "active" ? "active" : "alerts"; document.body.classList.add("np-open"); drawNotif();
    if (h[0] === "active" && h[1]) [80, 1500].forEach(ms => setTimeout(() => { if (document.body.classList.contains("np-open")) { const t = $('#np [data-sec="' + h[1] + '"]'); if (t) t.scrollIntoView({ block: "start" }); } }, ms)); }
}
// tablet battery pill: shown on the Fully Kiosk tablet only ("kiosk" = the Fully JS interface, a FullyKiosk user agent, or ?tablet=1 once; "always" / "never" override)
const BAT_ON = (() => {
  const m = CONFIG.batteryDisplay || "kiosk"; if (m === "never") return false; if (m === "always") return true;
  let ls = null; try { const q = /[?&]tablet=(\d)/.exec(location.search); if (q) localStorage.setItem("dashTablet", q[1]); ls = localStorage.getItem("dashTablet"); } catch (_) {}
  if (ls === "0") return false;
  return ls === "1" || typeof window.fully !== "undefined" || /FullyKiosk|Fully Kiosk/i.test(navigator.userAgent);
})();
let batKey = "";
function batTick() {
  const el = $("#bat"); if (!el) return;
  const s = BAT_ON && states[E("tabletBattery")], v = s ? parseFloat(s.state) : NaN;
  if (!s || isNaN(v)) { if (batKey !== "x") { batKey = "x"; el.hidden = true; } return; }
  const pct = Math.max(0, Math.min(100, Math.round(v))), plug = isOn(E("tabletPlugged")), key = pct + (plug ? "p" : "n");
  if (key === batKey) return; batKey = key;
  const w = (12.6 * pct / 100).toFixed(1);
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="16" height="10" rx="2.5"/><path d="M21 10.5v3"/><rect x="4.7" y="9.2" width="' + w + '" height="5.6" rx="1" fill="currentColor" stroke="none"/>' + '</svg>' + (plug ? '<svg class="bz" viewBox="0 0 24 24" fill="currentColor"><path d="M13.2 2 5.4 13.4h5.2L9.6 22l8.6-12.2h-5.3z"/></svg>' : "") + '<span>' + pct + "%</span>";
  el.className = plug ? "chg" : pct <= 20 ? "low" : ""; el.title = "Tablet battery " + pct + "%" + (plug ? ", charging" : ""); el.setAttribute("aria-label", el.title); el.hidden = false;
}
function tick() {
  const n = new Date(), h = n.getHours();
  $("#clk").textContent = n.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  batTick();
  $("#dt").textContent = n.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  $("#gr").textContent = (h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening") + (userName ? ", " + userName : userKnown ? "" : CONFIG.name ? ", " + CONFIG.name : "") + "!";
}
window.addEventListener("hashchange", route);
tick(); setInterval(tick, 10000); setInterval(batTick, 1500);
setInterval(() => { try { localStorage.setItem("dashSeen", Date.now()); } catch (_) {} }, 60000);   // "page is open" marker: the brand intro only plays after the page was closed for a while
setInterval(cams, 8000); setInterval(loadFc, 30 * 60000); setInterval(loadFcH, 30 * 60000); setInterval(() => { if (curPg() === "irrigation" || document.body.classList.contains("np-open")) tickIrr(); if (curPg() === "media" || document.body.classList.contains("np-on")) tickMedia(); }, 1000); setInterval(queueNp, 30000); setInterval(() => { if (location.hash === "#events") loadEvents(); }, 15 * 60000);
document.body.classList.add("m-" + (CONFIG.mobileNav === "tabs" ? "tabs" : "drawer"));
const setPath = () => CONFIG.settingsPath || "/config/dashboard";
$("#navset").href = CONFIG.url + setPath();
// inside the Lovelace iframe card a normal link would load Home Assistant *inside* the iframe, so navigate the parent page instead
$("#navset2").href = CONFIG.url + setPath();
$("#navset").onclick = $("#navset2").onclick = e => {
  e.preventDefault();
  try { if (window.top !== window.parent || window.parent === window) throw 0; const w = window.parent; w.history.pushState(null, "", setPath()); w.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); }
  catch (_) { try { (window.top || window).location.href = CONFIG.url + setPath(); } catch (__) { location.href = CONFIG.url + setPath(); } }
};
$("#bmore").onclick = e => { e.stopPropagation(); document.body.classList.toggle("more-open"); };
document.addEventListener("click", () => document.body.classList.remove("more-open"));
$("#hb").onclick = () => document.body.classList.toggle("nav-open");
$("#ttl").onclick = () => { const b = $("#ttl").dataset.back; if (b && isMobile()) location.hash = b; };
$("#bd").onclick = () => document.body.classList.remove("nav-open");
const mq = window.matchMedia("(max-width:760px)"); if (mq.addEventListener) mq.addEventListener("change", route); else mq.addListener(route);
["rooms", "climate", "security", "weather", "energy", "irrigation", "scenes", "media", "events", "vehicle", "hazards", "theme"].forEach(p => { if (!PAGE_ON(p)) $$('a[href="#' + p + '"]').forEach(a => a.remove()); });
// Opened from a notification through the Home Assistant page that holds this dashboard in an iframe: the target page rides on the outer
// address (…/your-dashboard/0#view/driveway or …?go=view/driveway). Read it once at start-up and again whenever the outer address changes.
(function () {
  const pick = () => { try {
    if (window.parent === window) return;
    const L = window.parent.location, g = new URLSearchParams(L.search).get("go"), h = g ? "#" + g.replace(/^#/, "") : L.hash;
    if (h && /^#[a-z]/i.test(h) && h !== location.hash) { history.replaceState(null, "", location.pathname + location.search + h); return true; }
  } catch (_) {} };
  pick();
  try { window.parent.addEventListener("hashchange", () => { if (pick()) route(); }); } catch (_) {}
})();
route(); drawGsum(); authReturn().then(r => { if (r !== "fail") connect(); });

