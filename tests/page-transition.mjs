// Theme > Page transition: Rise / Slide / Fade / Off change how a page enters when you switch tabs; saved per device.   Run:  node tests/page-transition.mjs
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
const { ctx, page } = await open(900, 800);
const anim = async () => page.evaluate(() => { const e = document.getElementById("weather"); e.classList.remove("enter"); void e.offsetWidth; e.classList.add("enter"); return getComputedStyle(e).animationName; });
eq("default is Rise", await page.evaluate(() => document.documentElement.dataset.pgfx), "rise");
eq("Rise: page fades", await anim(), "pgFade");
await page.evaluate(() => { PGFX = "slide"; applyPgFx(); });
eq("Slide: page slides", await anim(), "pgSlide");
await page.evaluate(() => { PGFX = "fade"; applyPgFx(); });
eq("Fade: page fades", await anim(), "pgFade");
eq("Fade: cards do not rise", await page.evaluate(() => getComputedStyle(document.querySelector("#weather.enter>*")).animationName), "none");
await page.evaluate(() => { PGFX = "off"; applyPgFx(); });
eq("Off: no animation", await anim(), "none");
await page.evaluate(() => { PGFX = "rise"; applyPgFx(); });
eq("direction: Rooms after Home is +1, Home after Rooms is -1", await page.evaluate(() => { lastPg = document.getElementById("home"); const a = pgDir(document.getElementById("roomspg")); lastPg = document.getElementById("roomspg"); return [a, pgDir(document.getElementById("home"))]; }), [1, -1]);
await page.evaluate(() => { location.hash = "#theme"; }); await page.waitForTimeout(500);
eq("Theme page lists the four options", await page.evaluate(() => [...document.querySelectorAll("#theme [data-pgfx]")].map(b => b.dataset.pgfx)), ["rise", "slide", "fade", "off"]);
await page.click('#theme [data-pgfx="slide"]'); await page.waitForTimeout(300);
eq("choosing Slide applies and is saved", await page.evaluate(() => [document.documentElement.dataset.pgfx, localStorage.getItem("dashPgFx")]), ["slide", "slide"]);
await ctx.close();
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`page-transition ok: ${checks} checks`);
