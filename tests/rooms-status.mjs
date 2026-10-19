// Phone: the room AUTOMATIONS button is a pill, its card floats in the middle (tabs kept), and the header strip turns into an icon
// for a weather warning, an open garage door, an open door or water running (priority in that order, "+n" for more).   Run:  node tests/rooms-status.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  house: [{ id: "living", name: "Living area", icon: "sofa", lights: ["light.t1"], sections: [{ name: "Living area", items: ["light.t1"] }, { name: "Fans", items: ["fan.t_fan"] }] }],
  tileTimers: { "fan.t_fan": "timer.t_fan" }, tileFx: { "switch.t_rice": "heat", "switch.t_vac": "charge" }, activeAppliances: ["switch.t_rice", "switch.t_vac"], notifTimers: [],
  roomControls: { living: [{ entity: "input_boolean.living_presence_test", name: "Living presence sensor" }, { entity: "input_boolean.adaptive_lighting_test", name: "Adaptive lighting" }] },
  entities: { weatherWarnings: "sensor.demo_weather_warnings", doorsGroup: "group.demo_doors", towelGroup: "group.demo_towels" },
  view: { driveway: { id: "camera.d", name: "Driveway", trig: [] }, garage: { id: "camera.g", name: "Garage", trig: [] } },
  leakSensors: [["binary_sensor.demo_leak", "Washing machine", "Water under the machine"]],
  garageAlert: { "camera.g": { sensor: "binary_sensor.demo_garage_contact", opener: "switch.demo_opener", travel: 15 } },
  irrigation: [{ id: "z", name: "Zone", switch: "switch.zone_water_tap" }] };`;
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
  const st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  st("input_boolean.living_presence_test", "on"); st("input_boolean.adaptive_lighting_test", "off");
  window.__st = st; location.hash = "#rooms/living";
});
await page.waitForTimeout(800);
// Active tab: appliances get their own group; heated tiles carry the heat look; the tabs row hints at more tabs
await page.evaluate(() => { __st("switch.t_rice", "on"); __st("switch.t_vac", "off"); document.body.classList.add("np-open"); npTab = "active"; drawNotif(); });
const act = await page.evaluate(() => ({ grp: /Appliances · 1/.test(document.querySelector("#np").textContent), rice: !!document.querySelector('#np .tl.fx-heat[data-e="switch.t_rice"]'), vac: !!document.querySelector('#np [data-e="switch.t_vac"]') }));
eq("Appliances group lists only what is on", act, { grp: true, rice: true, vac: false });
await page.evaluate(() => { __st("switch.t_vac", "on"); drawNotif(); });
eq("charging tile shows the battery while on", await page.evaluate(() => { const t = document.querySelector('#np .tl.fx-charge[data-e="switch.t_vac"]'); return !!t && getComputedStyle(t.querySelector(".bt")).display === "flex" && t.querySelectorAll(".bt b").length === 4; }), true);
await page.evaluate(() => { __st("switch.t_vac", "off"); });
await page.evaluate(() => { document.body.classList.remove("np-open"); npTab = "alerts"; });
// a tile shows its timer's countdown only while the entity is on and the timer runs, and the old Timers card is gone
eq("fan tile has the airflow look", await page.evaluate(() => !!document.querySelector('#rv .tl.fx-air[data-e="fan.t_fan"] .ar')), true);
const tmr = async () => page.evaluate(() => { updTiles(); const t = document.querySelector('#rv .tl[data-e="fan.t_fan"]'); return t ? !!t.querySelector(".tmr") : null; });
await page.evaluate(() => { __st("fan.t_fan", "on"); __st("timer.t_fan", "idle"); });
eq("no countdown while the timer is idle", await tmr(), false);
await page.evaluate(() => __st("timer.t_fan", "active", { finishes_at: new Date(Date.now() + 600000).toISOString(), duration: "0:10:00" }));
eq("countdown appears when the timer starts", await tmr(), true);
await page.evaluate(() => __st("fan.t_fan", "off")); eq("not shown on an off tile", await tmr(), false);
await page.evaluate(() => __st("fan.t_fan", "on")); eq("shown again when on", await tmr(), true);
await page.evaluate(() => __st("timer.t_fan", "idle")); eq("gone when the timer ends", await tmr(), false);
await page.evaluate(() => __st("timer.t_fan", "active", { finishes_at: new Date(Date.now() + 600000).toISOString(), duration: "0:10:00" }));
eq("no Timers card in Alerts", await page.evaluate(() => /Timers/.test(notif(true).html)), false);
const b = await page.evaluate(() => { const e = document.querySelector("#rv .cpb"); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), radius: parseFloat(getComputedStyle(e).borderTopLeftRadius) }; });
eq("automations button exists", !!b, true);
if (b) { eq("button is wider than tall (pill)", b.w > b.h, true); eq("button is fully rounded", b.radius >= b.h / 2, true); }
await page.evaluate(() => { document.querySelector("#rv .cpb").click(); }); await page.waitForTimeout(500);
const c = await page.evaluate(() => { const e = document.querySelector("#cpp .cpsh").getBoundingClientRect(); return { cx: Math.round(e.x + e.width / 2), cy: Math.round(e.y + e.height / 2), top: Math.round(e.y), bottom: Math.round(innerHeight - e.bottom), tabs: document.querySelectorAll("#cpp [data-cpt]").length, radius: getComputedStyle(document.querySelector("#cpp .cpsh")).borderTopLeftRadius }; });
eq("card is centred across", c.cx, 195); eq("card is centred down", Math.abs(c.cy - 400) <= 2, true);
eq("card floats (gap above and below)", c.top > 40 && c.bottom > 40, true); eq("tabs are kept", c.tabs, 2); eq("tabs row hints at more when it overflows", await page.evaluate(() => { const s = document.querySelector("#cpp .cpts"); s.style.maxWidth = "120px"; hsAll(); return document.querySelector("#cpp .hsw").classList.contains("more"); }), true);
eq("left chevron once scrolled away from the first tab", await page.evaluate(() => { const s = document.querySelector("#cpp .cpts"), w = s.parentNode; const l0 = w.classList.contains("moreL"); s.scrollLeft = 60; hsUpd(w); return [l0, w.classList.contains("moreL")]; }), [false, true]); eq("rounded like the picker", c.radius, "26px");
await page.evaluate(() => { document.querySelector("#cpp").classList.remove("on"); });
const kind = async () => page.evaluate(() => { drawNotif(); const n = document.getElementById("nacc"); return [n.dataset.k || "", n.dataset.more || ""]; });
const bare = () => page.evaluate(() => { const n = document.getElementById("nacc"); return !n.hasAttribute("data-k") && !n.hasAttribute("data-more"); });
eq("nothing on: plain strip", await kind(), ["", ""]);
await page.evaluate(() => __st("switch.zone_water_tap", "on")); eq("water on", await kind(), ["water", ""]);
await page.evaluate(() => __st("binary_sensor.demo_garage_contact", "on")); eq("garage open beats water", await kind(), ["garage", "+1"]);
await page.evaluate(() => { __st("binary_sensor.demo_garage_contact", "off"); __st("group.demo_doors", "off", { entity_id: ["binary_sensor.demo_front_door", "binary_sensor.demo_garage_contact"] }); __st("binary_sensor.demo_front_door", "off"); });
eq("shut doors change nothing", await kind(), ["water", ""]);
await page.evaluate(() => { __st("binary_sensor.demo_front_door", "on"); __st("group.demo_doors", "on", { entity_id: ["binary_sensor.demo_front_door", "binary_sensor.demo_garage_contact"] }); }); eq("door open beats water", await kind(), ["door", "+1"]);
eq("open door is still listed under Doors", await page.evaluate(() => /Doors/.test(notif(true).html) && /1 open/.test(notif(true).html)), true);
await page.evaluate(() => __st("binary_sensor.demo_garage_contact", "on")); eq("garage open beats the door", await kind(), ["garage", "+2"]);
await page.evaluate(() => __st("sensor.demo_weather_warnings", "Strong wind warning", { warnings: "Strong wind" })); eq("weather warning beats them all", await kind(), ["warn", "+3"]);
await page.evaluate(() => __st("binary_sensor.demo_leak", "on")); eq("leak beats everything", await kind(), ["leak", "+4"]);
const warn = await page.evaluate(() => { const r = notif(true); return /Washing machine/.test(r.html) && /Water under the machine/.test(r.html) && r.html.indexOf("Washing machine") < r.html.indexOf("Strong wind"); }); eq("leak is listed under Warnings", warn, true);
await page.evaluate(() => __st("binary_sensor.demo_leak", "off"));
await page.evaluate(() => __st("sensor.demo_weather_warnings", "unknown")); eq("unknown warning is ignored", await kind(), ["garage", "+2"]);
await page.evaluate(() => { __st("binary_sensor.demo_garage_contact", "off"); __st("binary_sensor.demo_front_door", "off"); __st("group.demo_doors", "off", { entity_id: ["binary_sensor.demo_front_door", "binary_sensor.demo_garage_contact"] }); __st("switch.zone_water_tap", "off"); }); eq("back to the plain strip", await kind(), ["", ""]); eq("the plain strip has no icon attributes left (so the glowing bar can come back)", await bare(), true);
await page.evaluate(() => { __st("switch.demo_towel", "on"); __st("group.demo_towels", "on", { entity_id: ["switch.demo_towel"] }); });
eq("towel rails are listed under Active", await page.evaluate(() => /Towel heating/.test(actHtml(actList()))), true);
eq("towel rails are not in Alerts", await page.evaluate(() => !/Towel heating/.test(notif(true).html)), true);
await page.evaluate(() => { __st("switch.demo_towel", "off"); __st("group.demo_towels", "off", { entity_id: ["switch.demo_towel"] }); });
const chipCol = mode => page.evaluate(m => { document.documentElement.dataset.mode = m; const h = document.createElement("div"); h.className = "rc"; h.innerHTML = '<div class="ts">' + ["lights", "doors", "windows", "covers", "fans", "gopen", "gshut"].map(k => '<span class="cb2 cA al k-' + k + '"></span>').join("") + '</div>'; document.body.appendChild(h); const r = [...h.querySelectorAll(".cb2")].map(e => getComputedStyle(e).getPropertyValue("--k").trim()); h.remove(); return r; }, mode);
for (const m of ["light", "dark"]) { const c = await chipCol(m); eq("room card chips are coloured (" + m + ")", [c.slice(0, 6).every(x => /^#/.test(x)), new Set(c.slice(0, 5)).size, /mut|rgba/.test(c[6])], [true, 5, true]); }
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`rooms + status strip ok: ${checks} checks`);
