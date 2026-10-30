// Weather alerts: the Alerts card (wind gauge, rain line) and the header strip chips.   Run:  node tests/weather-alerts.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  derived: { soil: { lawn: { moisture: ["sensor.lawn_m"], temperature: [] } } },
  bins: { due: [["input_boolean.recycle", "Recycling", "recycle"]], out: "input_boolean.bins_out" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
const open = async () => { const p = await browser.newPage({ viewport: { width: 1100, height: 900 } }); p.on("pageerror", e => errors.push(String(e))); await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800); return p; };
const page = await open();
const out = await page.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const wait = ms => new Promise(r => setTimeout(r, ms)), r = {};
  const st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  const hr = (h, p, w) => ({ datetime: new Date(Date.now() + h * 3600000).toISOString(), precipitation: p, wind_speed: w });
  const cards = () => [...document.querySelectorAll("#npc .wxa-s")].map(x => x.dataset.wxa + " | " + x.textContent.replace(/\s+/g, " ").trim());
  const strip = () => [...document.querySelectorAll("#nacc .nai")].map(x => x.dataset.k + ":" + x.textContent.trim());
  st(W, "sunny", { wind_speed: 10, wind_speed_unit: "km/h" }); fcH = [hr(1, 0, 12), hr(2, 0, 14)];
  document.body.classList.add("np-open"); npTab = "alerts"; drawNotif(); await wait(250);
  r.quiet = [cards(), strip(), document.querySelector('#np .nptabs .chip').textContent];
  st(W, "windy", { wind_speed: 64, wind_gust_speed: 80, wind_speed_unit: "km/h" }); fcH = [hr(1, 0, 70), hr(3, 1.2, 40), hr(4, 1.2, 40)];
  drawNotif(); await wait(250);
  r.cards = cards(); r.strip = strip(); r.tab = document.querySelector('#np .nptabs .chip').textContent; r.head = [...document.querySelectorAll("#npc .np2")].map(x => x.textContent.trim());
  fcH = [hr(1, 6, 10)]; st(W, "rainy", { wind_speed: 10 }); drawNotif(); await wait(250);
  r.heavy = [cards(), strip()];
  st(W, "windy", { wind_speed: 35 }); fcH = []; drawNotif(); await wait(250); r.mod = [cards(), strip()];
  st(W, "windy", { wind_speed: 40, wind_speed_unit: "mph" }); drawNotif(); await wait(250); r.mph = cards();
  st(W, "windy", { wind_speed: 64 }); CONFIG.weatherAlerts = { wind: false }; fcH = [hr(1, 3, 5)]; drawNotif(); await wait(250); r.windOff = cards().map(x => x.split(" | ")[0]);
  CONFIG.weatherAlerts = false; drawNotif(); await wait(250); r.off = [cards(), strip()];
  CONFIG.weatherAlerts = { stripWind: 1 }; fcH = []; st(W, "windy", { wind_speed: 35 }); drawNotif(); await wait(250); r.stripFrom = strip();
  CONFIG.weatherAlerts = undefined; drawNotif(); await wait(250); document.querySelector('#npc [data-wxa="wind"]').click(); await wait(200); r.tap = [location.hash, document.body.classList.contains("np-open")];
  r.order = NSK.map(k => k[0]).slice(0, 7);
  return r;
});
eq("nothing shows in light wind and dry weather", out.quiet, [[], [], "ALERTS"]);
eq("Strong wind now (64) with the forecast peak, and light rain from the forecast, as one Weather card counted once", out.cards.map(x => x.replace(/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) )?\d+(:\d\d)? ?[AP]M/g, "T")), ["wind | WIND NOW · STRONG64km/h306289Gusts 80 km/h · Up to 70 km/h around T", "rain | Light rain from TUp to 1.2 mm/h"]);
eq("the header strip shows Strong wind and Light rain (stripWind and stripRain default to 1)", out.strip, ["wind:Strong wind", "rain:Light rain soon"]);
eq("the Alerts tab counts the weather card once", [out.tab, out.head], ["ALERTS · 1", ["Weather"]]);
eq("heavy rain shows a strip chip", out.heavy[1], ["rain:Heavy rain soon"]);
eq("moderate wind is on the card and, by default, in the strip", [out.mod[0].length, out.mod[1]], [1, ["wind:Moderate wind"]]);
eq("mph is converted (40 mph = 64 km/h)", out.mph[0].slice(0, 30), "wind | WIND NOW · STRONG64km/h".slice(0, 30));
eq("wind: false leaves only the rain", out.windOff, ["rain"]);
eq("weatherAlerts: false hides everything", out.off, [[], []]);
eq("stripWind: 1 keeps moderate wind in the strip", out.stripFrom, ["wind:Moderate wind"]);
eq("tapping the card opens the wind forecast chart", out.tap, ["#weather/wind", false]);
eq("strip priority: leak, weather warning, garage, then wind, rain, then a door", out.order, ["leak", "warn", "garage", "wind", "rain", "door", "water"]);
eq("no page errors", errors, []);
await page.close(); await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`weather alerts ok: ${checks} checks`);

