// One motion language: bottom = slide up, side = slide in (tablet Notifications), middle = fade; sheets move by transform only.   Run:  node tests/motion.mjs
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
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }), page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
  await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1000);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page };
}
const cs = (page, sel, props) => page.evaluate(([s, p]) => { const c = getComputedStyle(document.querySelector(s)); return p.map(k => c[k]); }, [sel, props]);
const tx = (page, sel) => page.evaluate(s => { const m = new DOMMatrix(getComputedStyle(document.querySelector(s)).transform); return [Math.round(m.m41), Math.round(m.m42)]; }, sel);
// phone
let { ctx, page } = await open(390, 800);
let t = await tx(page, "#np"); eq("phone Notifications: parked above the screen", t[0] === 0 && t[1] < -700, true);
await page.evaluate(() => document.body.classList.add("np-open")); await page.waitForTimeout(600);
t = await tx(page, "#np"); eq("phone Notifications: slid down into place", t, [0, 0]);
eq("Notifications: no fade or scale", (await cs(page, "#np", ["opacity", "transitionProperty"])), ["1", "transform"]);
await page.evaluate(() => document.body.classList.remove("np-open"));
t = await tx(page, "#mshe"); eq("More menu: parked below, grid kept (animatable)", [t[1] > 100, (await cs(page, "#mshe", ["display"]))[0]], [true, "grid"]);
await page.evaluate(() => document.body.classList.add("more-open")); await page.waitForTimeout(600);
eq("More menu: slid up and visible", [(await tx(page, "#mshe"))[1], (await cs(page, "#mshe", ["visibility"]))[0]], [0, "visible"]);
await page.evaluate(() => document.body.classList.remove("more-open"));
await page.evaluate(() => { if (!document.getElementById("linf")) document.body.insertAdjacentHTML("beforeend", '<div id="linf">x</div>'); });
t = await tx(page, "#linf"); eq("tile info toast: parked below the screen, no opacity fade", [t[1] > 100, (await cs(page, "#linf", ["transitionProperty"]))[0]], [true, "transform, visibility"]);
eq("Automations pop-up: fades (opacity), no blur", await cs(page, "#cpp", ["opacity", "transitionProperty", "backdropFilter"]), ["0", "opacity, visibility", "none"]);
eq("detection viewer: no blur", (await cs(page, "#dtm", ["backdropFilter"]))[0], "none");
// lyrics sheet: slides, and slides back before it goes
await page.evaluate(() => { document.body.classList.add("ly-open"); });
eq("lyrics sheet: slide-up animation on open", (await page.evaluate(() => { const l = document.createElement("div"); l.className = "mlay hasly"; l.innerHTML = '<div id="lyr"></div>'; document.body.appendChild(l); const a = getComputedStyle(l.firstChild).animationName; l.remove(); return a; })), "shUp");
await page.evaluate(() => { document.body.classList.remove("ly-open"); lyClose(); }); 
await page.evaluate(() => { document.body.classList.add("ly-open"); lyClose(); });
eq("lyrics close: ly-out first", await page.evaluate(() => document.body.classList.contains("ly-out")), true); await page.waitForTimeout(450);
eq("lyrics close: gone after the slide", await page.evaluate(() => [document.body.classList.contains("ly-open"), document.body.classList.contains("ly-out")]), [false, false]);
await ctx.close();
// tablet
({ ctx, page } = await open(1280, 800));
t = await tx(page, "#np"); eq("tablet Notifications: parked to the right of the screen", t[0] > 400 && t[1] === 0, true);
await page.evaluate(() => document.body.classList.add("np-open")); await page.waitForTimeout(600);
eq("tablet Notifications: slid in from the right", await tx(page, "#np"), [0, 0]);
eq("tablet event editor: fade only", await cs(page, "#evp", ["transitionProperty", "transform"]), ["opacity", "none"]);
await ctx.close();
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`motion ok: ${checks} checks`);
