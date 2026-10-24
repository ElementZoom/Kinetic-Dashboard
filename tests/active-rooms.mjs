// Notifications > Active: inside each category the tiles are grouped under a small heading for the room they belong to ("Other" for strays).   Run:  node tests/active-rooms.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = off => `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "kitchen", name: "Kitchen", main: true }],
 house: [{ id: "kitchen", name: "Kitchen", icon: "sofa", lights: ["light.k1", "light.k2"], windows: ["binary_sensor.k_win"], sections: [{ name: "Lights", items: ["light.k1", "light.k2"] }] },
         { id: "ava", name: "Ava's room", icon: "bed", lights: ["light.a1"], sections: [{ name: "Lights", items: ["light.a1"] }] }],
 view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } },
 quickAll: [["Lights", "light.all_lights", "lightbulb-on"], ["Windows", "group.all_windows", "m3-window-open", 1]], ${off ? "notifRoomHeadings: false," : ""} };`;
let cfg = base(false);
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function run() {
  const p = await browser.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
  await p.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const st = (id, state, a) => { states[id] = { entity_id: id, state, attributes: a || {} }; };
    ["k1", "k2", "a1", "x1"].forEach(k => st("light." + k, "on", { friendly_name: "Lamp " + k, brightness: 255 }));
    st("light.all_lights", "on", { entity_id: ["light.a1", "light.x1", "light.k1", "light.k2"] });
    st("binary_sensor.k_win", "on", { device_class: "window", friendly_name: "Kitchen window" }); st("group.all_windows", "on", { entity_id: ["binary_sensor.k_win"] });
    npTab = "active"; document.body.classList.add("np-open"); drawNotif(); });
  await p.waitForTimeout(500);
  const out = await p.evaluate(() => { const root = document.querySelector("#np"); const r = []; root.querySelectorAll(".np-rm, .lbl.np2").forEach(h => { if (h.classList.contains("np-rm")) { const g = h.nextElementSibling; r.push([h.textContent, [...g.querySelectorAll("[data-e]")].map(t => t.dataset.e.replace("light.", "").replace("binary_sensor.", ""))]); } else r.push(h.dataset.sec); }); return r; });
  if (process.env.SHOT && !cfg.includes("notifRoomHeadings: false")) await p.screenshot({ path: process.env.SHOT });
  await p.close(); return { out, errors };
}
let { out, errors } = await run();
eq("lights grouped by room in house order, strays last; windows grouped too", out, ["lights", ["Kitchen", ["k1", "k2"]], ["Ava's room", ["a1"]], ["Other", ["x1"]], "windows", ["Kitchen", ["k_win"]]]);
eq("no page errors", errors, []);
cfg = base(true); ({ out } = await run());
eq("notifRoomHeadings: false keeps the old look (no room headings)", out, ["lights", "windows"]);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`active room headings ok: ${checks} checks`);
