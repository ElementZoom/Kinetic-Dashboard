// Alarm buttons glow by state: green ARM when disarmed, red DISARM when armed, amber while arming, red flash when triggered.   Run:  node tests/alarm-glow.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], alarm: "alarm_control_panel.home", alarmTiles: [], playback: {}, view: {} };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
p.on("pageerror", e => problems.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
await p.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; location.hash = "#security"; });
await p.waitForTimeout(300);
for (const [st, ag, m] of [["disarmed", "ok", "arm_away"], ["armed_away", "on", "disarm"], ["arming", "wn", "disarm"], ["triggered", "al", "disarm"]]) {
  const r = await p.evaluate(s => { states[CONFIG.alarm] = { entity_id: CONFIG.alarm, state: s, attributes: { supported_features: 2 } }; drawAlarm(); const e = document.querySelector("#alp .chip.ag"); return e ? [e.dataset.ag, e.dataset.m] : null; }, st);
  eq(st, r, [ag, m]);
}
await browser.close(); server.close();
if (problems.length) { console.log("alarm glow FAILED:\n" + problems.join("\n")); process.exit(1); }
console.log(`alarm glow ok: ${checks} checks`);
