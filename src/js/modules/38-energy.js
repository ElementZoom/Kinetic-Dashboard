// ---------- energy ----------
const EN_COL = ["#6bb8ff", "#8ff0c4", "#ffd166", "#ef476f", "#cdb4db", "#f78c6b", "#06d6a0", "#a2d2ff", "#ffafcc", "#b8f2e6"];
let en = { r: "day", o: 0, prefs: null, data: null, mode: "bar", err: "", busy: false };
// billing cycles (config.js billing): a cycle starts on this day of the month, or on the exact dates listed in starts (a meter reading can move it)
function enCyc(kind, oo, at) {
  const B = (CONFIG.billing || {})[kind]; if (!B) return null;
  const pdt = x => { const a = String(x).split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }, ov = {}; (B.starts || []).forEach(x => { const d = pdt(x); ov[d.getFullYear() + "-" + d.getMonth()] = d; });
  const n = at || new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate()), L = [];
  for (let y = n.getFullYear() - 4; y <= n.getFullYear() + 1; y++) for (let m = 0; m < 12; m++) L.push(ov[y + "-" + m] || new Date(y, m, B.day || 1));
  L.sort((a, b) => a - b); let i = 0; while (i + 1 < L.length && L[i + 1] <= t) i++; i += oo;
  return i >= 0 && i + 1 < L.length ? { s: L[i], e: L[i + 1] } : null;
}
function enSpan(oo, kind) {  if (oo == null) oo = en.o;
  const n = new Date(), s = new Date(n.getFullYear(), n.getMonth(), n.getDate()); let e, per, lab;
  if (en.r === "day") { s.setDate(s.getDate() + oo); e = new Date(s); e.setDate(e.getDate() + 1); per = "hour"; lab = s.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }); }
  else if (en.r === "week") { s.setDate(s.getDate() - ((s.getDay() + 6) % 7) + oo * 7); e = new Date(s); e.setDate(e.getDate() + 7); per = "day"; const l = new Date(e - 864e5); lab = s.toLocaleDateString([], { day: "numeric", month: "short" }) + " – " + l.toLocaleDateString([], { day: "numeric", month: "short" }); }
  else if (en.r === "month" && enCyc(kind || "electricity", oo)) { const c = enCyc(kind || "electricity", oo), l = new Date(+c.e - 864e5); per = "day"; lab = c.s.toLocaleDateString([], { day: "numeric", month: "short" }) + " – " + l.toLocaleDateString([], { day: "numeric", month: "short" }); return { s: c.s, e: c.e, per: per, lab: lab }; }
  else if (en.r === "month") { s.setDate(1); s.setMonth(s.getMonth() + oo); e = new Date(s); e.setMonth(e.getMonth() + 1); per = "day"; lab = s.toLocaleDateString([], { month: "long", year: "numeric" }); }
  else { s.setMonth(0, 1); s.setFullYear(s.getFullYear() + oo); e = new Date(s); e.setFullYear(e.getFullYear() + 1); per = "month"; lab = String(s.getFullYear()); }
  return { s: s, e: e, per: per, lab: lab };
}
const enSum = g => { const m = {}; Object.keys(g || {}).forEach(k => g[k].forEach(x => { const t = +new Date(x.start); m[t] = (m[t] || 0) + (x.change || 0); })); return m; };
// the real prices and gas that Home Assistant's Energy settings know about (for example from a power company's statistics)
function enSrc() { const o = { gc: [], gu: [], gk: [] }; ((en.prefs || {}).energy_sources || []).forEach(x => { if (x.type === "grid") (x.flow_from || []).forEach(f => { if (f.stat_cost) o.gc.push(f.stat_cost); }); else if (x.type === "gas" && x.stat_energy_from) { o.gu.push(x.stat_energy_from); if (x.stat_cost) o.gk.push(x.stat_cost); } }); return o; }
function enExtra(sp) {
  const o = enSrc(), gsp = enSpan(en.o, "gas"), tk = en.tok = (en.tok || 0) + 1; en.gridCost = o.gc.length ? undefined : null; en.gas = o.gu.length ? undefined : null; en.gasCost = o.gk.length ? undefined : null;
  const q = (ids, set, w) => { w = w || sp; if (ids.length) send({ type: "recorder/statistics_during_period", start_time: w.s.toISOString(), end_time: w.e.toISOString(), statistic_ids: ids, period: "hour", types: ["change"] }, g => { if (tk !== en.tok) return; set(g ? enSum(g) : null); drawEnergy(); }); };
  if (o.gc.length) setTimeout(() => { if (tk === en.tok && en.gridCost === undefined) { en.gridCost = null; drawEnergy(); } }, 12000);   // no answer: fall back to the tariff
  q(o.gc, m => { en.gridCost = m; }); q(o.gu, m => { en.gas = m; }, gsp); q(o.gk, m => { en.gasCost = m; }, gsp);
  if (o.gu.length && !en.gasUnit) send({ type: "recorder/get_statistics_metadata", statistic_ids: o.gu }, r => { const m = r && r[0]; en.gasUnit = (m && (m.display_unit_of_measurement || m.statistics_unit_of_measurement || m.unit_of_measurement)) || "kWh"; drawEnergy(); });
}
function enBars(bk, sp, vals, col, FS, mob, fm) {
  const mx = Math.max.apply(null, bk.map(b => vals[b] || 0).concat([0.001])), W = mob ? 420 : 360, H = mob ? 150 : 140, L = mob ? 50 : 42, B = mob ? 28 : 26, bw = (W - L) / bk.length; let g = "";
  for (let i = 0; i <= 2; i++) { const y = 8 + (H - B - 8) * (1 - i / 2); g += '<line x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".12"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="' + FS + '" fill="currentColor" opacity=".6">' + fm(mx * i / 2) + '</text>'; }
  bk.forEach((b, i) => { const v = vals[b] || 0, hh = v / mx * (H - B - 8), d = new Date(b); if (hh > 0.3) g += '<rect x="' + (L + i * bw + bw * 0.12).toFixed(1) + '" y="' + (H - B - hh).toFixed(1) + '" width="' + (bw * 0.76).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + col + '"><title>' + fm(v) + '</title></rect>';
    g += '<text x="' + (L + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="' + FS + '" fill="currentColor" opacity=".6">' + (en.r === "day" ? (i % 3 === 0 ? d.getHours() : "") : en.r === "week" ? d.toLocaleDateString([], { weekday: "short" }) : en.r === "month" ? (i % 2 === 0 ? d.getDate() : "") : d.toLocaleDateString([], { month: "short" })) + '</text>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;margin-top:8px;display:block">' + g + '</svg>';
}
// every grid import statistic Home Assistant's Energy settings know about (looked for in the whole grid source, so older and newer layouts both work)
function enGridIds(P) { const o = []; const walk = (x, d) => { if (!x || typeof x !== "object" || d > 4) return; Object.keys(x).forEach(k => { if (k === "stat_energy_from" && typeof x[k] === "string" && x[k]) o.push(x[k]); else walk(x[k], d + 1); }); }; ((P || {}).energy_sources || []).forEach(x => { if (x.type === "grid") walk(x, 0); }); return o.filter((v, i) => o.indexOf(v) === i); }
function loadEnergy() {
  if (en.busy || !ws || ws.readyState !== 1) return; en.busy = true; setTimeout(() => { en.busy = false; }, 15000);
  send({ type: "energy/get_prefs" }, (P, raw) => {   // read every time, so a source added in Home Assistant shows up without reloading
    if (!P) { en.busy = false; en.err = "Energy isn’t configured: " + (raw && raw.error ? raw.error.message : "no response"); en.data = {}; drawEnergy(); return; }
    en.prefs = P; en.err = ""; en.data = {}; en.key = en.r + en.o; en.prev = undefined;
    const sp = enSpan(), gid = enGridIds(P); en.gridIds = gid; enExtra(sp);
    if (!gid.length) { en.busy = false; en.grid = null; en.err = "Home Assistant’s Energy settings have no grid electricity set up (Settings > Dashboards > Energy > Electricity grid)."; drawEnergy(); return; }
    en.grid = undefined; drawEnergy();
    { const ps = enSpan(en.o - 1), nw = Date.now(); let pe = ps.e; if (sp.e > nw) pe = new Date(+ps.s + (nw - sp.s));
      send({ type: "recorder/statistics_during_period", start_time: ps.s.toISOString(), end_time: ps.e.toISOString(), statistic_ids: gid, period: "hour", types: ["change"] }, g => { const m = {}; Object.keys(g || {}).forEach(k => g[k].forEach(x => { const t = +new Date(x.start); if (t <= +pe) m[t] = (m[t] || 0) + (x.change || 0); })); en.prev = g ? m : null; drawEnergy(); }); }
    send({ type: "recorder/statistics_during_period", start_time: sp.s.toISOString(), end_time: sp.e.toISOString(), statistic_ids: gid, period: "hour", types: ["change"] }, g => { en.busy = false; en.grid = g ? enSum(g) : null; drawEnergy(); });
  });
}
function enBuckets(sp) {
  const o = [], d = new Date(sp.s);
  while (d < sp.e) { o.push(+d); if (sp.per === "hour") d.setHours(d.getHours() + 1); else if (sp.per === "day") d.setDate(d.getDate() + 1); else d.setMonth(d.getMonth() + 1); }
  return o;
}
const TARIFF_DEF = { symbol: "$", daily: 2.687, periods: [{ from: 0, to: 21, rate: 0.364, name: "Charged (midnight – 9pm)" }, { from: 21, to: 24, rate: 0, name: "Free (9pm – midnight)" }] };   // used when CONFIG.tariff is missing
const enRate = h => { const T = CONFIG.tariff || TARIFF_DEF, k = T.periods.filter(p => h >= p.from && h < p.to)[0]; return k ? k.rate : 0; };
function enBk(sp, t) { const d = new Date(t); return sp.per === "hour" ? +d : sp.per === "day" ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : +new Date(d.getFullYear(), d.getMonth(), 1); }
function enCost(sp) {   // grid import split into the tariff periods + daily charge (prices from the power company's statistics when Home Assistant has them)
  const T = CONFIG.tariff || TARIFF_DEF, m = en.grid; if (!T || !m || en.gridCost === undefined) return null;
  const per = T.periods.map(p => ({ p: p, kwh: 0, cost: 0 })), cols = {};
  let est = 0; Object.keys(m).forEach(t => { const d = new Date(+t), h = d.getHours(), k = per.filter(x => h >= x.p.from && h < x.p.to)[0]; if (!k) return; const real = en.gridCost && en.gridCost[t] != null && m[t] > 0.0005; if (!real && m[t] > 0.0005) est++; k.kwh += m[t]; k.cost += real ? en.gridCost[t] : m[t] * k.p.rate; const b = sp.per === "hour" ? +d : sp.per === "day" ? +new Date(d.getFullYear(), d.getMonth(), d.getDate()) : +new Date(d.getFullYear(), d.getMonth(), 1); (cols[b] = cols[b] || per.map(() => 0))[per.indexOf(k)] += m[t]; });
  let days = 0; const now = Date.now(); for (const d = new Date(sp.s); d < sp.e; d.setDate(d.getDate() + 1)) if (+d <= now) days++;
  let use = per.reduce((s, x) => s + x.cost, 0), fixed = days * T.daily, total = use + fixed;
  if (en.gridCost) {   // the power company's cost already holds the daily charge: show it as its own line, as the bill does, and the rest as usage on the paid hours
    const seen = {}; Object.keys(m).forEach(t => { if (m[t] > 0.0005 || en.gridCost[t]) seen[ymd(new Date(+t))] = 1; }); days = Object.keys(seen).length;
    total = use; fixed = Math.min(days * T.daily, total); const paid = per.filter(x => x.p.rate > 0), pk = paid.reduce((a, x) => a + x.kwh, 0);
    per.forEach(x => { x.cost = x.p.rate > 0 && pk > 0 ? (total - fixed) * x.kwh / pk : 0; }); use = total - fixed;
  }
  return { per: per, use: use, fixed: fixed, days: days, total: total, kwh: per.reduce((s, x) => s + x.kwh, 0), cols: cols, est: est, real: !!en.gridCost };
}
function drawEnergy() { enDraw(); const pg = $("#energy"); if (pg && pg.classList.contains("hold") && (en.data || en.err)) pgEnter(pg); }
function enDraw() {
  const mob = isMobile(), FS = mob ? 15 : 12, sp = enSpan(), pg = $("#energy"), P = en.prefs;
  let h = '<div class="eh ehc" style="margin-bottom:14px"><div class="chips tabs">' + [["day", "DAY"], ["week", "WEEK"], ["month", CONFIG.billing ? "BILL" : "MONTH"], ["year", "YEAR"]].map(x => '<button class="chip' + (en.r === x[0] ? " on" : "") + '" data-er="' + x[0] + '">' + x[1] + '</button>').join("") + '</div><div class="seg" style="margin-left:auto"><button class="eb" data-eo="-1">' + mdi("chevron-left") + '</button><button class="eb" data-eo="0" style="min-width:210px">' + esc(sp.lab) + '</button><button class="eb" data-eo="1">' + mdi("chevron-right") + '</button></div></div>';
  if (en.err) h += '<div class="pn lbl">' + esc(en.err) + '</div>';
  else if (!en.data || !P || en.grid === undefined || en.gridCost === undefined || en.gas === undefined || en.gasCost === undefined) h += en.body ? '<div class="enold">' + en.body + '</div>' : '<div class="pn lbl">' + (!en.data || !P ? "Loading…" : "Calculating cost…") + '</div>';   // the last page stays (dimmed) until the new one is ready, so changing the date does not blink
  else {
    const h0 = h.length, bk = enBuckets(sp), fm = v => v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
    const CS = enCost(sp), TT = CONFIG.tariff || TARIFF_DEF, mny = v => TT.symbol + v.toFixed(2);
    const GU = en.gasUnit || "kWh", sm = o => o ? Object.keys(o).reduce((a, k) => a + o[k], 0) : 0, gT = sm(en.gas), gC = en.gasCost ? sm(en.gasCost) : null, hasGas = en.gas && (gT > 0.0005 || gC > 0.005);
    // gas readings can arrive in lumps, so its daily charge counts the days that have passed, as the bill does
    const gsp = enSpan(en.o, "gas"), gbk = enBuckets(gsp), gdays = (() => { let n = 0; const now = Date.now(); for (const d = new Date(gsp.s); d < gsp.e; d.setDate(d.getDate() + 1)) if (+d <= now) n++; return n; })(), gD = (TT.gasDaily || 0) * gdays, gTot = (gC || 0) + gD, gdates = en.r === "month" && CONFIG.billing && CONFIG.billing.gas ? gsp.lab : "";
    let hgas = "", htot = "";
    const GR = +CONFIG.gst || 0, subT = CS ? Math.round((CS.total + (hasGas ? gTot : 0)) * 100) / 100 : 0, gstA = Math.round(subT * GR * 100) / 100, gx = GR ? "excl. GST" : "";   // gst: 0.15 in config.js adds GST to the total (the power company's figures are excl. GST)
    if (CS) htot = '<div class="pn pg entot" data-k="t"><div class="eh"><div><div class="lbl">Total energy cost</div><div class="h2" style="margin-top:4px">' + mny(subT + gstA) + '</div></div><div class="lbl ensub" style="margin-left:auto;text-align:right">' + (GR ? "incl. GST" : "") + '</div></div>' + (subT > 0 ? '<div class="enseg"><i style="flex:' + CS.total + ';background:#6bb8ff"></i>' + (hasGas && gTot > 0 ? '<i style="flex:' + gTot + ';background:#f78c6b"></i>' : '') + (gstA > 0 ? '<i style="flex:' + gstA + ';background:#8a94a6"></i>' : '') + '</div>' : '') + '<div class="enb">' +
      '<div class="enr"><i class="end" style="background:#6bb8ff"></i><span class="enn">Electricity</span><span class="lbl">' + fm(CS.kwh) + ' kWh</span><b>' + mny(CS.total) + '</b></div>' + (en.r === "month" && CONFIG.billing && CONFIG.billing.electricity ? '<div class="lbl ensd">' + esc(sp.lab) + '</div>' : '') +
      (hasGas ? '<div class="enr"><i class="end" style="background:#f78c6b"></i><span class="enn">Gas</span><span class="lbl">' + fm(gT) + ' ' + esc(GU) + '</span><b>' + (gC != null ? mny(gTot) : "—") + '</b></div>' + (gdates ? '<div class="lbl ensd">' + esc(gdates) + '</div>' : '') : '') +
      (GR ? '<div class="enr"><i class="end" style="background:#8a94a6"></i><span class="enn">GST</span><span class="lbl">' + (GR * 100).toFixed(GR * 100 % 1 ? 1 : 0) + '% of ' + mny(subT) + '</span><b>' + mny(gstA) + '</b></div>' : '') + '</div>' + (en.r !== "day" && subT > 0 ? '<div class="lbl enavg">Average per day ' + mny((subT + gstA) / Math.max(1, Math.ceil((Math.min(sp.e, Date.now()) - sp.s) / 864e5))) + '</div>' : '') + '</div>';
    if (hasGas) {
      hgas = '<div class="pn pg" data-k="g"><div class="eh"><div><div class="lbl">Gas cost' + (gdates ? ' · ' + esc(gdates) : '') + '</div><div class="h2" style="margin-top:4px">' + (gC != null ? mny(gTot) : "—") + '</div></div><div class="lbl ensub" style="margin-left:auto;text-align:right">' + fm(gT) + ' ' + esc(GU) + (GR ? ' · excl. GST' : '') + '</div></div><div class="enb">' +
        (gD > 0 ? '<div class="enr"><i class="end" style="background:#8a94a6"></i><span class="enn">Daily charge</span><span class="lbl">' + gdays + ' day' + (gdays === 1 ? "" : "s") + ' × ' + TT.symbol + TT.gasDaily.toFixed(3) + '</span><b>' + mny(gD) + '</b></div>' : '') +
        '<div class="enr"><i class="end" style="background:#f78c6b"></i><span class="enn">Usage</span><span class="lbl">' + fm(gT) + ' ' + esc(GU) + (gC != null && gT > 0.001 ? ' × ' + (gC / gT * 100).toFixed(1) + 'c' : '') + '</span><b>' + (gC != null ? mny(gC) : "—") + '</b></div></div>' +
        (en.r === "day" ? '<div class="lbl" style="margin:12px 0 -6px;text-transform:none;letter-spacing:0;opacity:.7">Gas readings arrive in lumps, so a single day\u2019s bars are approximate.</div>' : '') + '<div class="lbl" style="margin-top:14px">Usage · ' + esc(GU) + '</div>' + enBars(gbk, gsp, (() => { const v = {}; Object.keys(en.gas).forEach(t => { const b = enBk(gsp, +t); v[b] = (v[b] || 0) + en.gas[t]; }); return v; })(), "#f78c6b", FS, mob, fm) + '</div>';
    }
    if (CS) {
      h += htot;
      const PC = ["#6bb8ff", "#8ff0c4", "#ffd166", "#ef476f"];
      h += '<div class="pn pg" data-k="e"><div class="eh"><div><div class="lbl">Electricity cost</div><div class="h2" style="margin-top:4px">' + mny(CS.total) + '</div></div><div class="lbl ensub" style="margin-left:auto;text-align:right">' + fm(CS.kwh) + ' kWh ' + (en.gridSrc === "devices" ? "from tracked devices" : "from the grid") + (CS.real && CS.est ? ' · ' + CS.est + ' h estimated' : '') + (GR ? ' · excl. GST' : '') + '</div></div><div class="lbl ensrc" style="margin:-4px 0 10px;text-transform:none;letter-spacing:0;opacity:.7">' + (en.gridSrc === "devices" ? "Home Assistant\u2019s Energy settings have no grid usage, so this is the tracked devices only." : "Source: " + esc((en.gridIds || []).join(", ")) + " \u00b7 " + Object.keys(en.grid || {}).length + " hours of data") + '</div><div class="enb">' +
        CS.per.map((x, i) => '<div class="enr"><i class="end" style="background:' + PC[i % 4] + '"></i><span class="enn">' + esc(x.p.name || "") + '</span><span class="lbl">' + fm(x.kwh) + ' kWh × ' + ((CS.real && x.kwh > 0.001 ? x.cost / x.kwh : x.p.rate) * 100).toFixed(1) + 'c</span><b>' + mny(x.cost) + '</b></div>').join("") +
        ('<div class="enr"><i class="end" style="background:#8a94a6"></i><span class="enn">Daily charge</span><span class="lbl">' + CS.days + ' day' + (CS.days === 1 ? "" : "s") + ' × ' + TT.symbol + TT.daily.toFixed(3) + '</span><b>' + mny(CS.fixed) + '</b></div></div>');
      const ks = Object.keys(CS.cols).map(Number), cm = Math.max.apply(null, bk.map(b => (CS.cols[b] || [0]).reduce((a, c) => a + c, 0)).concat([0.001])), W2 = mob ? 420 : 360, H2 = mob ? 150 : 140, L2 = mob ? 50 : 42, B2 = mob ? 28 : 26, bw2 = (W2 - L2) / bk.length; let g2 = '';
      for (let i = 0; i <= 2; i++) { const y = 8 + (H2 - B2 - 8) * (1 - i / 2); g2 += '<line x1="' + L2 + '" x2="' + W2 + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".12"/><text x="' + (L2 - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="' + FS + '" fill="currentColor" opacity=".6">' + fm(cm * i / 2) + '</text>'; }
      bk.forEach((b, i) => { let y = H2 - B2; (CS.cols[b] || []).forEach((v, j) => { const hh = v / cm * (H2 - B2 - 8); if (hh > 0.3) g2 += '<rect x="' + (L2 + i * bw2 + bw2 * 0.12).toFixed(1) + '" y="' + (y - hh).toFixed(1) + '" width="' + (bw2 * 0.76).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + PC[j % 4] + '"><title>' + esc(CS.per[j].p.name || "") + ' ' + fm(v) + ' kWh</title></rect>'; y -= hh; }); const d = new Date(b); g2 += '<text x="' + (L2 + i * bw2 + bw2 / 2).toFixed(1) + '" y="' + (H2 - 7) + '" text-anchor="middle" font-size="' + FS + '" fill="currentColor" opacity=".6">' + (en.r === "day" ? (i % 3 === 0 ? d.getHours() : "") : en.r === "week" ? d.toLocaleDateString([], { weekday: "short" }) : en.r === "month" ? (i % 2 === 0 ? d.getDate() : "") : d.toLocaleDateString([], { month: "short" })) + '</text>'; });
      h += '<div class="lbl" style="margin-top:14px">Usage · kWh</div><svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:100%;margin-top:8px;display:block">' + g2 + '</svg></div>';
    } else h += '<div class="pn lbl">' + (en.grid === undefined || en.gridCost === undefined ? "Calculating cost…" : "Electricity cost unavailable: no usage data came back for " + (en.gridSrc === "devices" ? "your tracked devices" : "the grid meter") + " in this period.") + '</div>';
    h += hgas;

    if (CS) {
      const hf = x => { const f = k => CLK12() ? (k % 12 || 12) + (k % 24 < 12 ? "am" : "pm") : ("0" + k % 24).slice(-2) + ":00"; return f(x) + "–" + f(x + 1); }, rows = [], pn = ({ day: "yesterday", week: "last week", month: "last month", year: "last year" })[en.r], pl = en.o === 0 ? pn : "the previous " + en.r, part = sp.e > Date.now() && en.o === 0 ? " so far" : "";
      if (en.prev === undefined) rows.push(["Vs " + pl, "…", "Calculating…", ""]);
      else if (en.prev) {
        let pk = 0, pc = 0; Object.keys(en.prev).forEach(t => { const v = en.prev[t]; pk += v; pc += v * enRate(new Date(+t).getHours()); });
        const useC = !CS.real && pc > 0.005, cur = useC ? CS.use : CS.kwh, prv = useC ? pc : pk, f2 = v => useC ? mny(v) : fm(v) + " kWh";
        if (prv > 0.005) { const d = cur - prv, pc2 = d / prv * 100, up = d > 0.0005; rows.push(["Vs " + pl, (Math.abs(pc2) < 0.5 ? "≈ same" : (up ? "↑ " : "↓ ") + Math.abs(pc2).toFixed(0) + "%"), f2(cur) + " now vs " + f2(prv) + " at this point" + (part ? "" : "") + (CS.real ? "" : " · usage only"), Math.abs(pc2) < 0.5 ? "" : up ? "var(--heat)" : "var(--mint)"]); }
        else rows.push(["Vs " + pl, "—", "No usage recorded in " + pl, ""]);
      }
      const hr = {}; Object.keys(en.grid || {}).forEach(t => { const k = new Date(+t).getHours(); hr[k] = (hr[k] || 0) + en.grid[t]; });
      const pk = Object.keys(hr).sort((a, b) => hr[b] - hr[a])[0];
      if (pk != null && hr[pk] > 0.001) rows.push([en.r === "day" ? "Peak hour" : "Busiest hour of day", hf(+pk), fm(hr[pk]) + " kWh" + (en.r === "day" ? "" : " in total") + "", ""]);
      const fr = CS.per.filter(x => x.p.rate === 0), pd = CS.per.filter(x => x.p.rate > 0);
      if (fr.length && pd.length && CS.kwh > 0.001) {
        const fk = fr.reduce((a, x) => a + x.kwh, 0), fn = fr.map(x => x.p.name || "").join("").replace(/^.*\((.*)\).*$/, "$1") || "free hours";
        rows.push(["Free hours", Math.round(fk / CS.kwh * 100) + "% free", fm(fk) + " kWh used " + (fn === "free hours" ? fn : fn.replace(/–/, "to")) + "", "var(--mint)"]);
      }
      if (CS.real && pd.length) { const pkw = pd.reduce((a, x) => a + x.kwh, 0), pcost = CS.total - CS.fixed; if (pkw > 0.001 && pcost > 0) rows.push(["Average rate", (pcost / pkw * 100).toFixed(1) + "c", "per kWh on charged hours", ""]); }
      if (rows.length) h += '<div class="pn pg enins"><div class="lbl">Insights</div><div class="eni">' + rows.map(r => '<div class="eil"><div class="lbl">' + esc(r[0]) + '</div><div class="eiv"' + (r[3] ? ' style="color:' + r[3] + '"' : '') + '>' + esc(r[1]) + '</div><div class="eic">' + esc(r[2]) + '</div></div>').join("") + '</div></div>';
    }
    const et = hasGas && CS ? (en.tab === "g" ? "g" : "e") : "e";
    h = h.slice(0, h0) + (hasGas && CS ? '<div class="ensw"><button class="' + (et === "e" ? "on" : "") + '" data-et="e">ELECTRICITY</button><button class="' + (et === "g" ? "on" : "") + '" data-et="g">GAS</button></div>' : "") + '<div class="ensl" data-t="' + et + '" data-n="' + (hasGas && CS ? 3 : 2) + '">' + h.slice(h0) + '</div>'; en.body = h.slice(h0);
  }
  pg.innerHTML = h;
  if (en.tx != null && en.data && !pg.querySelector(".enold") && pg.querySelector(".ensl")) { const d = en.tx; en.tx = null; Array.prototype.slice.call(pg.querySelectorAll(".ensw,.ensl>.pn")).forEach((c, k) => { txGo(c, d, false); c.style.setProperty("--tx", d * 40 + "px"); c.style.setProperty("--ty", d ? "8px" : "18px"); c.style.animationDuration = ".7s"; c.style.animationDelay = k * 90 + "ms"; }); }
}
$("#energy").onclick = e => {
  const dt = e.target.closest("[data-et]"); if (dt) { en.tab = dt.dataset.et; drawEnergy(); return; }
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
  if (p !== "rooms") rEnter = true; onRooms = p === "rooms"; if (!onRooms) { curRoom = null; $("#cpp").classList.remove("on"); }
  stopCams(); if (p === "home") { applyLayout(); queueHome(); }
  if (p === "home" || (p === "security" && h[1] !== "detections") || p === "view") startCams();
  if (p === "events") { if (!evWasOn) evJump = true; loadEvents(); } evWasOn = p === "events";
  if (onRooms) {
    if (h[1]) { const was = curRoom && curRoom.id === h[1]; drawRoom(h[1]); if (!was) txGo($("#rv"), 1, true);
      if (h[2] === "doors") [120, 700, 1800].forEach(ms => setTimeout(() => { if (curRoom && curRoom.id === h[1] && location.hash.split("/")[2] === "doors") { const t = $('#rv [data-sec="doors"]'); if (t) { t.scrollIntoView({ block: "center", behavior: ms > 120 ? "auto" : "smooth" }); if (ms === 120) { t.classList.add("flash"); setTimeout(() => t.classList.remove("flash"), 1800); } } } }, ms)); }   // #rooms/<room>/doors scrolls to that room's Doors & windows panel   // list -> room slides in from the right
    else { const was = !!curRoom; drawRooms(); if (was) txGo($("#rl"), -1, true); }   // room -> list slides back from the left
  }
  if (p !== "security") secPrev = "";
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
  if (h[0] === "notifications" || h[0] === "active" || h[0] === "batteries") { npTab = h[0] === "active" ? "active" : h[0] === "batteries" ? "batteries" : "alerts"; npGo = h[0] === "active" && h[1] ? { s: h[1], t: Date.now() } : null; document.body.classList.add("np-open"); drawNotif(); }
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
  $("#clk").textContent = n.toLocaleTimeString([], tmo({ hour: CLK12() ? "numeric" : "2-digit", minute: "2-digit" }));
  batTick();
  $("#dt").textContent = n.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  $("#gr").textContent = (h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening") + (userName ? ", " + userName : userKnown ? "" : CONFIG.name ? ", " + CONFIG.name : "") + "!";
}
window.addEventListener("hashchange", route);
tick(); setInterval(tick, 10000); setInterval(batTick, 1500);
setInterval(() => { try { localStorage.setItem("dashSeen", Date.now()); } catch (_) {} }, 60000);   // "page is open" marker: the brand intro only plays after the page was closed for a while
setInterval(cams, 8000); setInterval(loadFc, 30 * 60000); setInterval(loadFcH, 30 * 60000); setInterval(() => { if (curPg() === "irrigation" || curRoom || document.body.classList.contains("np-open")) tickIrr(); if (curPg() === "media" || document.body.classList.contains("np-on")) tickMedia(); }, 1000); setInterval(queueNp, 30000); setInterval(() => { if (location.hash === "#events") loadEvents(); }, 15 * 60000);
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
// the first route() / drawGsum() / connect() now run from 41-start.js, after every other module has loaded (see there)

