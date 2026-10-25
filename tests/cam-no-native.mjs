// camFullscreen: false: opening a camera card on the page gives the full-bleed look without asking the browser for real full screen.   Run:  node tests/cam-no-native.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", camFullscreen: false, rooms: [{ id: "living", name: "Living", main: true }], layout: { tablet: ["cams"], mobile: ["cams"] },
  cameras: [{ id: "camera.a", name: "A" }, { id: "camera.b", name: "B" }, { id: "camera.c", name: "C" }],
  view: { driveway: { id: "camera.a", name: "D", trig: [] }, garage: { id: "camera.b", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  const wait = ms => new Promise(r => setTimeout(r, ms)), cams = [...document.querySelectorAll("#cams .cam")]; let asked = 0;
  [Element.prototype.requestFullscreen, Element.prototype.webkitRequestFullscreen].forEach((f, i) => { if (f) Element.prototype[i ? "webkitRequestFullscreen" : "requestFullscreen"] = function () { asked++; return Promise.resolve(); }; });
  cams[0].click(); await wait(500); const open = { nfs: cams[0].classList.contains("nfs"), full: cams[0].classList.contains("fs") || !!document.querySelector(".cam.fs, .cam.fopen, .cam.full"), asked };
  cams[0].click(); await wait(900); return { open, closed: !document.querySelector(".cam.fclose"), nfsAfter: cams[0].classList.contains("nfs") };
});
eq("no real full screen is asked for", out.open.asked, 0);
eq("the card gets the nfs class", out.open.nfs, true);
eq("the card closes again", out.closed, true);
await browser.close(); server.close();
if (errors.length) problems.push("page errors: " + errors.join(" | "));
if (problems.length) { console.error("FAIL:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`camera no-native full screen ok: ${checks} checks`);
