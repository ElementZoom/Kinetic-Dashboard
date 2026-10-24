// Camera cards on the page: while one is full screen the card keeps its place (the page behind does not jump during the fade), and closing leaves real full screen only after the fade.   Run:  node tests/camera-fullscreen-hold.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], layout: { tablet: ["cams"], mobile: ["cams"] },
  cameras: [{ id: "camera.a", name: "A" }, { id: "camera.b", name: "B" }, { id: "camera.c", name: "C" }],
  view: { driveway: { id: "camera.a", name: "D", trig: [] }, garage: { id: "camera.b", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 1100, height: 800 } }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  const wait = ms => new Promise(r => setTimeout(r, ms)), cams = [...document.querySelectorAll("#cams .cam")], pos = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; };
  window.__off = 0; const off0 = camNativeOff; camNativeOff = () => { window.__off = document.querySelector(".cam.fclose") ? 1 : 2; return off0(); };   // 1 = called while still fading, 2 = after
  const before = [pos(cams[1]), pos(cams[2])];
  cams[0].click(); await wait(400);
  const open = { ph: !!document.querySelector("#cams .camph"), moved: [pos(cams[1]), pos(cams[2])] };
  cams[0].click(); await wait(80); const during = !!document.querySelector(".cam.fclose"); await wait(700);
  return { before, open, during, closed: { ph: !!document.querySelector("#cams .camph"), at: [pos(cams[1]), pos(cams[2])] }, off: window.__off };
});
eq("a placeholder holds the card's place while it is full screen", out.open.ph, true);
eq("the other cards do not move while it is full screen", out.open.moved, out.before);
eq("the card is fading out 80 ms after the close tap", out.during, true);
eq("the placeholder is gone after closing and the cards are where they were", [out.closed.ph, out.closed.at], [false, out.before]);
eq("real full screen is left after the fade, not before it", out.off, 2);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`camera full screen hold ok: ${checks} checks`);
