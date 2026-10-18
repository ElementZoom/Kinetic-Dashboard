// Irrigation: sprinkler timers stay out of the notifications pop-up, tap warnings get the water effect,
// and a duration button still opens the tap and starts the timer when the Home Assistant script does nothing.
// Run:  node tests/irrigation.mjs [--shots dir]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const si = process.argv.indexOf("--shots"), shots = si > -1 ? process.argv[si + 1] : "";
if (shots) fs.mkdirSync(shots, { recursive: true });
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0])));
}).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(url); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  window.__sent = []; window.send = m => { window.__sent.push(JSON.parse(JSON.stringify(m))); };
  const z = (n, id) => ({ name: n, zone: id, switch: `switch.${id.replace(/-/g, "_")}_water_tap`, flow: `sensor.${id.replace(/-/g, "_")}_water_tap_flow`, timer: `timer.${id.replace(/-/g, "_")}_sprinkler_timer` });
  CONFIG.irrigation = [z("Driveway", "driveway"), z("Right walkway", "right-walkway"), z("Backyard", "backyard")];
  CONFIG.alerts = [["binary_sensor.door_test", "Entrance door", "Open"], ["switch.backyard_water_tap", "Backyard tap", "Water is running"], ["switch.driveway_water_tap", "Driveway tap", "Water is running"]];
  const st = (id, state, attributes = {}) => { states[id] = { entity_id: id, state, attributes }; };
  st("binary_sensor.door_test", "on"); st("switch.backyard_water_tap", "on"); st("switch.driveway_water_tap", "on"); st("switch.right_walkway_water_tap", "off");
  st("sensor.backyard_water_tap_flow", "0.4"); st("sensor.driveway_water_tap_flow", "0.5");
  const fin = new Date(Date.now() + 13 * 60000).toISOString();
  for (const n of ["driveway", "backyard"]) st(`timer.${n}_sprinkler_timer`, "active", { finishes_at: fin, duration: "0:30:00", friendly_name: `${n} sprinkler timer` });
  st("timer.rice_cooker", "active", { finishes_at: fin, duration: "0:30:00", friendly_name: "Rice cooker" });
  document.getElementById("hc").click();
});
await page.waitForTimeout(500);
const np = await page.evaluate(() => ({
  text: document.getElementById("np").innerText, wt: document.querySelectorAll("#np .tl.wt").length,
  waves: document.querySelectorAll("#np .tl.wt > .zwv").length, svgs: document.querySelectorAll("#np .tl.wt > .zwv svg").length,
  pos: [...document.querySelectorAll("#np .tl.wt > .zwv")].map(e => getComputedStyle(e).position),
  door: !!document.querySelector('#np .tl[data-e="binary_sensor.door_test"], #np .bd[data-e="binary_sensor.door_test"]'),
  doorWt: !!document.querySelector('#np [data-e="binary_sensor.door_test"].wt'),
}));
eq("no sprinkler timer in the pop-up", /sprinkler/i.test(np.text), false);
eq("other timers still listed", /rice cooker/i.test(np.text), true);
eq("two tap warnings carry the water effect", [np.wt, np.waves, np.svgs], [2, 2, 4]);
eq("waves are positioned inside the tile", np.pos, ["absolute", "absolute"]);
eq("non-tap warning has no water", np.doorWt, false);
if (shots) { await page.waitForTimeout(2200); await page.screenshot({ path: path.join(shots, "popup.png"), clip: { x: 770, y: 130, width: 500, height: 330 } }); await page.evaluate(() => { PAL.mode = "light"; applyPal(); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(shots, "popup-light.png"), clip: { x: 770, y: 130, width: 500, height: 330 } }); await page.evaluate(() => { PAL.mode = "dark"; applyPal(); }); }

