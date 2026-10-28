// Notifications > ACTIVITY: a person / vehicle row shows the same picture as the Security > Detections tab for that clip, and tapping the picture plays that exact clip (the viewer fades in); tapping the row's text opens the camera.   Run:  node tests/activity-clips.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }], notifTimers: [],
  security: [{ id: "camera.d", name: "Driveway" }], playback: { "camera.d": "media-source://demo/d" }, detections: { snapshots: "media-source://demo/snaps" }, activity: { hours: 24 },
  view: { driveway: { id: "camera.d", name: "Driveway", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAMEAYFL09IQAAAAAElFTkSuQmCC", "base64");
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u === "/snap.png") { r.writeHead(200, { "content-type": "image/png" }); return r.end(PNG); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw); if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" })); else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); }); });
await page.route("**/api/calendars**", r => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1200);
const out = await page.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const now = new Date(), t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0).getTime() < Date.now() ? Date.now() - 20 * 60000 : Date.now() - 20 * 60000, cl = new Date(t);
  const hh = String(cl.getHours()).padStart(2, "0") + ":" + String(cl.getMinutes()).padStart(2, "0") + ":" + String(cl.getSeconds()).padStart(2, "0");
  states["binary_sensor.driveway_camera_person"] = { entity_id: "binary_sensor.driveway_camera_person", state: "on", attributes: { friendly_name: "Driveway person" } };
  states["binary_sensor.driveway_camera_vehicle"] = { entity_id: "binary_sensor.driveway_camera_vehicle", state: "on", attributes: { friendly_name: "Driveway vehicle" } };
  AF.loaded = Date.now(); AF.raw = [{ t: t, id: "binary_sensor.driveway_camera_person", s: "on", k: "person", key: "a" }, { t: Date.now() - 3 * 36e5, id: "binary_sensor.driveway_camera_vehicle", s: "on", k: "vehicle", key: "b" }];
  const day = { id: "day1", d: new Date(cl.getFullYear(), cl.getMonth(), cl.getDate()) };
  DT.cache["d|camera.d"] = [day]; DT.cache["c|day1"] = { kids: [{ title: hh + " 0:29 Person", media_content_id: "clip-1", can_play: true, can_expand: false, thumbnail: "/browse-thumb.png" }] };
  DT.cache["s|camera.d"] = { t: Date.now(), l: [{ ts: t + 1000, id: "snap-1" }] }; DT.t0 = Date.now(); DT.busy = false;
  window.__sent = []; window.send = (m, cb) => { window.__sent.push(m.type + ":" + (m.media_content_id || "")); setTimeout(() => cb({ url: m.media_content_id === "snap-1" ? "/snap.png" : "/clip.mp4" }), 5); };
  npTab = "activity"; document.body.classList.add("np-open"); drawNotif();
  await new Promise(r => setTimeout(r, 1200));
  const th = document.querySelector('#np .af-th[data-afp="clip-1"]'), im = th && th.querySelector("img");
  const first = { has: !!th, img: im ? im.getAttribute("src") : null, same: im ? im.getAttribute("src") === dtThumbUrl(dtItems()[0]) : null };
  const rows = [...document.querySelectorAll("#np .af-r")].map(r => [!!r.querySelector(".af-th"), r.dataset.vw || ""]);
  th.click(); await new Promise(r => setTimeout(r, 300));
  const m = document.getElementById("dtm"), v = m.querySelector("video");
  return { first, rows, viewer: m.classList.contains("on"), title: m.querySelector(".dtt").textContent, src: v.getAttribute("src"), sent: window.__sent, anim: getComputedStyle(m).animationName, np: document.body.classList.contains("np-open") };
});
eq("the clip's picture is the snapshot HA saved (same file the Detections tab uses)", out.first, { has: true, img: new URL("/snap.png", page.url()).origin + "/snap.png", same: true });
eq("the older vehicle row has no matching clip: no picture, still opens its camera", out.rows.map(r => r[0]).sort(), [false, true]);
eq("both rows still open the camera view when tapped outside the picture", out.rows.map(r => r[1]), ["driveway", "driveway"]);
eq("tapping the picture opens the viewer on that exact clip", [out.viewer, /Driveway/.test(out.title), out.sent.includes("media_source/resolve_media:clip-1"), /clip\.mp4$/.test(out.src || "")], [true, true, true, true]);
eq("the viewer fades in (same as the Detections tab), over the open pop-up", [out.anim, out.np], ["fdIn", true]);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`activity-clips: ${checks} checks passed`);
