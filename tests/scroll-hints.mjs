// Sideways rows (Irrigation zone tabs, Scenes pictures and rooms, Weather tabs): wrapped so the edge fades and a chevron nudges
// while more is hidden past it.   Run:  node tests/scroll-hints.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  irrigation: [{ name: "Driveway zone", zone: "driveway", switch: "switch.d_tap" }, { name: "Right walkway zone", zone: "right_walkway", switch: "switch.r_tap" }, { name: "Backyard zone", zone: "backyard", switch: "switch.b_tap" }],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; location.hash = "#irrigation"; });
await page.waitForTimeout(900);
const ir = await page.evaluate(() => { document.querySelector("#irrigation .zsx").classList.remove("col"); const w = document.querySelector("#irrigation .zsx .hsw"); if (!w) return null; const s = w.firstElementChild; s.style.maxWidth = "150px"; hsUpd(w); const a = w.classList.contains("more"); s.scrollLeft = 80; hsUpd(w); return { tabs: s.classList.contains("sctb"), right: a, left: w.classList.contains("moreL") }; });
eq("irrigation zone tabs are wrapped; chevron right at first, left after scrolling", ir, { tabs: true, right: true, left: true });
const lvl = await page.evaluate(() => { const w = document.querySelector("#irrigation .zsx .hsw"); if (!w) return null; w.classList.add("more", "moreL"); hsUpd(w); w.classList.add("more", "moreL"); const k = [...w.firstElementChild.children].map(c => c.getBoundingClientRect()); const mid = (Math.min(...k.map(r => r.top)) + Math.max(...k.map(r => r.bottom))) / 2; return [".hsm.r", ".hsm.l"].map(q => { const c = w.querySelector(q).getBoundingClientRect(); return Math.abs(c.top + c.height / 2 - mid) < 1; }); });
eq("chevrons are level with the tabs, not with the padded wrapper", lvl, [true, true]);
const html = await page.evaluate(() => {
  CONFIG.scenes = { groups: [["Living", "sofa", [0]], ["Bed", "bed-king", [0]], ["Bath", "water", [0]]], rc: ["#fff"], ri: ["sofa"], rooms: [{ n: "Dining" }], preset: [["Spring", [["a", "blossom"], ["b", "crocus"]]]], gradient: [["Fun", [["c", "festive_fun"]]]], imageDir: "/x/" };
  return scPanel(true);
});
eq("scenes: picture row and room tabs are both wrapped", (html.match(/class="hsw"/g) || []).length, 2);
eq("weather tabs helper is used", await page.evaluate(() => /class="hsw"><div class="chips tabs fct"/.test(String(hsw('<div class="chips tabs fct"></div>')))), true);
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`scroll hints ok: ${checks} checks`);
