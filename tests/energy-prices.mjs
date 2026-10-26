// Energy page: real electricity and gas prices from Home Assistant's Energy settings (statistics), gas card, totals, plugs priced at the real hourly rate, tariff as the fallback.
// Run:  node tests/energy-prices.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "living", name: "Living", main: true }], gst: 0.15, billing: { electricity: { day: 14, starts: ["2026-09-12"] }, gas: { day: 10 } }, tariff: { symbol: "$", daily: 2.611, gasDaily: 1.832, periods: [{ from: 0, to: 21, rate: 0.364, name: "Charged" }, { from: 21, to: 24, rate: 0, name: "Free" }] } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, v) => { checks++; if (!v) problems.push(what); };
async function run(withCost, VP = { width: 1200, height: 1400 }) {
  const page = await browser.newPage({ viewport: VP }), errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
  await page.goto(url); await page.waitForTimeout(1200);
  await page.evaluate(withCost => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const prefs = { device_consumption: [{ stat_consumption: "sensor.plug1_energy", name: "Plug 1" }], energy_sources: [{ type: "grid", flow_from: [{ stat_energy_from: "ext:elec_use", stat_cost: withCost ? "ext:elec_cost" : null }], flow_to: [] }, { type: "gas", stat_energy_from: "ext:gas_use", stat_cost: withCost ? "ext:gas_cost" : null }] };
    const real = window.send; window.send = (m, cb) => {
      if (m.type === "energy/get_prefs") return cb(prefs, {});
      if (m.type === "recorder/get_statistics_metadata") return cb([{ statistic_id: m.statistic_ids[0], unit_of_measurement: "m³" }], {});
      if (m.type === "recorder/statistics_during_period") {
        const o = {}, t0 = +new Date(m.start_time), n = m.period === "hour" ? Math.round((+new Date(m.end_time) - t0) / 36e5) : 1;
        m.statistic_ids.forEach(id => { o[id] = []; for (let i = 0; i < (m.period === "hour" ? n : 1); i++) { const h = new Date(t0 + i * 36e5).getHours(), mult = m.period === "hour" ? 1 : 24;
          const v = { "ext:elec_use": 1, "ext:elec_cost": h >= 21 ? 0 : 0.4, "ext:gas_use": 0.5, "ext:gas_cost": 0.1, "sensor.plug1_energy": 0.2 }[id]; o[id].push({ start: m.period === "hour" ? t0 + i * 36e5 : t0, change: v * mult }); } });
        return cb(o, {});
      }
      return real(m, cb);
    };
    en.r = "day"; en.o = -2; en.prefs = null; en.data = null; en.gasUnit = ""; location.hash = "#energy";
  }, withCost);
  await page.waitForTimeout(1500);
  const txt = await page.evaluate(() => document.getElementById("energy").innerText);
  return { txt, errors, page };
}
{ const { txt, errors, page } = await run(true);
  ok("electricity = the real cost $8.40, with the daily charge shown as its own line $2.61: " + txt.replace(/\s+/g, " ").slice(0, 600), /\$8\.40/.test(txt) && /Daily charge/i.test(txt) && /\$2\.61/.test(txt) && !/\$11\.0/.test(txt));
  ok("usage = total - daily charge over the paid kWh (5.79 / 21 kWh = 27.6c)", /27\.6c/i.test(txt) && /\$5\.79/.test(txt));
  ok("gas = usage $2.40 + daily charge 1 day x 1.832 = $4.23", /\$4\.23/.test(txt) && /\$2\.40/.test(txt) && /\$1\.83/.test(txt));
  ok("total $12.63 excl. GST, GST 15% = $1.89, incl. $14.52: " + txt.replace(/\s+/g," ").slice(0,300), /\$14\.52/.test(txt) && /\$1\.89/.test(txt) && /\$12\.63/.test(txt) && /incl\. GST/i.test(txt) && /excl\. GST/i.test(txt));
  ok("gas usage with its own unit (m³)", /12(\.0)? m³/i.test(txt));
  ok("individual devices are gone from the page", !/Plug 1/.test(txt) && !/Consumption overview/i.test(txt) && !/biggest spender/i.test(txt));
  ok("the grid statistic and its hours are named", /ext:elec_use/.test(txt) && /24 hours of data/i.test(txt));
  ok("with real prices, the vs-previous comparison is in kWh (not real vs estimated prices)", /kWh now vs/i.test(txt) && !/usage only/i.test(txt));
  ok("the month tab is called BILL when billing cycles are set", /\bBILL\b/.test(txt) && !/\bMONTH\b/.test(txt));
  const cy = await page.evaluate(() => { const at = new Date(2026, 9, 26), f = (k, o) => { const c = enCyc(k, o, at); return c ? ymd(c.s) + ">" + ymd(c.e) : null; }; return [f("electricity", 0), f("electricity", -1), f("electricity", -2), f("electricity", 1), f("gas", 0), f("gas", -1), f("gas", -3)]; });
  ok("billing cycles (starts override, then the day of the month): " + JSON.stringify(cy), JSON.stringify(cy) === JSON.stringify(["2026-10-14>2026-11-14", "2026-09-12>2026-10-14", "2026-08-14>2026-09-12", "2026-11-14>2026-12-14", "2026-10-10>2026-11-10", "2026-09-10>2026-10-10", "2026-07-10>2026-08-10"]));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
  ok("no page errors", errors.length === 0); await page.close(); }
{ const { txt, errors, page } = await run(false);
  ok("no cost statistics: falls back to the tariff (21 x 0.364 = $7.64 + 1 day x 2.611 = $10.25)", /\$10\.25/.test(txt));
  ok("no cost statistics: gas still shows its usage", /12(\.0)? m³/i.test(txt));
  ok("no page errors (fallback)", errors.length === 0); await page.close(); }
{ // redesigned layout: three cards in one row on a tablet, one column with an Electricity / Gas switch on a phone
  for (const [name, vp] of [["tablet", { width: 1180, height: 820 }], ["phone", { width: 390, height: 844 }]]) {
    const { page, errors } = await run(true, vp);
    const m = await page.evaluate(() => { const v = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, shown: getComputedStyle(e).display !== "none" }; }; return { t: v('#energy [data-k="t"]'), e: v('#energy [data-k="e"]'), g: v('#energy [data-k="g"]'), sw: v(".ensw"), ins: v(".enins"), dots: !!document.querySelector(".endots"), sh: document.getElementById("energy").scrollHeight, ih: innerHeight }; });
    if (name === "tablet") { ok("tablet: Total, Electricity and Gas side by side", m.t && m.e && m.g && Math.abs(m.t.y - m.e.y) < 2 && Math.abs(m.e.y - m.g.y) < 2 && m.t.x < m.e.x && m.e.x < m.g.x); ok("tablet: the switch is hidden and insights sit below the cards", m.sw && !m.sw.shown && m.ins.y > m.t.y + m.t.h - 1); ok("tablet: fits without scrolling the page", m.sh <= m.ih + 2); }
    else { ok("phone: one column, no slide dots", m.t && m.e && m.e.y > m.t.y + m.t.h - 1 && !m.dots); ok("phone: switch shows Electricity, Gas card hidden until chosen", m.sw && m.sw.shown && m.e.shown && !m.g.shown);
      await page.click('[data-et="g"]'); await page.waitForTimeout(300);
      const g = await page.evaluate(() => ({ e: getComputedStyle(document.querySelector('#energy [data-k="e"]')).display, g: getComputedStyle(document.querySelector('#energy [data-k="g"]')).display }));
      ok("phone: the switch shows the Gas card instead", g.e === "none" && g.g !== "none"); }
    ok("no page errors (" + name + ")", errors.length === 0); await page.close();
  }
}
await browser.close(); server.close();
console.log(`energy prices: ${checks} checks`);
if (problems.length) { console.log("FAILED:\n - " + problems.join("\n - ")); process.exitCode = 1; } else console.log("ok");
