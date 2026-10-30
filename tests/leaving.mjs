// Home: the Leaving card (lights left on, garage, doors, alarm) and its sheet.   Run:  node tests/leaving.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], notifTimers: [], alarm: "alarm_control_panel.demo_alarm",
  entities: { doorsGroup: "group.external_doors" }, garageAlert: { "camera.g": { sensor: "binary_sensor.garage_contact", opener: "switch.opener", travel: 15 } },
  house: [{ id: "living", name: "Living", icon: "sofa", lights: ["light.sofa", "light.kitchen"], lightSwitches: ["switch.table"] }] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 }), page = await ctx.newPage(), sent = [];
  page.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 300)));
  await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else { if (m.type === "call_service") sent.push(m.domain + "." + m.service + ":" + m.target.entity_id); if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); } }); });
  await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1000);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; });
  return { ctx, page, sent };
}
const st = (page, o) => page.evaluate(o => { Object.keys(o).forEach(id => setState({ entity_id: id, state: o[id], attributes: { friendly_name: id.split(".")[1].replace(/_/g, " ") }, last_changed: new Date(Date.now() - 12 * 6e4).toISOString(), last_updated: new Date().toISOString(), context: {} })); }, o);
for (const [name, w, h] of [["tablet", 1100, 800], ["phone", 390, 800]]) {
  const { ctx, page, sent } = await open(w, h);
  await page.waitForTimeout(300);
  eq(name + ": nothing on, nothing open: no card", await page.evaluate(() => document.getElementById("lvc").hidden), true);
  await st(page, { "light.sofa": "on", "light.kitchen": "off", "switch.table": "on", "binary_sensor.garage_contact": "on", "alarm_control_panel.demo_alarm": "disarmed" });
  await page.waitForTimeout(400);
  eq(name + ": card shows", await page.evaluate(() => !document.getElementById("lvc").hidden), true);
  eq(name + ": summary", await page.evaluate(() => document.querySelector("#lvc .at-x").textContent.replace(/\s+/g, " ").trim()), "Leaving? 2 lights, garage, alarm off");
  await page.click("#lvc"); await page.waitForTimeout(600);
  eq(name + ": sheet open with 3 rows", await page.evaluate(() => [document.body.classList.contains("lv-open"), document.querySelectorAll("#lvbody .nrow").length]), [true, 3]);
  eq(name + ": buttons", await page.evaluate(() => [...document.querySelectorAll("#lvbody [data-lv=off],#lvbody [data-lv=arm]")].map(b => b.dataset.lv)), ["off", "arm"]);
  eq(name + ": sheet slid into place", await page.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.getElementById("lvbody")).transform); return [Math.round(m.m41), Math.round(m.m42)]; }), [0, 0]);
  await page.click("#lvbody [data-lv=off]"); await page.waitForTimeout(200);
  eq(name + ": Lights off turns off the two lights that are on", sent.filter(x => /turn_off/.test(x)).sort(), ["light.turn_off:light.sofa", "switch.turn_off:switch.table"]);
  await page.click("#lvbody [data-lv=arm]"); await page.waitForTimeout(200);
  eq(name + ": Arm away calls the alarm", sent.filter(x => /alarm/.test(x)), ["alarm_control_panel.alarm_arm_away:alarm_control_panel.demo_alarm"]);
  await st(page, { "light.sofa": "off", "switch.table": "off" }); await page.waitForTimeout(300);
  eq(name + ": list updates live (lights gone)", await page.evaluate(() => document.querySelectorAll("#lvbody .nrow").length), 2);
  await page.click("#lvbody [data-lv=close]"); await page.waitForTimeout(500);
  eq(name + ": closes", await page.evaluate(() => document.body.classList.contains("lv-open")), false);
  await st(page, { "binary_sensor.garage_contact": "off", "alarm_control_panel.demo_alarm": "armed_away" }); await page.waitForTimeout(300);
  eq(name + ": all clear: card hides", await page.evaluate(() => document.getElementById("lvc").hidden), true);
  await ctx.close();
}
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`leaving ok: ${checks} checks`);
