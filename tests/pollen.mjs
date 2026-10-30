// Pollen: the Weather page card, the strip chip beside the clock (name on a tablet, icon only on a phone, two chips on a wide screen), the Alerts row and its link.   Run:  node tests/pollen.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let extra = "";
const cfg = () => `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], weather: "weather.home", leakSensors: ["binary_sensor.leak"], notifTimers: [],
  pollen: { risk: "sensor.pol_risk", top: "sensor.pol_top", plants: "sensor.pol_plants", grass: "sensor.pol_grass"${extra} },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg()); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(w, h, o = {}) {
  extra = o.config || "";
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.routeWebSocket(/api\/websocket/, ws => {
    ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw);
      if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); });
  });
  await page.goto(base + "#weather"); await page.waitForTimeout(900);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page, set: (id, state, attr) => page.evaluate(([i, s, a]) => { states[i] = { entity_id: i, state: s, attributes: a || {} }; drawWeather(); drawNotif(); }, [id, state, attr]) };
}
const strip = p => p.evaluate(() => { const n = document.getElementById("nacc"), v = e => { const c = getComputedStyle(e); return c.display !== "none" && e.getBoundingClientRect().width > 0; };
  return { k: n.dataset.k || "", more: n.dataset.more || "", more2: n.dataset.more2 === undefined ? null : n.dataset.more2, chips: [...n.querySelectorAll(".nai")].map(e => [e.dataset.k, v(e), v(e.querySelector(".nal")), e.querySelector(".nal").textContent]), badge: getComputedStyle(n, "::after").display !== "none" && getComputedStyle(n, "::after").content }; });
// ---- tablet
let t = await open(1280, 800);
eq("no card while the sensors are missing", await t.page.evaluate(() => !document.getElementById("wxpol")), true);
await t.set("sensor.pol_risk", "Moderate"); await t.set("sensor.pol_top", "Grass"); await t.set("sensor.pol_plants", "Grasses"); await t.set("sensor.pol_grass", "2");
eq("card: level, bar, facts, advice", await t.page.evaluate(() => [document.querySelector("#wxpol .polh").textContent, document.querySelectorAll("#wxpol .polb i[style]").length, document.querySelector("#wxpol .polk .on").textContent, [...document.querySelectorAll("#wxpol .ws")].map(e => e.textContent), /Hay fever/.test(document.querySelector("#wxpol .polad").textContent), document.querySelector("#wxpol .sm").textContent]),
  ["Moderate", 3, "Moderate", ["Top typeGrass", "In seasonGrasses", "GrassLow · 2 of 5"], true, "Main type today: Grass"]);
eq("card sits between the Now card and the forecast tabs", await t.page.evaluate(() => { const c = document.getElementById("wxpol"); return [c.previousElementSibling.classList.contains("wnow"), c.nextElementSibling.classList.contains("fcp")]; }), [true, true]);
let s = await strip(t.page);
eq("tablet strip: one pollen chip with the level", [s.k, s.more, s.chips], ["pollen", "", [["pollen", true, true, "Pollen · Moderate"]]]);
eq("alert row in the Alerts list links to the Pollen card", await t.page.evaluate(() => { drawNotif(); document.body.classList.add("np-open"); drawNotif(); const a = document.querySelector('#npc .alert[data-go="#weather/pollen"]'); return a ? [a.textContent.includes("Pollen · Moderate"), document.querySelector(".nptabs .chip").textContent] : null; }), [true, "ALERTS · 1"]);
await t.page.evaluate(() => { location.hash = "#home"; }); await t.page.waitForTimeout(300);
await t.page.evaluate(() => { document.body.classList.add("np-open"); drawNotif(); document.querySelector('#npc .alert[data-go="#weather/pollen"]').click(); }); await t.page.waitForTimeout(1900);
eq("tapping the alert opens Weather at the Pollen card", await t.page.evaluate(() => [location.hash, document.body.classList.contains("np-open"), document.getElementById("wxpol").getBoundingClientRect().top < 300]), ["#weather/pollen", false, true]);
// threshold: Low stays quiet, High is orange, alertFrom moves it
await t.set("sensor.pol_risk", "Low");
eq("Low: card yes, strip and alert no", await t.page.evaluate(() => [!!document.getElementById("wxpol"), polOn(), polAlert()]), [true, false, ""]);
await t.set("sensor.pol_risk", "4");
eq("a number works (4 = High), orange", await t.page.evaluate(() => [polNow().name, polNow().col, polOn()]), ["High", "#ff9f43", true]);
await t.set("sensor.pol_risk", "unavailable");
eq("unavailable: nothing shows", await t.page.evaluate(() => [!document.getElementById("wxpol"), polOn()]), [true, false]);
// several conditions: two chips on a wide screen, +n for the rest
await t.set("sensor.pol_risk", "Very high"); await t.set("binary_sensor.leak", "on"); await t.page.evaluate(() => { states["sensor.weather_warn"] = { entity_id: "sensor.weather_warn", state: "1", attributes: {} }; drawNotif(); });
s = await strip(t.page);
eq("wide: leak first, then pollen as the second chip, both named", [s.k, s.chips.map(c => [c[0], c[1], c[2]]), s.more, s.more2], ["leak", [["leak", true, true], ["pollen", true, true]], "+1", ""]);
await t.ctx.close();
// ---- a 1024 px tablet: the first chip only, the rest as +n
t = await open(1024, 768); await t.set("sensor.pol_risk", "Very high"); await t.set("binary_sensor.leak", "on");
s = await strip(t.page);
eq("1024 px: one named chip and +1", [s.chips.map(c => [c[0], c[1], c[2]]), s.more, s.badge], [[["leak", true, true], ["pollen", false, false]], "+1", '"+1"']);
await t.ctx.close();
// ---- phone: icon only
t = await open(390, 844); await t.set("sensor.pol_risk", "High");
s = await strip(t.page);
eq("phone: the icon, no name", [s.k, s.chips.map(c => [c[0], c[1], c[2]])], ["pollen", [["pollen", true, false]]]);
await t.ctx.close();
// ---- alertFrom
t = await open(1280, 800, { config: ', alertFrom: "high"' }); await t.set("sensor.pol_risk", "Moderate");
eq("alertFrom high: Moderate stays off the strip", await t.page.evaluate(() => [polOn(), !!document.getElementById("wxpol")]), [false, true]);
await t.set("sensor.pol_risk", "High");
eq("alertFrom high: High shows", await t.page.evaluate(() => polOn()), true);
await t.ctx.close();
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`pollen ok: ${checks} checks`);
