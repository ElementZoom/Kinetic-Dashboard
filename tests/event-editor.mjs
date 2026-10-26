// Calendar editor: end time follows the start time (+30 min on a new event, same length on an edit); a colour-only change saves without touching the calendar.
// Run:  node tests/event-editor.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "living", name: "Living", main: true }], calendars: ["calendar.t"] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  states["calendar.t"] = { entity_id: "calendar.t", state: "off", attributes: { supported_features: 5, friendly_name: "T" } };
  window.SENT = []; const real = window.send; window.send = (m, cb) => { if (/^calendar\/event/.test(m.type)) { SENT.push(m); if (cb) cb({}, { success: true }); return; } return real(m, cb); };
  window.fetch = () => Promise.resolve(new Response("[]"));
  location.hash = "#events";
});
await page.waitForTimeout(500);
const set = async (id, v) => { await page.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]); };
const val = id => page.evaluate(id => document.getElementById(id).value, id);
// new event
await page.evaluate(() => evOpen({ date: "2026-11-10" }));
await set("evst", "14:15");
eq("new event: end is start + 30 min", [await val("eved"), await val("evet")], ["2026-11-10", "14:45"]);
await set("evst", "23:45");
eq("new event: past midnight rolls the end date", [await val("eved"), await val("evet")], ["2026-11-11", "00:15"]);
await set("evst", "08:00");
eq("new event: moving the start again follows it", [await val("eved"), await val("evet")], ["2026-11-10", "08:30"]);
await page.evaluate(() => evClose());
// edit keeps its length
const mk = (title, extra) => ({ cal: "calendar.t", v: Object.assign({ summary: title, uid: "u1", start: { dateTime: new Date(2026, 10, 10, 9, 0).toISOString() }, end: { dateTime: new Date(2026, 10, 10, 11, 0).toISOString() } }, extra || {}) });
await page.evaluate(m => evOpen({ ev: m }), mk("Dentist"));
await set("evst", "10:00");
eq("edit: the event keeps its 2 h length", [await val("eved"), await val("evet")], ["2026-11-10", "12:00"]);
await page.evaluate(() => evClose());
// colour only: no calendar call, colour kept
await page.evaluate(() => { SENT.length = 0; delete EVCOL[evKey("calendar.t", "Dentist")]; });
await page.evaluate(m => evOpen({ ev: m }), mk("Dentist"));
await page.click('#evp button.csw[data-col="#ff6b6b"]');
await page.click('#evp [data-x="save"]'); await page.waitForTimeout(300);
const r = await page.evaluate(() => ({ sent: SENT.length, col: EVCOL[evKey("calendar.t", "Dentist")], closed: !evS, stored: JSON.parse(localStorage.dashEvCol || "{}")[evKey("calendar.t", "Dentist")] }));
eq("colour-only: the calendar is not called", r.sent, 0);
eq("colour-only: colour saved and sheet closed", [r.col, r.closed, r.stored], ["#ff6b6b", true, "#ff6b6b"]);
// changing the colour back to "Same as calendar"
await page.evaluate(m => evOpen({ ev: m }), mk("Dentist"));
await page.click('#evp button.auto'); await page.click('#evp [data-x="save"]'); await page.waitForTimeout(300);
eq("colour-only: reset to calendar colour", await page.evaluate(() => [SENT.length, EVCOL[evKey("calendar.t", "Dentist")] || ""]), [0, ""]);
// a real change still goes to the calendar, with its colour
await page.evaluate(m => evOpen({ ev: m }), mk("Dentist"));
await page.click('#evp button.csw[data-col="#6bb8ff"]'); await set("evt", "Dentist 2");
await page.click('#evp [data-x="save"]'); await page.waitForTimeout(300);
const r2 = await page.evaluate(() => ({ n: SENT.length, t: SENT[0] && SENT[0].type, s: SENT[0] && SENT[0].event.summary, col: EVCOL[evKey("calendar.t", "Dentist 2")] }));
eq("real change: update sent, colour moves to the new title", [r2.n, r2.t, r2.s, r2.col], [1, "calendar/event/update", "Dentist 2", "#6bb8ff"]);
eq("no page errors", errors, []);
await browser.close(); server.close();
console.log(`event editor: ${checks} checks`);
if (problems.length) { console.log("FAILED:\n - " + problems.join("\n - ")); process.exitCode = 1; } else console.log("ok");
