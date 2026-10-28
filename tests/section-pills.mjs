// Phone section tabs (Weather, Theme, Vehicle, Room) + the Events "+" button staying fixed at the screen corner under the sticky month bar.   Run:  node tests/section-pills.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true, lights: ["light.a"], doors: ["binary_sensor.d"], sections: [{ name: "Living area", items: ["light.a"] }, { name: "Play room", items: ["light.b"] }, { name: "Kitchen", items: ["light.c"] }, { name: "Fans", items: ["fan.a"] }] }, { id: "hall", name: "Hall", lights: ["light.h"], doors: ["binary_sensor.hd"], sections: [{ name: "Lights", items: ["light.h"] }] }, { id: "attic", name: "Attic", lights: ["light.t"] }], house: [{ id: "living", name: "Living", main: true, lights: ["light.a"], doors: ["binary_sensor.d"], sections: [{ name: "Living area", items: ["light.a"] }, { name: "Play room", items: ["light.b"] }, { name: "Kitchen", items: ["light.c"] }, { name: "Fans", items: ["fan.a"] }] }, { id: "hall", name: "Hall", lights: ["light.h"], doors: ["binary_sensor.hd"], sections: [{ name: "Lights", items: ["light.h"] }] }, { id: "attic", name: "Attic", lights: ["light.t"] }], notifTimers: [], weather: "weather.home", calendars: ["calendar.fam"] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(w, h, hash) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }), page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
  await page.route("**/api/calendars**", r => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#${hash}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page };
}
// phone: pills on Theme and Weather, and they scroll + follow
let { ctx, page } = await open(390, 800, "theme"); await page.waitForTimeout(500);
const pills = () => page.evaluate(() => { const r = document.querySelector(".secnav"), v = r && getComputedStyle(r.parentNode).display !== "none" && r.getBoundingClientRect().width > 0; return v ? [...r.children].map(c => c.textContent) : null; });
const p1 = await pills(); eq("Theme has a pill row with Style first", p1 && p1[0], "STYLE"); eq("Theme pills >= 3", !!p1 && p1.length >= 3, true);
await page.evaluate(() => document.querySelector(".secnav").lastElementChild.click()); await page.waitForTimeout(1200);
eq("tapping the last pill lights it", await page.evaluate(() => { const r = document.querySelector(".secnav"); return r.querySelector(".on") === r.lastElementChild; }), true);
eq("only the lit pill's card is shown (Notifications-style tabs)", await page.evaluate(() => { const h = document.querySelector("#theme .thl"), v = [...h.children].filter(c => /(^|\s)pn(\s|$)/.test(c.className) && getComputedStyle(c).display !== "none"); return v.length; }), 1);
await page.evaluate(() => document.querySelector(".secnav").firstElementChild.click()); await page.waitForTimeout(300);
eq("first pill shows only Style", await page.evaluate(() => { const h = document.querySelector("#theme .thl"), v = [...h.children].filter(c => /(^|\s)pn(\s|$)/.test(c.className) && getComputedStyle(c).display !== "none"); return v.length === 1 && /style/i.test(v[0].textContent.slice(0, 30)); }), true);
await page.evaluate(() => document.querySelector(".secnav").lastElementChild.click()); await page.waitForTimeout(300);
eq("row sits in the same wrapper the Rooms tabs use (hsw, with the edge chevrons)", await page.evaluate(() => { const w = document.querySelector(".secw"); return !!w && w.classList.contains("hsw") && w.querySelectorAll(".hsm").length === 2 && getComputedStyle(document.querySelector(".secnav")).backgroundColor === "rgba(0, 0, 0, 0)"; }), true);
await page.evaluate(() => { location.hash = "#weather"; }); await page.waitForTimeout(1200);
await page.evaluate(() => { states["weather.home"] = { entity_id: "weather.home", state: "sunny", attributes: { temperature: 20, forecast: [] } }; drawWeather(); }); await page.waitForTimeout(300);
const w = await pills(); eq("Weather row (or none if short): never errors", w === null || w.length >= 3, true);
await ctx.close();
// tablet: no row at all
({ ctx, page } = await open(1280, 800, "theme")); await page.waitForTimeout(500);
eq("no pill row on a tablet", await pills(), null); await ctx.close();
// events: the + button is pinned to the screen corner, not inside the sticky bar
({ ctx, page } = await open(390, 800, "events")); await page.waitForTimeout(1200);
await page.evaluate(() => { states["calendar.fam"] = { entity_id: "calendar.fam", state: "off", attributes: { supported_features: 1, friendly_name: "Family" } }; evBtn(); });
await page.waitForTimeout(300);
const fab = await page.evaluate(() => { const b = document.getElementById("eadd"); if (!b) return null; const r = b.getBoundingClientRect(); return { right: Math.round(innerWidth - r.right), bottomGap: Math.round(innerHeight - r.bottom), w: Math.round(r.width) }; });
eq("+ button exists, round 56px", fab && fab.w, 56);
eq("+ button sits near the bottom-right of the screen", !!fab && fab.right <= 20 && fab.bottomGap < 200, true);
await ctx.close();

