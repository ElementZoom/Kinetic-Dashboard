// Lyrics: a lookup that hits a service hiccup is retried instead of being reported as "no lyrics".   Run:  node tests/lyrics-retry.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "climate.heat_pump", name: "Heat pump", main: true }], notifTimers: [] };`;
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
let mode = "down", hits = 0;
await page.route("https://lrclib.net/**", route => { hits++; const u = route.request().url();
  if (mode === "down") return route.fulfill({ status: 503, body: "busy" });
  if (mode === "missing") return route.fulfill({ status: u.includes("/get?") ? 404 : 200, contentType: "application/json", body: u.includes("/get?") ? "{}" : "[]" });
  if (mode === "flaky") return u.includes("/get?") ? route.fulfill({ status: 503, body: "busy" }) : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ plainLyrics: "la la" }]) });
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ syncedLyrics: "[00:01.00] hi" }) }); });
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1200);
const run = () => page.evaluate(async () => { const d = []; try { const r = await lyrFetch({ title: "Song", artist: "Artist", album: "", dur: 200 }, d); return { r: r && (r.plainLyrics || r.syncedLyrics) || null, soft: !!d.soft }; } catch (e) { return { err: String(e.message), soft: !!d.soft }; } });
mode = "down"; eq("service down: an error, not 'no lyrics'", (await run()).err, "lyrics service busy");
mode = "missing"; let r = await run(); eq("a clean 'nothing found' still comes back empty", [r.r, r.err || null], [null, null]);
mode = "flaky"; r = await run(); eq("get fails but search finds it: lyrics found", r.r, "la la");
mode = "ok"; r = await run(); eq("working: synced lyrics", r.r, "[00:01.00] hi");
// "none" is looked up again before it is shown
mode = "missing"; hits = 0;
const res = await page.evaluate(async () => { const key = "A|S|200", seen = []; LY.key = key; LY.busy = key; LY.open = true; const orig = lyrUpdate; let n = 0; lyrUpdate = () => { n++; LY.busy = key; lyrLoad({ title: "S", artist: "A", album: "", dur: 200 }, key); };
  lyrLoad({ title: "S", artist: "A", album: "", dur: 200 }, key); await new Promise(r => setTimeout(r, 9000)); return { updates: n, st: (LY.cache[key] || {}).st, tries: LY.tries[key] }; });
eq("a missing song is looked up three times before 'No lyrics found'", [res.updates, res.st, res.tries], [2, "none", 2]);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`lyrics-retry: ${checks} checks passed`);
