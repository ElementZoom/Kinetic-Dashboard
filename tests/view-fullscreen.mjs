// The #view page (notification and camera links) on a phone: edge to edge, real full screen requested (again on the first
// tap if the browser refuses), left again on closing, and the garage frame shows on the garage feed in both layouts.
// Run:  node tests/view-fullscreen.mjs [--shots dir]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const si = process.argv.indexOf("--shots"), shots = si > -1 ? process.argv[si + 1] : "";
if (shots) fs.mkdirSync(shots, { recursive: true });
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0])));
}).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };

const page = await browser.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  window.__fs = { req: 0, exit: 0, refuse: true, el: null };
  document.documentElement.requestFullscreen = () => { window.__fs.req++; if (window.__fs.refuse) return Promise.reject(new Error("needs a gesture")); window.__fs.el = document.documentElement; return Promise.resolve(); };
  Object.defineProperty(document, "fullscreenElement", { get: () => window.__fs.el, configurable: true });
  document.exitFullscreen = () => { window.__fs.exit++; window.__fs.el = null; return Promise.resolve(); };
  const st = (id, state) => { states[id] = { entity_id: id, state, attributes: {} }; };
  st("binary_sensor.garage_contact_test", "off"); galOnState("binary_sensor.garage_contact_test", states["binary_sensor.garage_contact_test"]);
  st("binary_sensor.garage_contact_test", "on"); galOnState("binary_sensor.garage_contact_test", states["binary_sensor.garage_contact_test"]);
  location.hash = "#view/garage";
});
await page.waitForTimeout(700);
const one = await page.evaluate(() => {
  const cam = [...document.querySelectorAll("#vw .cam")].find(e => e.style.display !== "none" && /garage/i.test(e.textContent)), r = cam.getBoundingClientRect(), g = cam.querySelector(".gal").getBoundingClientRect();
  return { vwm: document.body.classList.contains("vwm"), rect: [r.x, r.y, r.width, r.height].map(Math.round), radius: getComputedStyle(cam).borderRadius, gal: cam.dataset.gal, galRect: [g.x, g.y, g.width, g.height].map(Math.round), ring: getComputedStyle(cam.querySelector(".gal")).boxShadow, req: window.__fs.req };
});
eq("view page is marked as phone full screen", one.vwm, true);
eq("garage feed fills the whole screen", one.rect, [0, 0, 412, 860]);
eq("square corners", one.radius, "0px");
eq("garage frame is on and covers the feed", [one.gal, one.galRect], ["opening", [0, 0, 412, 860]]);
eq("frame ring drawn (amber while the door is opening)", /255, 176, 46/.test(one.ring), true);
eq("real full screen asked for on arrival", one.req, 1);
if (shots) await page.screenshot({ path: path.join(shots, "view-garage.png") });
// browser refused: the first tap asks again, and this time it is allowed
await page.evaluate(() => { window.__fs.refuse = false; });
await page.touchscreen.tap(200, 400); await page.waitForTimeout(300);
eq("first tap asks again", await page.evaluate(() => window.__fs.req), 2);
// both feeds, phone upright: stacked cards, the garage card carries the frame
await page.evaluate(() => { location.hash = "#view/both"; }); await page.waitForTimeout(800);
const two = await page.evaluate(() => {
  const cam = [...document.querySelectorAll("#vw .cam")].find(e => e.style.display !== "none" && /garage/i.test(e.textContent)), g = cam.querySelector(".gal").getBoundingClientRect(), c = cam.getBoundingClientRect();
  return { gal: cam.dataset.gal, near: Math.abs(g.width - c.width) <= 2 && Math.abs(g.height - c.height) <= 2, vis: [...document.querySelectorAll("#vw .cam")].filter(e => e.style.display !== "none").length };
});
eq("two feeds shown", two.vis, 2);
eq("garage frame covers the garage card (upright)", [two.gal, two.near], ["opening", true]);
if (shots) await page.screenshot({ path: path.join(shots, "view-both.png") });
// tablet or landscape: the frame hugs the picture, not the picture plus its controls
{ const tab = await browser.newPage({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 2 }); tab.on("pageerror", e => errors.push(String(e)));
  await tab.goto(url); await tab.waitForTimeout(800);
  await tab.evaluate(() => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const st = (id, s) => { states[id] = { entity_id: id, state: s, attributes: {} }; }; st("binary_sensor.garage_contact_test", "off"); galOnState("binary_sensor.garage_contact_test", states["binary_sensor.garage_contact_test"]); st("binary_sensor.garage_contact_test", "on"); galOnState("binary_sensor.garage_contact_test", states["binary_sensor.garage_contact_test"]); location.hash = "#view/both"; });
  await tab.waitForTimeout(800);
  const L = await tab.evaluate(() => { const cam = [...document.querySelectorAll("#vw .cam")].find(e => e.style.display !== "none" && /garage/i.test(e.textContent)), g = cam.querySelector(".gal").getBoundingClientRect(), i = cam.querySelector("img").getBoundingClientRect(); const b = cam.querySelector(".gal b").getBoundingClientRect(), pn = [...cam.querySelectorAll(".cpanel .tl")].map(x => x.getBoundingClientRect()); return { clear: pn.length > 0 && pn.every(r => r.top >= b.bottom - 1), gal: cam.dataset.gal, same: [g.x, g.y, g.width, g.height].map(Math.round).join() === [i.x, i.y, i.width, i.height].map(Math.round).join(), vwm: document.body.classList.contains("vwm") }; });
  eq("tablet: frame hugs the garage picture", [L.gal, L.same], ["opening", true]); eq("tablet: the band sits above the control buttons, never on them", L.clear, true); eq("tablet: not switched to phone full screen", L.vwm, false);
  if (shots) await tab.screenshot({ path: path.join(shots, "view-both-tablet.png") }); await tab.close(); }
// closing leaves full screen
await page.evaluate(() => { document.querySelector("#vw .vwx").click(); }); await page.waitForTimeout(400);
eq("closing the view leaves full screen", await page.evaluate(() => [window.__fs.exit, document.body.classList.contains("vwm")]), [1, false]);
errors.forEach(e => problems.push("page error: " + e));
await browser.close(); server.close();
if (problems.length) { console.error("VIEW FULL SCREEN FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`view full screen ok: ${checks} checks`);