// spacing: the gap under the tabs matches the other tab rows (about 14px)
({ ctx, page } = await open(390, 800, "theme")); await page.waitForTimeout(600);
const gap = await page.evaluate(() => { const r = document.querySelector(".secnav .chip.on").getBoundingClientRect(), c = [...document.querySelectorAll("#theme .thl > .pn")].find(e => getComputedStyle(e).display !== "none").getBoundingClientRect(); return Math.round(c.top - r.bottom); });
eq("gap between the tabs and the first card is ~14px (+ the chip's own shadow room)", gap >= 12 && gap <= 26, true);
await ctx.close();
// hazards: tabs (Map / Earthquakes / Volcanoes), no swipe dots
({ ctx, page } = await open(390, 800, "hazards")); await page.waitForTimeout(1200);
const hz = () => page.evaluate(() => { const v = e => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0, g = document.querySelector("#hazards .hzg"); return { tabs: [...document.querySelectorAll("#hazards .hztabs .chip")].map(c => c.textContent), map: v(g.querySelector(".hzm")), q: v(g.querySelectorAll(".hzside > .pn")[0]), vo: v(g.querySelectorAll(".hzside > .pn")[1]), dots: v(document.querySelector("#hazards .hzdots")), scrollX: g.scrollWidth > g.clientWidth + 2 }; });
let z = await hz(); eq("hazards tabs", z.tabs, ["MAP", "EARTHQUAKES", "VOLCANOES"]); eq("map tab shows only the map, no dots, no sideways scroll", [z.map, z.q, z.vo, z.dots, z.scrollX], [true, false, false, false, false]);
await page.click('#hazards .hztabs .chip:nth-child(2)'); await page.waitForTimeout(300); z = await hz(); eq("earthquakes tab shows only the earthquake list", [z.map, z.q, z.vo], [false, true, false]);
await page.click('#hazards .hztabs .chip:nth-child(3)'); await page.waitForTimeout(300); z = await hz(); eq("volcanoes tab shows only the volcano list", [z.map, z.q, z.vo], [false, false, true]);
await ctx.close();
// events: + only, and search across every event
({ ctx, page } = await open(390, 800, "events")); await page.waitForTimeout(800);
await page.unroute("**/api/calendars**"); await page.route("**/api/calendars/**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ summary: "Dentist visit", start: { dateTime: "2027-02-10T10:00:00+13:00" }, end: { dateTime: "2027-02-10T11:00:00+13:00" } }, { summary: "Birthday party", description: "at the dentist's old place", start: { date: "2026-12-01" }, end: { date: "2026-12-02" } }, { summary: "School pickup", start: { dateTime: "2026-11-03T15:30:00+13:00" }, end: { dateTime: "2026-11-03T16:00:00+13:00" } }]) }));
await page.evaluate(() => { states["calendar.fam"] = { entity_id: "calendar.fam", state: "off", attributes: { supported_features: 1, friendly_name: "Family" } }; evBtn(); });
eq("add button holds only +", await page.evaluate(() => document.getElementById("eadd").textContent.trim()), "+");
await page.click("#esrch"); await page.waitForTimeout(300);
eq("search box opens, month nav hides", await page.evaluate(() => [getComputedStyle(document.getElementById("esq")).display !== "none", getComputedStyle(document.getElementById("et")).display === "none"]), [true, true]);
await page.fill("#esq", "dentist"); await page.waitForTimeout(1200);
eq("search finds the title and the description matches, soonest first", await page.evaluate(() => [...document.querySelectorAll("#cg .ce")].map(e => e.textContent.replace(/\s+/g, " ").trim())), ["All day Birthday party", "10:00am Dentist visit"]);
await page.fill("#esq", "zzz"); await page.waitForTimeout(500);
eq("no match message", await page.evaluate(() => /No events match/.test(document.getElementById("cg").textContent)), true);
await page.click("#esrch"); await page.waitForTimeout(600);
eq("closing search brings the month back", await page.evaluate(() => [getComputedStyle(document.getElementById("et")).display !== "none", document.getElementById("esq").value]), [true, ""]);
await ctx.close();

// rooms: several light areas merge into one ROOM tab; a two-card room still gets tabs; a one-card room does not
({ ctx, page } = await open(390, 800, "rooms/living")); await page.waitForTimeout(1000);
const rv = () => page.evaluate(() => { const r = document.querySelector("#roomspg .secnav"); return { tabs: r ? [...r.children].map(c => c.textContent) : null, shown: [...document.querySelectorAll("#rv > .pn")].filter(e => getComputedStyle(e).display !== "none").map(e => e.querySelector(".lbl").textContent.split("·")[0].trim()) }; });
let rr = await rv(); eq("living: three light areas become one ROOM tab, then Fans, Doors", rr.tabs, ["ROOM", "FANS", "DOORS & WINDOWS"]); eq("ROOM tab shows all three light areas together", rr.shown.length, 3);
await page.click("#roomspg .secnav .chip:nth-child(2)"); await page.waitForTimeout(300); rr = await rv(); eq("Fans tab shows only Fans", rr.shown, ["Fans"]);
await page.evaluate(() => { location.hash = "#rooms/hall"; }); await page.waitForTimeout(1000); rr = await rv(); eq("hall (lights + doors) has two tabs", rr.tabs, ["LIGHTS", "DOORS & WINDOWS"]);
await page.evaluate(() => { location.hash = "#rooms/attic"; }); await page.waitForTimeout(1000); rr = await rv(); eq("a room with a single card has no tab row", rr.tabs, null);
await ctx.close();

// events (phone): the month bar is not an overlay any more; only the list scrolls
({ ctx, page } = await open(390, 800, "events")); await page.waitForTimeout(900);
eq("month bar is not sticky, the list is the scroller", await page.evaluate(() => [getComputedStyle(document.querySelector("#events .eh")).position, getComputedStyle(document.getElementById("cg")).overflowY, getComputedStyle(document.querySelector("#events .eh"), "::before").content]), ["static", "auto", "none"]);
await ctx.close();
// edge arrows appear by themselves for a row that was laid out while hidden (no scrolling needed)
({ ctx, page } = await open(390, 800, "home")); await page.waitForTimeout(600);
await page.evaluate(() => { const d = document.createElement("div"); d.id = "hst"; d.style.cssText = "display:none;width:200px"; d.innerHTML = hsw('<div style="overflow-x:auto;width:200px"><div style="width:700px;height:20px">x</div></div>'); document.body.appendChild(d); });
await page.waitForTimeout(400); await page.evaluate(() => { document.getElementById("hst").style.display = "block"; }); await page.waitForTimeout(500);
eq("arrow shows without any scrolling", await page.evaluate(() => document.querySelector("#hst .hsw").classList.contains("more")), true);
await ctx.close();

// add / edit event sheet (phone): a bottom sheet that slides by transform only, like the Notifications pop-up
({ ctx, page } = await open(390, 800, "events")); await page.waitForTimeout(800);
await page.evaluate(() => { states["calendar.fam"] = { entity_id: "calendar.fam", state: "off", attributes: { supported_features: 1, friendly_name: "Family" } }; evBtn(); });
const sh = () => page.evaluate(() => { const p = getComputedStyle(document.getElementById("evp")), b = getComputedStyle(document.getElementById("evb")), r = document.getElementById("evp").getBoundingClientRect(); return { tr: p.transitionProperty, op: p.opacity, bf: b.backdropFilter, top: Math.round(r.top), h: innerHeight }; });
let e0 = await sh(); eq("closed: parked below the screen, transform-only transition, no backdrop blur", [e0.tr, e0.op, e0.bf, e0.top >= e0.h], ["transform", "1", "none", true]);
await page.click("#eadd"); await page.waitForTimeout(700); e0 = await sh(); eq("open: sheet reaches the bottom edge", e0.top > 0 && e0.top < e0.h - 200, true);
await ctx.close();
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`section pills ok: ${checks} checks`);
