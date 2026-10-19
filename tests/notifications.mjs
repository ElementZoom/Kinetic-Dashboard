// Notifications pop-up: the garage door is not listed under Doors, and Low batteries have their own tab.   Run:  node tests/notifications.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], entities: { doorsGroup: "group.doors" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  st("group.doors", "on", { entity_id: ["binary_sensor.side_door", "binary_sensor.garage_door"], friendly_name: "Doors" });
  st("binary_sensor.side_door", "on", { friendly_name: "Side Sliding Door" }); st("binary_sensor.garage_door", "on", { friendly_name: "Garage Door" });
  st("sensor.a_battery_plus", "20", { friendly_name: "Soil Sensor One Battery+" }); st("sensor.b_battery_plus", "50", { friendly_name: "Rain Sensor Battery+" });
  document.body.classList.add("np-open"); drawNotif();
});
await page.waitForTimeout(300);
const txt = () => page.evaluate(() => document.querySelector("#np").innerText);
let t = await txt();
eq("doors card lists the side door only", [/1 open/i.test(t), /Side Sliding Door/.test(t), /Garage Door/.test(t)], [true, true, false]);
eq("low batteries are not on the Alerts tab", /Soil Sensor One/.test(t), false);
eq("three tabs with counts", await page.evaluate(() => [...document.querySelectorAll("#np .nptabs .chip")].map(c => c.textContent.replace(/\s+/g, " "))), ["ALERTS · 1", "ACTIVE", "BATTERIES · 2"]);
await page.click('#np [data-npt="batteries"]'); await page.waitForTimeout(200);
t = await txt();
eq("Batteries tab lists them, lowest first", [/Soil Sensor One/.test(t), /20%/.test(t), t.indexOf("Soil Sensor") < t.indexOf("Rain Sensor"), /Side Sliding/.test(t)], [true, true, true, false]);
eq("the tab is the selected one", await page.evaluate(() => document.querySelector('#np [data-npt="batteries"]').classList.contains("on")), true);
eq("tabs with bigger counts scroll and show the animated arrow on a phone", await page.evaluate(() => { const c = document.querySelector("#np .nptabs"), k = [...c.children]; k[0].textContent = "ALERTS · 12"; k[1].textContent = "ACTIVE · 11"; k[2].textContent = "BATTERIES · 14"; hsAll(); const w = c.closest(".hsw"); return [!!w, c.scrollWidth > c.clientWidth, !!w && w.classList.contains("more")]; }), [true, true, true]);
await page.evaluate(() => { states["sensor.a_battery_plus"].state = "90"; states["sensor.b_battery_plus"].state = "90"; drawNotif(); });
await page.waitForTimeout(200);
eq("no low batteries: friendly message", /All batteries are fine/i.test(await txt()), true);
if (process.env.SHOT) { await page.click('#np [data-npt="alerts"]'); await page.screenshot({ path: process.env.SHOT + "_np.png" }); }
await page.close(); await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`notifications ok: ${checks} checks`);
