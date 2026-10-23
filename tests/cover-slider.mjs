// Curtain slider: while a finger is on it (and 1.5 s after), position updates coming back from Home Assistant must not rewrite its label or value.   Run:  node tests/cover-slider.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "bed", name: "Bedroom", main: true }],
  house: [{ id: "bed", name: "Bedroom", icon: "bed", sections: [{ name: "Curtains", items: ["cover.t_curtain"] }] }] };`;
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
  window.__st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  __st("cover.t_curtain", "closed", { current_position: 0, device_class: "curtain", supported_features: 15, friendly_name: "Curtain" }); location.hash = "#rooms/bed";
}); await page.waitForTimeout(800);
const read = () => page.evaluate(() => { const t = document.querySelector('#rv [data-e="cover.t_curtain"]'); return t ? [t.querySelector(".ts2").textContent, t.querySelector("input").value] : null; });
eq("idle: label follows the device", (await page.evaluate(() => { __st("cover.t_curtain", "open", { current_position: 40, device_class: "curtain", supported_features: 15 }); updTiles(); return 1; }), (await read())[0].includes("40%")), true);
// finger down on the slider, drag to 12, HA reports other positions on the way
await page.evaluate(() => { const r = document.querySelector('#rv [data-e="cover.t_curtain"] input'); r.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); r.value = 12; r.dispatchEvent(new Event("input", { bubbles: true })); });
for (const p of [49, 61, 28]) await page.evaluate(p => { __st("cover.t_curtain", "open", { current_position: p, device_class: "curtain", supported_features: 15 }); updTiles(); }, p);
eq("dragging: label stays on the dragged value", await read(), ["12%", "12"]);
await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })));
await page.evaluate(() => { __st("cover.t_curtain", "open", { current_position: 61, device_class: "curtain", supported_features: 15 }); updTiles(); });
eq("just released: still held for the echo", (await read())[0], "12%");
await page.waitForTimeout(1700);
await page.evaluate(() => { updTiles(); });
const lt = await read(); eq("later: back to following the device", [/61%$/.test(lt[0]), lt[1]], [true, "61"]);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`cover slider ok: ${checks} checks`);
