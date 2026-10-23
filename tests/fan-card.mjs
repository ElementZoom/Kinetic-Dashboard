// Fan tile (tileFx "air"): blue while on in every visual style, in light and in dark, with readable text and the breeze waves.   Run:  node tests/fan-card.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "t", rooms: [{ id: "bath", name: "Bathing", main: true }],
  house: [{ id: "bath", name: "Bathing", icon: "bath", sections: [{ name: "Bathing", items: ["fan.t_fan", "light.t_light"] }] }] };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const page = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await page.waitForTimeout(800);
await page.evaluate(() => {
  document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
  window.__st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
  __st("fan.t_fan", "on", { friendly_name: "Guest Bathroom Fan" }); __st("light.t_light", "off", { friendly_name: "Bathing lights" }); location.hash = "#rooms/bath";
}); await page.waitForTimeout(900);
eq("three breeze waves in the tile", await page.evaluate(() => document.querySelectorAll('#rv .tl.fx-air[data-e="fan.t_fan"] .ar svg').length), 3);
const num = s => (s.match(/-?[\d.]+/g) || []).map(Number);
const read = async (mode, style) => { await page.evaluate(([mode, style]) => { PAL.mode = mode; STYLE = style || "glass"; applyStyle(); applyPal(); }, [mode, style]); await page.waitForTimeout(700);   // colours fade between modes
  return page.evaluate(() => {
  const t = document.querySelector('#rv .tl.fx-air[data-e="fan.t_fan"]'), c = getComputedStyle(t);
  return { bg: c.backgroundColor, img: c.backgroundImage, name: getComputedStyle(t.querySelector(".tn")).color, bd: c.borderTopColor };
  }); };
for (const style of ["glass", "material", "minimal"]) {
  const L = await read("light", style), D = await read("dark", style), tag = style;
  const b = num(L.bg), scale = b.some(x => x > 1) ? 1 : 255;   // rgb() is 0-255, color(srgb) is 0-1
  eq(`light/${tag}: card is blue (blue channel beats red)`, b[2] * scale > b[0] * scale + 25, true);
  eq(`light/${tag}: name is dark for contrast`, num(L.name)[0] < 90, true);
  eq(`dark/${tag}: card is the blue gradient`, /60,\s*170,\s*230/.test(D.img), true);
  eq(`dark/${tag}: name is light`, num(D.name)[0] > 200, true);
}
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`fan card ok: ${checks} checks`);
