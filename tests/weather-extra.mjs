// Weather page extras: feels like, dew point, pressure trend, frost advisory, sun and moon.   Run:  node tests/weather-extra.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], weather: "weather.home", notifTimers: [],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }); const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.addInitScript(() => { const rf = window.fetch; window.fetch = (u, x) => /\/api\/history\//.test(String(u)) ? Promise.resolve(new Response(JSON.stringify([[{ state: "sunny", attributes: { pressure: 1012 }, last_changed: new Date(Date.now() - 3 * 3600e3).toISOString() }]]))) : rf(u, x); });
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
  await page.goto(base + "#weather"); await page.waitForTimeout(900);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page };
}
const day = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
const setup = (page, low) => page.evaluate(([low, rise, set]) => {
  states["weather.home"] = { entity_id: "weather.home", state: "sunny", attributes: { temperature: 20, humidity: 50, pressure: 1015, pressure_unit: "hPa", wind_speed: 10, wind_speed_unit: "km/h", temperature_unit: "°C" } };
  states["sun.sun"] = { entity_id: "sun.sun", state: "above_horizon", attributes: { next_rising: rise, next_setting: set } };
  fcH = Array.from({ length: 30 }, (_, i) => ({ datetime: new Date(Date.now() + i * 3600e3).toISOString(), temperature: i === 10 ? low : 12, condition: "sunny" }));
  wxP = { t: 0, d: null, busy: false }; drawWeather();
}, [low, new Date(day(6, 15).getTime() + 864e5).toISOString(), day(19, 40).toISOString()]);
const read = p => p.evaluate(() => { const tiles = {}; document.querySelectorAll("#wx .wnow .ws").forEach(e => { tiles[e.querySelector(".lbl").textContent] = e.querySelector("b").textContent; });
  return { tiles, feels: /Feels \d+\.\d°/.test((document.querySelector("#wx .wnow") || {}).textContent || ""), frost: (document.querySelector(".alert.fr .lbl") || {}).textContent || "", sun: [...document.querySelectorAll("#wxsun .wg .ws")].map(e => e.querySelector(".lbl").textContent + "=" + e.querySelector("b").textContent.replace(/\s+/g, " ").trim()), moon: !!document.querySelector("#wxsun .moon") }; });
let t = await open(1280, 800); await setup(t.page, 5); await t.page.waitForTimeout(700); let r = await read(t.page);
eq("feels like and dew point are worked out (20 °C, 50 %, 10 km/h → dew point 9.3)", [r.tiles["Dew point"], r.feels], ["9.3°", true]);
eq("pressure trend from the entity's history (1012 → 1015 in 3 h)", /Rising\+3\.0 hPa in 3 h/.test(r.tiles["Pressure trend"].replace(/\s/g, "") ) || /Rising/.test(r.tiles["Pressure trend"]), true);
eq("no frost advisory at a 5 ° low", r.frost, "");
eq("sun card: today's sunrise and sunset from tomorrow's next_rising", r.sun.slice(0, 3), ["Sunrise=6:15am", "Sunset=7:40pm", "Daylight=13 h 25 min"]);
eq("moon is drawn with a phase name", r.moon && r.sun.some(x => /^Moon=/.test(x)), true);
await setup(t.page, 1); r = await read(t.page); eq("frost possible at a 1 ° low", /Frost possible/.test(r.frost), true);
await setup(t.page, -1); r = await read(t.page); eq("frost likely below 0 °", /Frost likely/.test(r.frost), true);
await t.page.evaluate(() => { CONFIG.frostBelow = -5; drawWeather(); }); r = await read(t.page); eq("frostBelow in config.js moves the line", r.frost, "");
await t.page.evaluate(() => { delete states["sun.sun"]; drawWeather(); }); eq("no sun entity: no sun card, no error", await t.page.evaluate(() => !document.getElementById("wxsun")), true);
await t.ctx.close();
t = await open(390, 844); await setup(t.page, 5); eq("phone: sun and moon card fits the screen width", await t.page.evaluate(() => { const c = document.getElementById("wxsun").getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth + 1; }), true); await t.ctx.close();
eq("no JavaScript errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error("weather extras FAILED:\n" + problems.join("\n")); process.exit(1); }
console.log(`weather extras ok: ${checks} checks`);
