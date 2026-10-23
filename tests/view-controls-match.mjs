// Auto view, both cameras side by side (landscape): the two control rows start at the same height and are the same height.   Run:  node tests/view-controls-match.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = fs.readFileSync(path.join(root, "tests/garage.config.js"), "utf8").replace("camControls: {", 'camControls: { "camera.front_test": [{ entity: "switch.garage_opener_test", sensor: "binary_sensor.garage_contact_test", name: "Garage door", confirm: true }, { entity: "light.front_a", name: "Ceiling lights" }, { entity: "light.front_b", name: "Wall lights" }],');
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await browser.newPage({ viewport: { width: 1000, height: 625 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#view/both`); await page.waitForTimeout(900);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  const st = (id, state, a) => { states[id] = { entity_id: id, state, attributes: a || {} }; };
  st("binary_sensor.garage_contact_test", "on", { device_class: "garage_door" }); st("switch.garage_opener_test", "on"); st("switch.garage_light_test", "on", { friendly_name: "Garage light" });
  st("light.front_a", "on", { friendly_name: "Ceiling lights", brightness: 255, supported_color_modes: ["brightness"] }); st("light.front_b", "on", { friendly_name: "Wall lights", brightness: 255, supported_color_modes: ["brightness"] });
  // one row has a taller tile (a countdown, a second line of text...)
  const vis = [...document.querySelectorAll("#vw.two .cam")].filter(c => getComputedStyle(c).display !== "none"); const last = vis[vis.length - 1].querySelector(".cpanel .tl"); if (last) last.style.minHeight = "99px";
  // one camera is a different shape, like a real pair of feeds
  document.querySelectorAll("#vw .cam img, #vw .cam video").forEach((e, i) => e.closest(".cam").style.setProperty("--ar", i % 2 ? "4/3" : "16/9"));
});
await page.waitForTimeout(1500); if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
const m = await page.evaluate(() => [...document.querySelectorAll("#vw.two .cam")].filter(c => getComputedStyle(c).display !== "none").map(c => { const cp = c.querySelector(".cpanel"), r = cp.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), tile: [...cp.querySelectorAll(".tl")].map(t => Math.round(t.getBoundingClientRect().height)) }; }));
eq("two cameras shown", m.length, 2);
eq("control rows start at the same height", m[0].top, m[1].top);
eq("control rows are the same height", m[0].h, m[1].h);
eq("tiles are the same height in both rows", [...new Set(m.flatMap(x => x.tile))].length, 1);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`view controls match ok: ${checks} checks`);
