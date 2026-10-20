// Opening the dashboard from a notification link (#active/doors) while Home Assistant is slow to send its states:
// the Active pop-up must not sit empty, and must still scroll to the Doors section once the states arrive.
// Run:  node tests/notification-link.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }],
  quickAll: [["Lights", "light.all_lights", "lightbulb-on"], ["Windows", "group.all_windows", "m3-window-open", 1], ["Doors", "group.external_doors", "m3-door-open", 1]],
  entities: { doorsGroup: "group.external_doors" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, v) => { checks++; if (!v) problems.push(what); };
const st = (id, state, attributes) => ({ entity_id: id, state, attributes: attributes || {}, last_changed: new Date().toISOString(), last_updated: new Date().toISOString(), context: {} });
const lights = Array.from({ length: 14 }, (_, i) => "light.l" + i);
const windows = ["binary_sensor.w1", "binary_sensor.w2"], doors = ["binary_sensor.d1", "binary_sensor.d2"];
const all = [st("light.all_lights", "on", { entity_id: lights }), ...lights.map(l => st(l, "on", { friendly_name: l })),
  st("group.all_windows", "on", { entity_id: windows }), ...windows.map(w => st(w, "on", { friendly_name: "Window " + w })),
  st("group.external_doors", "on", { entity_id: doors }), ...doors.map(d => st(d, "on", { friendly_name: "Door " + d })),
  st("sensor.a_battery_plus", "20", { friendly_name: "Soil Sensor One Battery+" })];
const errors = [];
async function run(delay) {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  page.on("pageerror", e => errors.push(String(e)));
  await page.routeWebSocket(/api\/websocket/, ws => {
    ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw);
      if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      else if (m.type === "get_states") setTimeout(() => ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: all })), delay);
      else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: null })); });
  });
  await page.goto(base + "#active/doors");
  await page.waitForTimeout(700);
  const early = await page.evaluate(() => ({ open: document.body.classList.contains("np-open"), txt: (document.querySelector("#np") || {}).innerText || "" }));
  await page.waitForTimeout(delay + 2500);
  const late = await page.evaluate(() => {
    const np = document.querySelector("#np"), d = np.querySelector('[data-sec="doors"]'), l = np.querySelector('[data-sec="lights"]');
    const nr = np.getBoundingClientRect(), dr = d && d.getBoundingClientRect(), lr = l && l.getBoundingClientRect();
    return { open: document.body.classList.contains("np-open"), hasDoors: !!d, doorsTop: dr ? Math.round(dr.top - nr.top) : null, lightsTop: lr ? Math.round(lr.top - nr.top) : null,
      doorsInView: !!dr && dr.top >= nr.top - 2 && dr.bottom <= nr.bottom + 2, scrolled: !!lr && lr.top < nr.top, txt: np.innerText };
  });
  await page.close();
  return { early, late };
}
for (const delay of [100, 3500]) {
  const { early, late } = await run(delay);
  const tag = `(states arrive after ${delay} ms)`;
  ok(`pop-up opens ${tag}`, late.open);
  ok(`pop-up lists Doors once states arrive ${tag}`, late.hasDoors && /Doors · 2/i.test(late.txt));
  ok(`pop-up scrolled so the Doors section is in view ${tag} (doors ${late.doorsTop}px, lights ${late.lightsTop}px)`, late.hasDoors && late.doorsInView && late.scrolled);
  if (delay > 1000) ok(`not the misleading "Nothing is on or open" while still loading ${tag}`, !/Nothing is on or open/.test(early.txt));
}
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error("notification-link FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`notification-link ok: ${checks} checks`);
