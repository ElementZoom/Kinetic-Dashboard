// Home: today's schedule (tablet strip under the cameras, phone card under the greeting).   Run:  node tests/schedule.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let extra = "";
const cfg = () => `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], weather: "weather.home", notifTimers: [], calendars: ["calendar.a", "calendar.b"]${extra},
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg()); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
// events are made relative to "now" so the test works at any hour; all of them fall on today when the clock is mid-day, so the test pins the clock to 10:00 today
const LD = k => { const d = new Date(Date.now() + k * 864e5); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
const T = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const EV = {
  many: { "calendar.a": [{ summary: "Day Shift", start: { dateTime: T(6, 45) }, end: { dateTime: T(8, 15) } }, { summary: "Rubbish", start: { dateTime: T(10, 30) }, end: { dateTime: T(11) } }, { summary: "School pickup", start: { dateTime: T(15, 30) }, end: { dateTime: T(16) } }],
          "calendar.b": [{ summary: "Dentist appointment downtown", start: { dateTime: T(13) }, end: { dateTime: T(14) } }, { summary: "Parent teacher evening", start: { dateTime: T(18) }, end: { dateTime: T(19) } }, { summary: "Labour Day", start: { date: LD(0) }, end: { date: LD(1) } }] },
  none: {}, done: { "calendar.a": [{ summary: "Day Shift", start: { dateTime: T(6, 45) }, end: { dateTime: T(8, 15) } }] },
};
async function open(w, h, ev, o = {}) {
  extra = o.config || "";
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }); const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.addInitScript(([evs, fake]) => { const R = Date, t0 = new R(fake).getTime(), s0 = R.now(); const F = function (...a) { return a.length ? new R(...a) : new R(t0 + (R.now() - s0)); }; F.prototype = R.prototype; F.now = () => t0 + (R.now() - s0); F.UTC = R.UTC; F.parse = R.parse; window.Date = F;
    const rf = window.fetch; window.fetch = (u, x) => { const m = String(u).match(/\/api\/calendars\/([^?]+)/); return m ? Promise.resolve(new Response(JSON.stringify(evs[m[1]] || []))) : rf(u, x); }; }, [EV[ev], (() => { const d = new Date(); d.setHours(10, 0, 0, 0); return d.toISOString(); })()]);
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
  await page.goto(base + "#home"); await page.waitForTimeout(1200);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page };
}
const info = p => p.evaluate(() => { const e = document.getElementById("sch"); if (e.hidden) return { hidden: true }; const v = x => x && getComputedStyle(x).display !== "none" && x.getBoundingClientRect().width > 0; const r = e.getBoundingClientRect(), g = e.querySelector(".sch-g").getBoundingClientRect(), cr = document.querySelector(".hs").getBoundingClientRect();
  return { hidden: e.hidden, strip: v(e.querySelector(".sch-l")), card: v(e.querySelector(".sch-m")), chips: [...e.querySelectorAll(".sch-c")].filter(v).map(c => c.querySelector("span:last-child").textContent), next: (e.querySelector(".sch-c.nx span:last-child") || {}).textContent || "", more: e.querySelector(".sch-n").textContent, rows: e.querySelectorAll(".sch-r").length, mid: Math.abs((r.top + r.height / 2) - (g.top + g.height / 2)) <= 1.5, below: r.top >= cr.bottom - 1, label: [...e.querySelectorAll(".sch-x")].map(x => x.textContent), chipsInside: [...e.querySelectorAll(".sch-c")].filter(v).every(c => c.getBoundingClientRect().right <= e.querySelector(".sch-l").getBoundingClientRect().right + 1) }; });
// ---- wide tablet
let t = await open(1280, 800, "many"); let i = await info(t.page);
eq("strip shown on a tablet, card hidden", [i.hidden, i.strip, i.card], [false, true, false]);
eq("finished events are not in the strip; the next one is highlighted", [i.chips.includes("Day Shift"), i.next], [false, "Rubbish"]);
eq("all-day event comes first", i.chips[0], "Labour Day");
eq("chevron is centred in the thin strip", i.mid, true);
eq("sits in the strip row under the greeting, above the cameras", await t.page.evaluate(() => { const c = document.getElementById("cams").getBoundingClientRect(), s = document.getElementById("sch").getBoundingClientRect(), g = document.querySelector(".hs").getBoundingClientRect(); return s.top >= g.bottom - 1 && s.bottom <= c.top + 1 && document.getElementById("sch").parentNode.id === "hstrip"; }), true);
await t.page.click("#sch"); await t.page.waitForTimeout(300);
eq("tap opens Events", await t.page.evaluate(() => location.hash), "#events");
await t.ctx.close();
// ---- narrow tablet: chips that do not fit become +n
t = await open(900, 700, "many"); i = await info(t.page);
eq("narrow: some chips hidden, counted, and none spills out", [i.chips.length < 5, /^\+\d+$/.test(i.more), i.chipsInside], [true, true, true]);
await t.ctx.close();
// ---- nothing to show
for (const [k, why] of [["none", "no events today"], ["done", "everything today already finished"]]) { t = await open(1280, 800, k); eq("hidden: " + why, (await info(t.page)).hidden, true); await t.ctx.close(); }
t = await open(1280, 800, "many", { config: ", schedule: false" }); eq("schedule: false turns it off", (await info(t.page)).hidden, true); await t.ctx.close();
// ---- phone
t = await open(390, 844, "many"); i = await info(t.page);
eq("phone: card, not strip, 3 rows, under the greeting", [i.hidden, i.strip, i.card, i.rows, i.below], [false, false, true, 3, true]);
eq("phone: the rest is counted and the finished one is mentioned", i.label.some(x => /\+\d+ more/.test(x)) && i.label.some(x => /1 done/.test(x)), true);
await t.ctx.close();
eq("no JavaScript errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error("schedule FAILED:\n" + problems.join("\n")); process.exit(1); }
console.log(`schedule ok: ${checks} checks`);
