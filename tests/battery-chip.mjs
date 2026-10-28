// Low-battery chip beside the clock: shows under derived.batteryAlertBelow (default 20), names the device count, hides above it.   Run:  node tests/battery-chip.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], notifTimers: [] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#weather`); await page.waitForTimeout(1500);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
const set = (id, v) => page.evaluate(([i, s]) => { states[i] = { entity_id: i, state: s, attributes: { friendly_name: i } }; drawNotif(); }, [id, v]);
const chip = () => page.evaluate(() => { const c = document.querySelector('#nacc .nai[data-k=battery]'); return c ? c.textContent.trim() : null; });
await set("sensor.door_battery_plus", "60"); eq("no chip above the threshold", await chip(), null);
await set("sensor.door_battery_plus", "22"); eq("22% is in the list but not under 20: no chip", await chip(), null);
await set("sensor.door_battery_plus", "15"); eq("chip at 15%", /Low battery/.test(await chip() || ""), true);
await set("sensor.lock_battery_plus", "9"); eq("two devices: counted", /2 low batteries/.test(await chip() || ""), true);
await set("sensor.door_battery_plus", "80"); await set("sensor.lock_battery_plus", "80"); eq("clears when charged", await chip(), null);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`battery-chip: ${checks} checks passed`);
