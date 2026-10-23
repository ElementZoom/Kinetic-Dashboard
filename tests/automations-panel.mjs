// Room AUTOMATIONS pop-up: a right-hand side panel on wide screens (room stays usable, ALL ON / ALL OFF for the open tab), the centred card on phones.   Run:  node tests/automations-panel.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "master", name: "Master bedroom", main: true }],
 house: [{ id: "master", name: "Master bedroom", icon: "bed", sections: [{ name: "Lights", items: ["light.t1"] }] }],
 roomControls: { master: [{ entity: "input_boolean.master_presence_toggle", name: "Bedroom presence sensor" }, { entity: "input_boolean.master_bathroom_presence_toggle", name: "Bathroom presence sensor" }, { entity: "input_boolean.master_adaptive_lighting_toggle", name: "Adaptive lighting" }] } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function open(ctx) {
  const p = await browser.newPage(ctx); const errors = []; p.on("pageerror", e => errors.push(String(e))); p._errors = errors;
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
  await p.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const st = (id, state, a) => { states[id] = { entity_id: id, state, attributes: a || {} }; }; window.__st = st;
    st("light.t1", "off", { friendly_name: "Lamp" }); st("input_boolean.master_presence_toggle", "on"); st("input_boolean.master_bathroom_presence_toggle", "off"); st("input_boolean.master_adaptive_lighting_toggle", "on");
    window.__calls = []; window.call = (d, s, id) => { __calls.push(d + "." + s + " " + id); }; location.hash = "#rooms/master"; });
  await p.waitForTimeout(900); await p.click(".cpb"); await p.waitForTimeout(700); return p;
}
const geo = p => p.evaluate(() => { const s = document.querySelector("#cpp .cpsh").getBoundingClientRect(); return { right: Math.round(innerWidth - s.right), h: Math.round(s.height), vh: innerHeight, w: Math.round(s.width), footer: getComputedStyle(document.querySelector(".cpft")).display, through: getComputedStyle(document.getElementById("cpp")).pointerEvents }; });
let p = await open({ viewport: { width: 1280, height: 800 } });
let g = await geo(p);
eq("wide: panel hugs the right edge", g.right, 0); eq("wide: panel is full height", g.h, g.vh); eq("wide: panel is a comfortable width", g.w >= 380 && g.w <= 540, true);
eq("wide: ALL ON / ALL OFF shown", g.footer, "flex"); eq("wide: the room behind stays clickable", g.through, "none");
eq("wide: a point on the room is not covered by the pop-up", await p.evaluate(() => !document.elementFromPoint(300, 300).closest("#cpp")), true);
await p.click('[data-cpall="off"]'); await p.waitForTimeout(200);
eq("ALL OFF switches off only what is on, in the open tab", await p.evaluate(() => __calls.slice()), ["input_boolean.turn_off input_boolean.master_presence_toggle"]);
await p.evaluate(() => { __calls.length = 0; }); await p.click('[data-cpall="on"]'); await p.waitForTimeout(200);
eq("ALL ON switches on what is off", await p.evaluate(() => __calls.slice()), ["input_boolean.turn_on input_boolean.master_bathroom_presence_toggle"]);
await p.evaluate(() => { location.hash = "#home"; }); await p.waitForTimeout(500);
eq("leaving the room closes the panel", await p.evaluate(() => document.getElementById("cpp").classList.contains("on")), false);
eq("no page errors (wide)", p._errors, []); await p.close();
p = await open({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
g = await geo(p);
eq("phone: still a centred card (not full height)", g.h < 500 && g.right > 8, true); eq("phone: no ALL ON / ALL OFF row", g.footer, "none");
eq("phone: the page behind is covered, as before", g.through, "auto"); eq("no page errors (phone)", p._errors, []); await p.close();
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`automations panel ok: ${checks} checks`);
