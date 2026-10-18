// The #view cameras on a phone must look like a full-screen Security camera: same buttons (sound, talk, landscape, X), same
// LIVE badge, same positions, upright and turned to landscape.   Run:  node tests/view-matches-security.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((q, r) => { const f = files[q.url.split("?")[0]]; if (!f) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": f[1] }); r.end(fs.readFileSync(path.join(root, f[0]))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
async function shape(open, land) {
  const p = await browser.newPage({ viewport: { width: +(process.env.W||390), height: 800 }, hasTouch: true, isMobile: true });
  await p.goto(url); await p.waitForTimeout(800);
  await p.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; let fe = null; document.documentElement.requestFullscreen = () => { fe = document.documentElement; return Promise.resolve(); };
    Object.defineProperty(document, "fullscreenElement", { get: () => fe, configurable: true }); document.exitFullscreen = () => { fe = null; return Promise.resolve(); }; });
  await open(p); await p.waitForTimeout(800);
  if (land) { await p.evaluate(() => { const c = document.querySelector("#vw.on .cam:not([style*=none]), #scams .cam.fs"); c.querySelector(".fsb").click(); }); await p.waitForTimeout(900); }
  const d = await p.evaluate(() => {
    const c = document.querySelector("#vw.on .cam:not([style*=none]), #scams .cam.fs"); c.classList.add("live"); const cr = c.getBoundingClientRect(), o = {};
    for (const k of ["lbl", "lv", "cx", "fsb", "aud", "cpanel"]) { const e = c.querySelector("." + k), r = e.getBoundingClientRect(); o[k] = getComputedStyle(e).display === "none" ? "hidden" : [r.x - cr.x, r.y - cr.y, r.width, r.height].map(v => Math.round(v / 3)).join(","); }
    o.vwx = getComputedStyle(document.querySelector(".vwx")).display; return o;
  });
  await p.close(); return d;
}
const sec = async p => { await p.evaluate(() => { location.hash = "#security"; }); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector("#scams .cam").click()); await p.waitForTimeout(500); };
const vw = async p => { await p.evaluate(() => { location.hash = "#view/garage"; }); };
for (const land of [false, true]) {
  const a = await shape(sec, land), b = await shape(vw, land), tag = land ? "landscape" : "portrait";
  for (const k of ["lbl", "lv", "cx", "fsb", "aud"]) { checks++; if (a[k] !== b[k]) problems.push(`${tag} ${k}: Security ${a[k]}, #view ${b[k]}`); }
  checks++; if (b.cx === "hidden") problems.push(`${tag}: #view has no X on the card`);
  checks++; if (b.vwx !== "none") problems.push(`${tag}: the separate round X is still showing`);
}
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`view matches security ok: ${checks} checks`);
