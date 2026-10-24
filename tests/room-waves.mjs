// Room cards: slow rolling waves (roomFx waves/glow/false).   Run:  node tests/room-waves.mjs
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mk = fx => `window.DASH_CONFIG = { url: location.origin, token: "", ${fx}rooms: [{ id: "living", name: "Living", main: true }], tiles: [{ name: "Living", icon: "sofa", room: "living", temp: "sensor.t" }], playback: {}, view: {} };`;
let cfg = mk("");
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0; const ok = (c, m) => { checks++; if (!c) problems.push(m); };
async function probe(fx) {
  cfg = mk(fx); const pg = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await pg.goto("http://127.0.0.1:" + server.address().port + "/dash.html"); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => { const rc = document.querySelector(".rc"); rc.dataset.tt = "1"; rc.style.setProperty("--ts", "2.5s"); const g = rc.querySelector(".rg"), b = getComputedStyle(g, "::before"), a = getComputedStyle(g, "::after"); return { fx: document.documentElement.dataset.roomfx, bn: b.animationName, bd: parseFloat(b.animationDuration), ad: parseFloat(a.animationDuration), bw: b.width, disp: getComputedStyle(g).display }; });
  await pg.close(); return r;
}
let r = await probe("");
ok(r.fx === "waves" && r.bn === "rfw", "default is waves " + JSON.stringify(r));
ok(r.bd >= 15 && r.ad >= 20, "waves are slow (>=15s / >=20s at the warmest) " + r.bd + "/" + r.ad);
r = await probe('roomFx: "glow", ');
ok(r.fx === "glow" && r.bn !== "rfw", "glow keeps the old look " + JSON.stringify(r));
r = await probe("roomFx: false, ");
ok(r.fx === "off" && r.disp === "none", "false hides the effect " + JSON.stringify(r));
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log("room-waves: " + checks + " checks passed");
