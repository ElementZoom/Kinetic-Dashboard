// Notifications > ATTENTION and the slim Home card: bins, dry soil, offline devices, updates and low batteries.   Run:  node tests/attention.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  derived: { soil: { lawn: { moisture: ["sensor.lawn_m"], temperature: [] } } },
  bins: { due: [["input_boolean.recycle", "Recycling", "recycle"]], out: "input_boolean.bins_out" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
const open = async () => { const p = await browser.newPage({ viewport: { width: 1100, height: 900 } }); p.on("pageerror", e => errors.push(String(e))); await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800); return p; };
const page = await open();
const out = await page.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const wait = ms => new Promise(r => setTimeout(r, ms)), r = {}, old = new Date(Date.now() - 25 * 60000).toISOString();
  const st = (id, state, attributes, extra) => { states[id] = Object.assign({ entity_id: id, state, attributes: attributes || {} }, extra || {}); };
  st("sensor.lawn_m", "12"); st("input_boolean.recycle", "on"); st("input_boolean.bins_out", "off");
  st("light.hall_lamp", "unavailable", { friendly_name: "Hall lamp" }, { last_changed: old }); st("light.new_lamp", "unavailable", { friendly_name: "New lamp" }, { last_changed: new Date().toISOString() });
  st("sensor.phone_battery", "5", {}); st("sensor.door_battery_plus", "15", { friendly_name: "Front door Battery+" });
  st("update.core", "on", { title: "Core", installed_version: "1.0", latest_version: "1.1" });
  document.body.classList.add("np-open"); npTab = "attention"; drawNotif(); await wait(300);
  const rows = () => [...document.querySelectorAll("#npc .nrow")].map(x => x.querySelector("b").textContent + " | " + x.querySelector("small").textContent);
  r.tabs = [...document.querySelectorAll("#np .nptabs .chip")].map(c => c.textContent.replace(/\s+/g, " "));
  r.heads = [...document.querySelectorAll("#npc .np2")].map(x => x.textContent.replace(/\s+/g, " ").trim());
  r.rows = rows(); r.bins = !!document.querySelector("#npc .bn");
  r.home = [document.getElementById("attn").hidden, document.getElementById("attn").textContent.replace(/\s+/g, " ").trim().slice(0, 60)];
  CONFIG.calendars = ["calendar.t"]; SCH.ev = [{ ad: false, t: new Date(Date.now() + 36e5), e: new Date(Date.now() + 72e5), s: "Shift", c: "#6cf" }]; schDraw(); drawNotif(); await wait(200);
  const hs = document.getElementById("hstrip"), sc = document.getElementById("sch"), at = document.getElementById("attn"); r.strip = [hs.hidden, hs.dataset.n, sc.parentNode.id, at.getBoundingClientRect().top === sc.getBoundingClientRect().top, at.getBoundingClientRect().left < sc.getBoundingClientRect().left];
  document.getElementById("attn").click(); r.opened = npTab;
  CONFIG.attention = { offline: false, updates: false, soil: false, batteries: false, home: false }; drawNotif(); await wait(200);
  r.alone = [hs.hidden, hs.dataset.n, sc.hidden];
  r.off = [document.getElementById("attn").hidden, document.querySelector('#np [data-npt="attention"]').textContent];
  CONFIG.attention = { ignore: ["hall_"] }; drawNotif(); await wait(200); r.ignored = rows().filter(x => /lamp/i.test(x));
  location.hash = "#batteries"; await wait(300); r.oldLink = npTab;
  return r;
});
eq("tabs: Alerts, Attention (with the count), Active", out.tabs, ["ALERTS", "ATTENTION · 5", "ACTIVE"]);
eq("sections: Bins, Chores, Offline, Updates, Batteries", out.heads, ["Bins", "Chores", "Offline · 1", "Updates · 1", "Batteries · 1"]);
eq("offline needs 10 minutes: the old lamp is listed, the new one is not; update and battery rows; the phone's own battery is ignored", out.rows, ["Hall lamp | Offline for 25 min", "Core | 1.0 → 1.1", "Front door | 15%"]);
eq("the bins card is inside Attention", out.bins, true);
eq("Attention and Today share one row under the greeting", out.strip, [false, "2", "hstrip", true, true]);
eq("with the card off, Today takes the row alone", out.alone, [false, "1", false]);
eq("the slim Home card shows while there is anything", out.home[0] === false && /^5/.test(out.home[1]), true);
eq("tapping the Home card opens the Attention tab", out.opened, "attention");
eq("offline, updates, soil and batteries can each be switched off (the bins stay), and home: false hides the card", out.off, [true, "ATTENTION · 1"]);
eq("ignore leaves an entity out", out.ignored, []);
eq("an old #batteries link opens Attention", out.oldLink, "attention");
eq("no page errors", errors, []);
await page.close(); await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`attention ok: ${checks} checks`);
