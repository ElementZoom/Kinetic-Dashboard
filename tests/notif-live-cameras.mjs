// Notifications pop-up: the cameras are live cards (not snapshot pictures), and an alert's 4th value can name any camera (rubbish / recycling show the Road camera).   Run:  node tests/notif-live-cameras.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  cameras: [{ id: "camera.drive_clear", name: "Driveway" }, { id: "camera.road_clear", name: "Road" }],
  security: [{ id: "camera.drive_clear", name: "Right driveway" }, { id: "camera.road_clear", name: "Road" }],
  alerts: [["input_boolean.rubbish", "Rubbish day", "Bring the rubbish out", "road"], ["switch.driveway_water_tap", "Driveway tap", "Water is running", "driveway"]],
  view: { driveway: { id: "camera.drive_clear", name: "Driveway", trig: [] }, garage: { id: "camera.garage_clear", name: "Garage", trig: ["binary_sensor.grg"] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 1100, height: 900 } }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  const wait = ms => new Promise(r => setTimeout(r, ms)), r = {}, started = [], stopped = [];
  const st = (id, state, a) => { states[id] = { entity_id: id, state, attributes: a || {} }; };
  st("input_boolean.rubbish", "on", { friendly_name: "Rubbish" }); st("switch.driveway_water_tap", "off"); st("binary_sensor.grg", "off");
  window.liveCam = c => { started.push(c.id); c.live = true; }; window.stopCam = c => { stopped.push(c.id); c.live = false; };
  npTab = "alerts"; document.body.classList.add("np-open"); drawNotif(); await wait(400);
  const slots = () => [...document.querySelectorAll("#npc .npcam")].map(x => [x.dataset.npc, x.dataset.vw, !!x.querySelector(".cam video")]);
  r.rubbish = slots(); r.snapshotImgs = document.querySelectorAll("#npc .snap > img").length;
  const el1 = document.querySelector("#npc .npcam .cam"); drawNotif(); queueNotif(); await wait(300); r.sameCard = document.querySelector("#npc .npcam .cam") === el1; r.startedOnce = started.slice();
  st("switch.driveway_water_tap", "on"); st("binary_sensor.grg", "on"); drawNotif(); await wait(500); r.all = slots().map(x => x[0]); r.started = started.slice();
  st("input_boolean.rubbish", "off"); drawNotif(); await wait(300); r.afterRubbishOff = slots().map(x => x[0]); r.stoppedRoad = stopped.indexOf("camera.road_clear") > -1;
  const n0 = stopped.length; document.body.classList.remove("np-open"); npCamStop(); r.stoppedOnClose = stopped.length > n0;
  return r;
});
eq("rubbish alert (tag road) shows the Road camera, as a live card", out.rubbish, [["camera.road_clear", "road", true]]);
eq("no snapshot pictures in the pop-up", out.snapshotImgs, 0);
eq("redrawing the list keeps the same live card and does not restart the stream", [out.sameCard, out.startedOnce], [true, ["camera.road_clear"]]);
eq("driveway tap (tag driveway) and the garage trigger add their cameras", out.all, ["camera.road_clear", "camera.drive_clear", "camera.garage_clear"]);
eq("each camera is started once", out.started, ["camera.road_clear", "camera.drive_clear", "camera.garage_clear"]);
eq("a camera that is no longer wanted is stopped and removed", [out.afterRubbishOff, out.stoppedRoad], [["camera.drive_clear", "camera.garage_clear"], true]);
eq("closing the pop-up stops the streams", out.stoppedOnClose, true);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`notification live cameras ok: ${checks} checks`);
