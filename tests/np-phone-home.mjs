// Phone Home: no Now playing card, the floating player bar is shown instead and opens Media.   Run:  node tests/np-phone-home.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], notifTimers: [], leakSensors: ["binary_sensor.leak"], media: ["media_player.a"], weather: "weather.home" };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#weather`); await page.waitForTimeout(1500);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
await page.evaluate(() => { states["media_player.a"] = { entity_id: "media_player.a", state: "playing", attributes: { friendly_name: "Living", media_title: "Song", media_artist: "Artist", media_duration: 200, media_position: 10, media_position_updated_at: new Date().toISOString() } }; location.hash = "#home"; npRender(); }); await page.waitForTimeout(800);
eq("no Now playing card on Home", await page.evaluate(() => getComputedStyle(document.querySelector("#npw")).display), "none");
eq("the floating player bar is shown on Home", await page.evaluate(() => { const m = document.querySelector("#npmini"), r = m.getBoundingClientRect(); return [getComputedStyle(m).display !== "none", r.height > 30, r.bottom <= document.querySelector("#btab").getBoundingClientRect().top + 1]; }), [true, true, true]);
await page.click("#npmini .npart"); await page.waitForTimeout(500);
eq("tapping the player bar art opens Media", await page.evaluate(() => location.hash), "#media");
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`np-phone-home: ${checks} checks passed`);
