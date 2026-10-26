// Energy page: real electricity and gas prices from Home Assistant's Energy settings (statistics), gas card, totals, plugs priced at the real hourly rate, tariff as the fallback.
// Run:  node tests/energy-prices.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "living", name: "Living", main: true }], tariff: { symbol: "$", daily: 2.687, periods: [{ from: 0, to: 21, rate: 0.364, name: "Charged" }, { from: 21, to: 24, rate: 0, name: "Free" }] } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, v) => { checks++; if (!v) problems.push(what); };
async function run(withCost) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } }), errors = []; page.on("pageerror", e => errors.push(String(e)));
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
  ok("electricity total = real cost 8.40 + daily 2.687 = $11.09: " + txt.replace(/\s+/g, " ").slice(0, 400), /\$11\.09/.test(txt));
  ok("gas cost $2.40 shown", /\$2\.40/.test(txt));
  ok("total energy cost $13.49 shown", /\$13\.49/.test(txt));
  ok("gas usage with its own unit (m³): " + txt.replace(/\s+/g, " ").slice(0, 700), /12(\.0)? m³/i.test(txt));
  ok("actual rate shown (40.0c for the charged hours, 0.0c free)", /40\.0c/i.test(txt) && /0\.0c/i.test(txt));
  ok("plug costed at the real hourly rate ($1.68, not the 36.4c tariff $1.53)", /\$1\.68/.test(txt) && !/\$1\.53/.test(txt));
  ok("with real prices, the vs-previous comparison is in kWh (not real vs estimated prices)", /kWh now vs/i.test(txt) && !/usage only/i.test(txt));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
  ok("no page errors", errors.length === 0); await page.close(); }
{ const { txt, errors, page } = await run(false);
  ok("no cost statistics: falls back to the tariff (24 x 0.364 for 21 h = $7.64 + 2.69 = $10.33)", /\$10\.33/.test(txt));
  ok("no cost statistics: gas still shows its usage", /12(\.0)? m³/i.test(txt));
  ok("no page errors (fallback)", errors.length === 0); await page.close(); }
await browser.close(); server.close();
console.log(`energy prices: ${checks} checks`);
if (problems.length) { console.log("FAILED:\n - " + problems.join("\n - ")); process.exitCode = 1; } else console.log("ok");
