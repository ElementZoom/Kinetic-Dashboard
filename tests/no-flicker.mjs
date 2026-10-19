// Redraws with nothing new must not rebuild the page: Now Playing, Weather, GeoNet, Energy, Media, Irrigation, rooms.
// A rebuild flashes the content and restarts its animations.   Run:  node tests/no-flicker.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }, { id: "office", name: "Office" }],
  house: [{ id: "living", name: "Living area", icon: "sofa", lights: ["light.t1"], sections: [{ name: "Living area", items: ["light.t1"] }] }, { id: "office", name: "Office", icon: "desk", lights: ["light.t2"], sections: [{ name: "Office", items: ["light.t2"] }] }],
  irrigation: [{ name: "D", zone: "driveway", switch: "switch.d_water_tap", flow: "sensor.d_flow" }], media: ["media_player.a"],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const page = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
const errors = []; page.on("pageerror", e => errors.push(String(e.stack || e).split("\n").slice(0, 3).join(" | ")));
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const st = (id, s, a) => { states[id] = { entity_id: id, state: s, attributes: a || {} }; };
  st("media_player.a", "playing", { friendly_name: "A", media_title: "T", media_artist: "X", media_position: 30, media_duration: 200, media_position_updated_at: new Date().toISOString() });
  st("switch.d_water_tap", "on"); st("sensor.d_flow", "0.3");
});
const jobs = [["home", "home()"], ["rooms", "updRooms()"], ["rooms", "drawRooms()"], ["weather", "drawWeather()"], ["media", "drawMedia()"], ["hazards", "drawHaz()"], ["home", "npRender()"], ["irrigation", "drawIrr()"], ["energy", "drawEnergy()"]];
for (const [h, call] of jobs) {
  const r = await page.evaluate(async ([h, call]) => {
    location.hash = "#" + h; await new Promise(r => setTimeout(r, 700)); eval(call); await new Promise(r => setTimeout(r, 120));
    let rem = 0; const mo = new MutationObserver(ms => ms.forEach(m => m.removedNodes.forEach(x => { if (x.nodeType === 1) rem++; })));
    mo.observe(document.body, { childList: true, subtree: true }); await new Promise(r => setTimeout(r, 1100));   // a second passes, so the progress timing would differ
    eval(call); await new Promise(r => setTimeout(r, 120)); mo.disconnect(); return rem;
  }, [h, call]);
  checks++; if (r !== 0) problems.push(`${call} rebuilt ${r} element(s) although nothing changed`);
}
// the progress timing still refreshes in place
const t = await page.evaluate(async () => { location.hash = "#home"; await new Promise(r => setTimeout(r, 500)); npRender(); const b = document.querySelector("#npmini .mpb, #npfab .mpr"); if (!b) return "none"; const a = b.dataset.pos; states["media_player.a"].attributes.media_position = 90; npRender(); return [a, b.dataset.pos, b.isConnected]; });
checks++; if (t === "none" || !Array.isArray(t) || t[0] === t[1] || !t[2]) problems.push("progress timing not refreshed in place: " + JSON.stringify(t));
errors.forEach(e => problems.push("page error: " + e));
await browser.close(); server.close();
if (problems.length) { console.error("NO-FLICKER FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`no flicker ok: ${checks} checks`);
