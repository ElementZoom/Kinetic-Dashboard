// Volcano alerts (Weather + Notifications) only from hazards.volcanoMinLevel (default 2, Moderate) up.   Run:  node tests/volcano-level.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], volcanoes: ["sensor.volcano_ruapehu"], notifTimers: [] };`;
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
const lvl = n => page.evaluate(n => { states["sensor.volcano_ruapehu"] = { entity_id: "sensor.volcano_ruapehu", state: String(n), attributes: { friendly_name: "Volcano Ruapehu", activity: "x", feed_last_update: new Date().toISOString() } }; return [volcHtml().length, volcHtml().length, notif(false).n]; }, n);
let r = await lvl(1); eq("level 1 (minor): no alert", r[0], 0); eq("level 1: nothing in the notifications list", r[1], 0);
const idle = r[2];
r = await lvl(2); eq("level 2 (moderate): alert shows", r[0], 1); eq("level 2: shown in notifications", r[1], 1); eq("level 2: bell count goes up", r[2], idle + 1);
r = await lvl(4); eq("level 4 still shows", r[0], 1);
r = await lvl(0); eq("level 0: no alert", r[0], 0); eq("level 0: bell count back", r[2], idle);
await page.evaluate(() => { CONFIG.hazards = { volcanoMinLevel: 1 }; }); r = await lvl(1); eq("volcanoMinLevel 1 shows minor unrest", r[0], 1);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`volcano-level: ${checks} checks passed`);
