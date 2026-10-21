// Phone: the floating bars (Irrigation, Scenes) clear the tab bar with the material style, the Irrigation rain card is compact so the
// dots under it stay on screen, and the room buttons in the Scenes sheet are grey until the room is on.   Run:  node tests/phone-pills.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((req, res) => { const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0]))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, v, got) => { checks++; if (!v) problems.push(what + (got === undefined ? "" : ": got " + JSON.stringify(got))); };
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 720 }, hasTouch: true, isMobile: true });
page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  STYLE = "material"; applyStyle();
  const st = (id, state, attributes = {}) => { states[id] = { entity_id: id, state, attributes }; };
  const z = (n, id) => ({ name: n, zone: id, switch: `switch.${id}_water_tap`, flow: `sensor.${id}_water_tap_flow`, timer: `timer.${id}_sprinkler_timer`, moist: `sensor.average_${id}_soil_moisture` });
  CONFIG.irrigation = [z("Driveway", "driveway"), z("Backyard", "backyard")];
  const fin = new Date(Date.now() + 21 * 60000).toISOString();
  st("switch.driveway_water_tap", "on"); st("timer.driveway_sprinkler_timer", "active", { finishes_at: fin, duration: "0:30:00" }); st("switch.backyard_water_tap", "off");
  const now = Date.now(); fcH = Array.from({ length: 12 }, (_, i) => ({ datetime: new Date(now + i * 3600000).toISOString(), condition: "cloudy", precipitation: 0, precipitation_probability: 10 }));
  IH.d = { "sensor.average_driveway_soil_moisture": Array.from({ length: 145 }, (_, i) => 30 + 8 * Math.sin(i / 9)), "sensor.average_backyard_soil_moisture": Array.from({ length: 145 }, (_, i) => 42 + 5 * Math.cos(i / 11)) }; IH.t = Date.now();
  location.hash = "#irrigation";
});
await page.waitForTimeout(1500);
await page.evaluate(() => drawIrr()); await page.waitForTimeout(400);
const m = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect(); }; const nav = r("#btab"), pill = r("#irrigation .zsx.col"), dots = r("#irrigation .irdots"), rain = r("#irrigation .rn12"); const cards = [...document.querySelectorAll("#irrigation .irc > .pn")].map(c => Math.round(c.getBoundingClientRect().height)); return { nav: nav && nav.top, pill: pill && [pill.top, pill.bottom], dots: dots && dots.bottom, rain: rain && rain.height, soilH: cards[1], cards }; });
ok("irrigation bar is on screen", !!m.pill, m);
if (m.pill) {
  ok("the swipe dots under the cards are visible above the floating bar without scrolling", m.dots + 8 <= m.pill[0], [Math.round(m.dots), Math.round(m.pill[0])]);
  ok("irrigation bar leaves a gap above the tab bar (material style)", m.nav - m.pill[1] >= 8, Math.round(m.nav - m.pill[1]));
  ok("rain card is compact", m.rain < 330 || m.rain === m.soilH, Math.round(m.rain));
}
await page.evaluate(() => { const g = document.querySelector("#irrigation .irc"); g.scrollTo({ left: g.clientWidth + 12 }); }); await page.waitForTimeout(800);
ok("both Irrigation cards are the same height", m.cards.length === 2 && m.cards[0] === m.cards[1], m.cards);
await page.evaluate(() => { let e = document.querySelector("#irrigation"); while (e) { if (e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) { e.scrollTop = 1e6; return; } e = e.parentElement; } window.scrollTo(0, 1e6); }); await page.waitForTimeout(400);
const bot = await page.evaluate(() => { const g = document.querySelector("#irrigation .irc").getBoundingClientRect(), d = document.querySelector("#irrigation .irdots").getBoundingClientRect(), p = document.querySelector("#irrigation .zsx.col").getBoundingClientRect(); return { cardBottom: Math.round(g.bottom), dotsBottom: Math.round(d.bottom), pillTop: Math.round(p.top) }; });
ok("after scrolling to the end, the card bottoms and dots stay above the floating bar", bot.cardBottom <= bot.pillTop - 8 && bot.dotsBottom <= bot.pillTop - 8, bot);
const m2 = await page.evaluate(() => { const g = document.querySelector("#irrigation .irc"), d = document.querySelector("#irrigation .irdots").getBoundingClientRect(), p = document.querySelector("#irrigation .zsx.col").getBoundingClientRect(); return { clipped: g.scrollHeight > g.clientHeight + 1, gap: p.top - d.bottom }; });
ok("swiping to the soil card does not clip it", m2.clipped === false, m2);
ok("soil card dots also clear the floating bar", m2.gap >= 8, m2);
const c = await page.evaluate(() => { const h = document.createElement("div"); h.id = "scenes-probe"; h.innerHTML = '<div class="sr" id="p1" style="--rc:#f00"><i class="sbd"><svg></svg></i><b>Off</b></div><div class="sr on" id="p2" style="--rc:#f00"><i class="sbd"><svg></svg></i><b>On</b></div>'; document.getElementById("scenes").appendChild(h); const col = id => getComputedStyle(document.querySelector("#" + id + " .sbd")).color; return [col("p1"), col("p2"), getComputedStyle(document.documentElement).getPropertyValue("--mut")]; });
ok("a room button that is off is grey (not its accent colour), one that is on takes its colour", c[0] !== c[1] && c[0] !== "rgb(255, 0, 0)", c);
ok("no JavaScript errors", errors.length === 0, errors);
await browser.close(); server.close();
if (problems.length) { console.error("phone pills FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`phone pills ok: ${checks} checks`);
