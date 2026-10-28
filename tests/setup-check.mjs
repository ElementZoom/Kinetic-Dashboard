// Setup check (Theme page): finds every entity id in config.js that Home Assistant lacks, with where it sits in config.js.   Run:  node tests/setup-check.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], weather: "weather.home", leakSensors: ["binary_sensor.leak", "binary_sensor.leak_typo"], notifTimers: [],
  house: [{ id: "living", name: "Living", lights: ["light.ok", "light.gone"], doors: ["binary_sensor.door_off"] }], playback: { "camera.cam_missing": {} }, relevance: { weather: "^sensor\\\\.nothing_here" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" }));
  ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
await page.goto(base + "#admin"); await page.waitForTimeout(900);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
const sec = () => page.evaluate(() => !!document.querySelector("#admin .sck-s"));
eq("hidden until Home Assistant has sent its states", await sec(), false);
await page.evaluate(() => { const S = (i, s) => { states[i] = { entity_id: i, state: s, attributes: {} }; }; ["weather.home", "binary_sensor.leak", "light.ok", "camera.d", "camera.g"].forEach(i => S(i, "on")); S("binary_sensor.door_off", "unavailable"); drawAdmin(); });
const r = await page.evaluate(() => { const s = sckScan(); return { total: s.total, miss: s.missing.map(m => m[0]), where: Object.fromEntries(s.missing.map(m => [m[0], m[1][0].replace(/^\./, "")])), un: s.unavailable.map(m => m[0]) }; });
eq("missing ids found, sorted", r.miss, ["binary_sensor.leak_typo", "camera.cam_missing", "light.gone"]);
eq("where each one sits in config.js", r.where, { "binary_sensor.leak_typo": "leakSensors[1]", "camera.cam_missing": "playback.camera.cam_missing", "light.gone": "house[0].lights[1]" });
eq("unavailable listed separately", r.un, ["binary_sensor.door_off"]);
eq("the relevance regex is not read as an entity", r.miss.some(x => /nothing_here/.test(x)), false);
eq("section shows the count and the list", await page.evaluate(() => [document.querySelector("#admin .sck-s b").textContent.replace(/\d+ of \d+/, "N of M"), document.querySelectorAll("#admin .sck-s + .sck-l .sck-r").length, !!document.querySelector("#admin .sck-s.bad"), !!document.querySelector("#admin .sck-u")]), ["N of M entities in config.js are missing in Home Assistant", 3, true, true]);
await page.evaluate(() => { ["binary_sensor.leak_typo", "camera.cam_missing", "light.gone"].forEach(i => { states[i] = { entity_id: i, state: "off", attributes: {} }; }); drawAdmin(); });
eq("all found: green summary, no list", await page.evaluate(() => [!!document.querySelector("#admin .sck-s.ok"), document.querySelectorAll("#admin .sck-s + .sck-l").length > 0]), [true, false]);
eq("no JavaScript errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error("setup check FAILED:\n" + problems.join("\n")); process.exit(1); }
console.log(`setup check ok: ${checks} checks`);
