// Links open the right phone tab: #weather/pollen, #weather/wind|rain|uv|temp, #rooms/<id>/doors, #hazards/earthquakes|volcanoes, and the Alerts rows that use them.   Run:  node tests/deep-links.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", weather: "weather.home", notifTimers: [], volcanoes: ["sensor.volcano_x"],
  rooms: [{ id: "living", name: "Living", main: true }], house: [{ id: "living", name: "Living", lights: ["light.a"], doors: ["binary_sensor.d"], sections: [{ name: "Living area", items: ["light.a"] }, { name: "Fans", items: ["fan.a"] }] }],
  pollen: { risk: "sensor.pol_risk" }, view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }), page = await ctx.newPage();
page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
await page.route("**/api/calendars**", r => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1200);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const S = (i, s, a) => { states[i] = { entity_id: i, state: s, attributes: a || {} }; };
  S("weather.home", "sunny", { temperature: 20, forecast: [] }); S("sensor.pol_risk", "Moderate"); S("sensor.volcano_x", "2", { friendly_name: "Volcano X", activity: "Moderate unrest" });
  S("light.a", "off", { friendly_name: "A" }); S("binary_sensor.d", "off", { friendly_name: "Door", device_class: "door" }); });
const go = async h => { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(1500); };
const tab = sel => page.evaluate(sel => { const on = document.querySelector(sel + " .secnav .chip.on"); return on ? on.textContent.trim() : null; }, sel);
const vis = q => page.evaluate(q => { const e = document.querySelector(q); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0; }, q);
await go("#weather"); const first = await tab("#weather");
await go("#weather/pollen"); eq("#weather/pollen opens the POLLEN tab", await tab("#weather"), "POLLEN"); eq("pollen card is visible", await vis("#wxpol"), true);
await go("#home"); await go("#weather/wind"); eq("#weather/wind opens the forecast tab", await vis("#wx .fcp"), true); eq("wind: not the pollen tab", await vis("#wxpol"), false);
await go("#home"); await go("#weather/pollen"); eq("pollen again after another link", await tab("#weather"), "POLLEN");
await go("#home"); await go("#weather/week"); eq("#weather/week opens the Now tab on its Next 7 days card", await page.evaluate(() => [document.querySelector("#weather .secnav .on").textContent, document.querySelector("#wx .wcols").scrollLeft > 100, wcI]), ["NOW", true, 1]);
await go("#home"); await go("#weather/now"); eq("#weather/now opens the Now card", await page.evaluate(() => [document.querySelector("#weather .secnav .on").textContent, document.querySelector("#wx .wcols").scrollLeft < 5, wcI]), ["NOW", true, 0]);
await go("#home"); await page.evaluate(() => { document.querySelector("#fcp").click(); }); await page.waitForTimeout(1200); eq("the Home Forecast card links to Next 7 days", await page.evaluate(() => location.hash), "#weather/week");
await page.evaluate(() => { location.hash = "#home"; }); await page.waitForTimeout(800); await page.evaluate(() => { document.querySelector(".hs").click(); }); await page.waitForTimeout(800); eq("the Home greeting links to the Now card", await page.evaluate(() => location.hash), "#weather/now");
await go("#home"); await go("#weather"); eq("plain #weather keeps the last tab (no surprise jump)", await tab("#weather") !== null, true);
await go("#rooms"); await go("#rooms/living/doors");
eq("#rooms/<id>/doors opens the doors tab", await vis('#rv [data-sec="doors"]'), true);
await go("#hazards/volcanoes"); eq("#hazards/volcanoes opens the Volcanoes tab", await page.evaluate(() => HZ.tab), "volc");
await go("#hazards/earthquakes"); eq("#hazards/earthquakes opens the Earthquakes tab", await page.evaluate(() => HZ.tab), "quake");
await go("#hazards"); eq("#hazards opens the map", await page.evaluate(() => HZ.tab), "map");
eq("volcano alert row links to the Volcanoes tab", await page.evaluate(() => volcHtml()[0].match(/data-go="([^"]*)"/)[1]), "#hazards/volcanoes");
eq("pollen alert row links to the Pollen tab", await page.evaluate(() => polAlert().match(/data-go="([^"]*)"/)[1]), "#weather/pollen");
await page.evaluate(() => { states["geo_location.q"] = { entity_id: "geo_location.q", state: "20", attributes: { source: "geonetnz_quakes", magnitude: 5.5, locality: "X", time: new Date().toISOString(), quality: "best", latitude: -41, longitude: 174 } }; });
eq("earthquake alert row links to the Earthquakes tab", await page.evaluate(() => ((quakeHtml() || "").match(/data-go="([^"]*)"/) || [])[1]), "#hazards/earthquakes");
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`deep links: ${checks} checks passed`);
