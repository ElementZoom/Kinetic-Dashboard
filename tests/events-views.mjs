// Events page views: tablet MONTH | WEEK | LIST, phone AGENDA | WEEK | MONTH (kept per device).
// Run:  node tests/events-views.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "living", name: "Living", main: true }], calendars: ["calendar.t"] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, c) => { checks++; if (!c) problems.push(what); };
const errors = [];
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), page = await ctx.newPage(); page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url); await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    states["calendar.t"] = { entity_id: "calendar.t", state: "off", attributes: { supported_features: 5, friendly_name: "Sam" } };
    const t = new Date(), at = (d, h, m) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + d, h, m).toISOString(), day = d => { const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + d); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); };
    const list = [{ summary: "Shift", start: { dateTime: at(0, 9, 0) }, end: { dateTime: at(0, 10, 0) } }, { summary: "Dentist", start: { dateTime: at(0, 9, 30) }, end: { dateTime: at(0, 10, 30) } },
      { summary: "Bin day", start: { date: day(0) }, end: { date: day(1) } }, { summary: "Piano", start: { dateTime: at(1, 14, 0) }, end: { dateTime: at(1, 15, 0) } }];
    window.fetch = () => Promise.resolve(new Response(JSON.stringify(list)));
    location.hash = "#events";
  });
  await page.waitForTimeout(700); return page;
}
const txt = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.trim()), s);
const n = (p, s) => p.evaluate(s => document.querySelectorAll(s).length, s);
// ---- tablet
let p = await open(1100, 900);
ok("tablet: switch has MONTH WEEK LIST", JSON.stringify(await txt(p, "#evsw button")) === '["MONTH","WEEK","LIST"]');
ok("tablet: starts on the month grid", (await n(p, "#cg .cd")) > 27);
await p.click('#evsw [data-v=week]'); await p.waitForTimeout(700);
ok("tablet week: 7 day columns", (await n(p, "#cg .wkb .wc")) === 7);
ok("tablet week: 2 timed blocks today + 1 tomorrow", (await n(p, "#cg .wev")) === 3);
ok("tablet week: overlapping events sit side by side", await p.evaluate(() => { const w = [...document.querySelectorAll("#cg .wev")].filter(e => /Shift|Dentist/.test(e.textContent)); return w.length === 2 && w[0].style.width === w[1].style.width && w[0].style.left !== w[1].style.left; }));
ok("tablet week: all-day strip has the bin day", (await txt(p, "#cg .wka .ce")).join() === "Bin day");
ok("tablet week: now line today", (await n(p, "#cg .wn")) === 1);
ok("tablet week: title is a date range", /–/.test((await txt(p, "#et"))[0]));
const t0 = (await txt(p, "#et"))[0]; await p.click("#en"); await p.waitForTimeout(500);
ok("tablet week: next arrow moves a week", (await txt(p, "#et"))[0] !== t0 && (await n(p, "#cg .wev")) === 0);
await p.click("#etd"); await p.waitForTimeout(500);
ok("tablet week: TODAY comes back", (await txt(p, "#et"))[0] === t0 && (await n(p, "#cg .wev")) === 3);
await p.click("#cg .wev"); await p.waitForTimeout(300);
ok("tablet week: tapping an event opens the editor", await p.evaluate(() => document.body.classList.contains("ev-open")));
await p.evaluate(() => evClose());
await p.click('#evsw [data-v=list]'); await p.waitForTimeout(700);
ok("tablet list: rows + mini month", (await n(p, "#cg.evl .ce")) >= 1 && (await n(p, "#cg .evlm .emg button")) >= 28);
ok("tablet list: today row says TODAY", /^TODAY/.test((await txt(p, "#cg .ah.t"))[0] || ""));
await p.reload(); await p.waitForTimeout(600);
ok("tablet: choice is remembered", await p.evaluate(() => JSON.parse(localStorage.kinEvView).t) === "list");
await p.context().close();
// ---- phone
p = await open(390, 844);
ok("phone: switch has AGENDA WEEK MONTH", JSON.stringify(await txt(p, "#evsw button")) === '["AGENDA","WEEK","MONTH"]');
ok("phone: starts on the agenda", (await n(p, "#cg .ah")) >= 1 && (await n(p, "#cg .evstrip")) === 0);
await p.click('#evsw [data-v=week]'); await p.waitForTimeout(700);
ok("phone week: strip of 7 days", (await n(p, "#cg .evstrip button")) === 7);
ok("phone week: today picked, its 3 events listed", (await n(p, "#cg .evstrip button.on")) === 1 && (await n(p, "#cg > .ce")) === 3);
await p.evaluate(() => { const b = [...document.querySelectorAll("#cg .evstrip button")].find(x => !x.classList.contains("on") && x.querySelector("i")); b.click(); });
await p.waitForTimeout(300);
ok("phone week: tapping another day lists its events", (await n(p, "#cg > .ce")) === 1);
const pt = (await txt(p, "#et"))[0]; await p.click("#en"); await p.waitForTimeout(500);
ok("phone week: next arrow shows the next week", (await txt(p, "#et"))[0] !== pt);
await p.click("#etd"); await p.waitForTimeout(500);
await p.click('#evsw [data-v=month]'); await p.waitForTimeout(700);
ok("phone month: compact grid with dots", (await n(p, "#cg .evmg button")) >= 28 && (await n(p, "#cg .evmg i")) >= 2);
ok("phone month: today's events listed", (await n(p, "#cg > .ce")) === 3);
ok("phone month: fits the screen width", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
ok("phone: choice is remembered", await p.evaluate(() => JSON.parse(localStorage.kinEvView).p) === "month");
await p.context().close();
ok("no page errors", errors.length === 0);
await browser.close(); server.close();
if (problems.length || errors.length) { console.log("FAIL\n" + problems.concat(errors).join("\n")); process.exit(1); }
console.log(`events-views: all ${checks} checks passed`);
