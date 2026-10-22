// Rooms: the Occupied tab only exists while a room is occupied, and the page always opens on the first tab.
// Phone calendar: opens at today (or the next event day); earlier days of the month stay above.   Run:  node tests/rooms-occupied-calendar.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "living", name: "Living", main: true }],
  house: [{ id: "living", name: "Living", icon: "sofa", lights: ["light.t1"], occ: ["input_boolean.living_occ"], sections: [{ name: "Living", items: ["light.t1"] }] },
          { id: "den", name: "Den", icon: "sofa", lights: ["light.t2"], occ: ["input_boolean.den_occ"], sections: [{ name: "Den", items: ["light.t2"] }] }],
  roomTabs: [["Main", ["living"]], ["Other", ["den"]]], calendars: ["calendar.t"], mediaPlayers: [{ id: "media_player.t", name: "T" }] };`;
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
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  window.__st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  __st("input_boolean.living_occ", "off"); __st("input_boolean.den_occ", "off"); __st("light.t1", "off"); __st("light.t2", "off"); location.hash = "#rooms";
});
await page.waitForTimeout(600);
const tabs = () => page.evaluate(() => [...document.querySelectorAll("#rtabs .chip")].map(b => b.textContent + (b.classList.contains("on") ? "*" : "")));
eq("no Occupied tab when nothing is occupied", await tabs(), ["Main*", "Other"]);
await page.evaluate(() => { __st("input_boolean.den_occ", "on"); drawRooms(); });
eq("Occupied tab appears first, but does not steal the open tab", await tabs(), ["Occupied", "Main*", "Other"]);
await page.evaluate(() => { location.hash = "#home"; }); await page.waitForTimeout(300);
await page.evaluate(() => { location.hash = "#rooms"; }); await page.waitForTimeout(500);
eq("entering Rooms opens on Occupied", await tabs(), ["Occupied*", "Main", "Other"]);
await page.evaluate(() => { __st("input_boolean.den_occ", "off"); drawRooms(); });
eq("Occupied tab disappears when it empties", (await tabs()).map(x => x.replace("*", "")), ["Main", "Other"]);
// calendar (phone): the agenda opens at today, earlier days stay above
const days = await page.evaluate(() => { const n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate(); return { y, m, d }; });
await page.evaluate(({ y, m, d }) => {
  const iso = dd => new Date(y, m, dd, 9).toISOString();
  window.EVT = []; for (let i = 1; i <= 28; i++) EVT.push({ summary: "Ev" + i, start: { dateTime: iso(i) }, end: { dateTime: iso(i) } });
  window.fetch = (u, o) => String(u).includes("/api/calendars/") ? Promise.resolve(new Response(JSON.stringify(EVT))) : Promise.reject(new Error("x"));
  location.hash = "#events";
}, days);
await page.waitForTimeout(1200);
const r = await page.evaluate(() => { const t = document.querySelector("#cg .ah.up"); const b = t && t.getBoundingClientRect(); return { top: b ? Math.round(b.top) : null, scrolled: Math.round(scrollY) + [...document.querySelectorAll("*")].reduce((a, e) => Math.max(a, e.scrollTop), 0), first: document.querySelector("#cg .ah") && document.querySelector("#cg .ah").textContent }; });
const today = new Date().getDate();
if (today > 3) { eq("earliest event day is above the view (scrolled down)", r.scrolled > 0, true); eq("today is in view", r.top !== null && r.top >= 0 && r.top < 400, true); }
// floating add button + mini player
await page.evaluate(() => { __st("calendar.t", "off", { supported_features: 1, friendly_name: "T" }); evBtn(); }); await page.waitForTimeout(200);
const fab = () => page.evaluate(() => { const b = document.querySelector("#eadd").getBoundingClientRect(), n = document.querySelector("#btab").getBoundingClientRect(), m = document.querySelector("#npmini"), mr = m && getComputedStyle(m).display !== "none" ? m.getBoundingClientRect() : null; return { round: Math.abs(b.width - b.height) < 1 && b.width >= 48, aboveNav: b.bottom <= n.top, aboveMini: mr ? b.bottom <= mr.top : null, right: Math.round(innerWidth - b.right) }; });
const f1 = await fab(); eq("add button is a floating circle above the nav", [f1.round, f1.aboveNav], [true, true]);
await page.evaluate(() => { document.body.classList.add("np-on"); const m = document.querySelector("#npmini"); }); await page.waitForTimeout(400);
const f2 = await fab(); eq("add button sits above the mini player", f2.aboveMini !== false, true);
await page.screenshot({ path: process.env.SHOT || "/tmp/cal.png" });
const tb = await page.evaluate(() => { const t = document.querySelector("#cg .agt"); return t ? getComputedStyle(t).backgroundImage.includes("gradient") : false; });
eq("today has a gradient block", tb, true);
const hd = await page.evaluate(() => { const a = document.querySelector("#cg .ah.up").getBoundingClientRect(), p = document.querySelector("#ttl").getBoundingClientRect(); return a.top - p.bottom; });
eq("today's header clears the title bar", hd > 8, true);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`rooms occupied + calendar ok: ${checks} checks`);
