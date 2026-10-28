// Admin page: only for admins (nav link and #admin hidden for everyone else), holds Access + Setup check, and the Theme page no longer does.   Run:  node tests/admin.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], weather: "weather.home", notifTimers: [], house: [{ id: "living", name: "Living", lights: ["light.gone"] }],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(w, h, hash) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }); const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : m.type === "auth/current_user" ? { id: "u1", name: "Sam", is_admin: false } : null })); }); });
  await page.goto(base + hash); await page.waitForTimeout(900);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page };
}
const linkShown = p => p.evaluate(() => [...document.querySelectorAll('nav a[href="#admin"], #mshe a[href="#admin"]')].map(a => getComputedStyle(a).display !== "none"));
// admin (a dashboard on a long-lived token counts as admin)
let t = await open(1280, 800, "#admin");
eq("admin sees the page with the Access section", await t.page.evaluate(() => [location.hash, document.getElementById("admin").classList.contains("on"), !!document.querySelector("#admin .acc-h")]), ["#admin", true, true]);
await t.page.evaluate(() => { states["light.x"] = { entity_id: "light.x", state: "on", attributes: {} }; drawAdmin(); });
eq("Setup check and About cards are on the Admin page", await t.page.evaluate(() => [!!document.querySelector("#admin .sck-s"), !!document.querySelector("#admin .adm-f")]), [true, true]);
eq("nav links shown for an admin", (await linkShown(t.page)).every(Boolean) && (await linkShown(t.page)).length >= 1, true);
await t.page.evaluate(() => { location.hash = "#theme"; }); await t.page.waitForTimeout(500);
eq("Theme page no longer holds Access or Setup check", await t.page.evaluate(() => [!!document.querySelector("#theme .sck-s"), !!document.querySelector("#theme .acc-h")]), [false, false]);
// not an admin
await t.page.evaluate(() => { CONFIG.token = ""; ME = { id: "u1", name: "Sam", pid: "", admin: false }; try { localStorage.setItem("dashAdm", "0"); } catch (_) {} ruRefresh(); location.hash = "#admin"; }); await t.page.waitForTimeout(600);
eq("a non-admin is sent home from #admin", await t.page.evaluate(() => location.hash), "#home");
eq("nav links hidden for a non-admin", (await linkShown(t.page)).some(Boolean), false);
await t.ctx.close();
// phone: the link is in the More sheet for an admin
t = await open(390, 844, "#home");
eq("More sheet has the Admin link for an admin", (await linkShown(t.page)).filter(Boolean).length >= 1, true);
await t.ctx.close();
eq("no JavaScript errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error("admin page FAILED:\n" + problems.join("\n")); process.exit(1); }
console.log(`admin page ok: ${checks} checks`);
