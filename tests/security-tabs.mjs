// Security page: the Live / Detections tabs slide their content in like the Rooms tabs.   Run:  node tests/security-tabs.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], playback: { "camera.d": { name: "D" } },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
const p = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
p.on("pageerror", e => errors.push(String(e)));
await p.goto(url); await p.waitForTimeout(700);
await p.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  window.dtInit = () => {}; window.__tx = [];
  const o = window.txGo; window.txGo = (el, d, s) => { __tx.push([el && el.id, d]); return o(el, d, s); };
  location.hash = "#security";
});
await p.waitForTimeout(700);
eq("first visit: no tab slide (the page's own entrance plays)", await p.evaluate(() => __tx.length), 0);
await p.evaluate(() => { location.hash = "#security/detections"; }); await p.waitForTimeout(400);
eq("Live -> Detections slides forward", await p.evaluate(() => __tx.map(x => x.join(":")).join(",")), "alp:1,scams:1,dtp:1");
await p.evaluate(() => { __tx.length = 0; location.hash = "#security"; }); await p.waitForTimeout(400);
eq("Detections -> Live slides back", await p.evaluate(() => __tx.map(x => x.join(":")).join(",")), "alp:-1,scams:-1,dtp:-1");
await p.evaluate(() => { __tx.length = 0; location.hash = "#home"; }); await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = "#security"; }); await p.waitForTimeout(400);
eq("coming back from another page does not add a tab slide", await p.evaluate(() => __tx.length), 0);
await p.close(); await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`security tabs ok: ${checks} checks`);