// Active tab: taps carry the water effect and their timer countdown; white card in light mode
await page.evaluate(() => {
  ACTC.length = 0; ACTC.push(["Water taps", "group.all_water_taps", "m3-water-drop"]);
  const st = (id, state, attributes = {}) => { states[id] = { entity_id: id, state, attributes }; };
  st("group.all_water_taps", "on", { entity_id: ["switch.backyard_water_tap", "switch.driveway_water_tap", "switch.right_walkway_water_tap"] });
  st("switch.right_walkway_water_tap", "on"); st("sensor.right_walkway_water_tap_flow", "0.3");
  st("timer.right_walkway_sprinkler_timer", "active", { finishes_at: new Date(Date.now() + 9 * 60000).toISOString(), duration: "0:15:00" });
  document.querySelector('[data-npt="active"]').click();
});
await page.waitForTimeout(600);
await page.evaluate(() => { PAL.mode = "light"; applyPal(); }); await page.waitForTimeout(700);
const act = await page.evaluate(() => { const tiles = [...document.querySelectorAll('#np .tl.wt')]; return { n: tiles.length, waves: tiles.filter(x => x.querySelector(".zwv")).length, timers: tiles.filter(x => /remaining/.test(x.querySelector(".tmr") ? x.querySelector(".tmr").textContent : "")).length, bar: tiles.filter(x => x.querySelector(".zb i") && parseFloat(x.querySelector(".zb i").style.width) > 0).length, bg: getComputedStyle(tiles[0]).backgroundColor }; });
eq("Active tab: three taps, all with the water effect", [act.n, act.waves], [3, 3]);
eq("Active tab: timers shown on the taps that have one (3 running)", [act.timers, act.bar], [3, 3]);
eq("Active tab: tap cards are white in light mode", act.bg, "rgb(255, 255, 255)");
if (shots) { await page.waitForTimeout(1800); await page.screenshot({ path: path.join(shots, "active.png") }); }
await page.evaluate(() => { PAL.mode = "dark"; applyPal(); states["switch.right_walkway_water_tap"].state = "off"; states["timer.right_walkway_sprinkler_timer"].state = "idle"; });

// duration button on Right walkway: the script is called, then the fallback opens the tap and starts the timer
await page.evaluate(() => { document.body.classList.remove("np-open"); location.hash = "#irrigation"; });
await page.waitForTimeout(800);
const has = await page.evaluate(() => { if (!document.querySelector('[data-z="right-walkway"] [data-d]')) { try { drawIrr(); } catch (e) {} } return !!document.querySelector('[data-z="right-walkway"] [data-d="00:15:00"]'); });
eq("right walkway duration buttons exist", has, true);
if (has) {
  await page.evaluate(() => { window.__sent.length = 0; document.querySelector('[data-z="right-walkway"] [data-d="00:15:00"]').click(); });
  const early = await page.evaluate(() => window.__sent.map(m => m.domain + "." + m.service));
  eq("script called first", early, ["script.start_sprinkler_timer"]);
  eq("script gets the zone name with an underscore", await page.evaluate(() => window.__sent[0].service_data.zone), "right_walkway");
  await page.waitForTimeout(4300);
  const late = await page.evaluate(() => window.__sent.map(m => m.domain + "." + m.service + " " + JSON.stringify(m.target || {}) + " " + JSON.stringify(m.service_data || {})));
  eq("script did nothing -> tap opened", late.some(x => /^switch\.turn_on .*right_walkway_water_tap/.test(x)), true);
  eq("script did nothing -> timer started with the chosen length", late.some(x => /^timer\.start .*right_walkway_sprinkler_timer.*00:15:00/.test(x)), true);
  // script works: no extra calls
  await page.evaluate(() => { window.__sent.length = 0; const c = document.querySelector('[data-z="driveway"] [data-d="00:05:00"]'); c.click(); states["switch.driveway_water_tap"].state = "on"; states["timer.driveway_sprinkler_timer"].state = "active"; });
  await page.waitForTimeout(4300);
  eq("script worked -> no fallback calls", await page.evaluate(() => window.__sent.map(m => m.domain + "." + m.service)), ["script.start_sprinkler_timer"]);
}
errors.forEach(e => problems.push("page error: " + e));
await browser.close(); server.close();
if (problems.length) { console.error("IRRIGATION FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`irrigation ok: ${checks} checks`);
