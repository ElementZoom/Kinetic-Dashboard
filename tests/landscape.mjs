// Camera full screen on a phone: tap = real full screen straight away (no floating card), expand button = landscape,
// close = leaves full screen with a fade. Falls back to the floating card / CSS rotation where full screen is refused or missing.
// Run:  node tests/landscape.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0])));
}).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html#security`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (got !== want) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };

async function boot(page) {
  await page.goto(url); await page.waitForTimeout(700);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; });
  await page.waitForTimeout(300);
}
const tap = page => page.click("#scams .cam");
const st = page => page.evaluate(() => { const e = document.querySelector("#scams .cam"); return { fs: e.classList.contains("fs"), ls: e.classList.contains("ls"), nfs: e.classList.contains("nfs"), full: document.fullscreenElement === document.documentElement, closing: e.classList.contains("fclose") }; });
const phone = { width: 412, height: 860 };

// 1. real full screen straight from the tap
{ const page = await browser.newPage({ viewport: phone }); const errs = []; page.on("pageerror", e => errs.push(String(e)));
  await boot(page); await tap(page); await page.waitForTimeout(500);
  let s = await st(page);
  eq("tap: card is full screen", s.fs, true); eq("tap: real full screen", s.full, true); eq("tap: full-bleed flag", s.nfs, true); eq("tap: stays portrait", s.ls, false);
  const r = await page.evaluate(() => { const b = document.querySelector("#scams .cam.fs").getBoundingClientRect(); return [b.left, b.top, Math.round(b.width), Math.round(b.height)]; });
  eq("tap: fills the screen edge to edge", JSON.stringify(r), JSON.stringify([0, 0, 412, 860]));
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(1200);
  s = await st(page); eq("expand: landscape (CSS rotation, the lock is refused here)", s.ls, true); eq("expand: still real full screen", s.full, true);
  const turn = await page.evaluate(() => getComputedStyle(document.querySelector("#scams .cam")).transform); eq("expand: the turn is applied inside real full screen (not overridden by the browser)", turn !== "none", true);
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(900);
  s = await st(page); eq("expand again: back to portrait", s.ls, false); eq("expand again: still full screen", s.full, true);
  await page.click("#scams .cam.fs .cx"); await page.waitForTimeout(80);
  s = await st(page); eq("close: fade has started", s.closing, true);
  await page.waitForTimeout(800);
  s = await st(page); eq("close: card back in the page", s.fs, false); eq("close: left full screen", s.full, false); eq("close: flags cleared", s.nfs || s.ls || s.closing, false);
  errs.forEach(e => problems.push("page error: " + e)); await page.close(); }

// 2. closing from landscape
{ const page = await browser.newPage({ viewport: phone });
  await boot(page); await tap(page); await page.waitForTimeout(400);
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(1200);
  await page.click("#scams .cam.fs .cx"); await page.waitForTimeout(900);
  const s = await st(page); eq("close from landscape: card back, rotation gone, not full screen", JSON.stringify([s.fs, s.ls, s.full]), JSON.stringify([false, false, false])); await page.close(); }

// 3. no Fullscreen API: floating card, expand = CSS rotation, as before
{ const page = await browser.newPage({ viewport: phone });
  await page.addInitScript(() => { Element.prototype.requestFullscreen = undefined; Element.prototype.webkitRequestFullscreen = undefined; });
  await boot(page); await tap(page); await page.waitForTimeout(400);
  let s = await st(page); eq("no API: floating card", JSON.stringify([s.fs, s.nfs, s.full]), JSON.stringify([true, false, false]));
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(900);
  s = await st(page); eq("no API: CSS rotation", s.ls, true);
  await page.click("#scams .cam.fs .cx"); await page.waitForTimeout(900);
  s = await st(page); eq("no API: closed", JSON.stringify([s.fs, s.ls]), JSON.stringify([false, false])); await page.close(); }

// 4. the browser refuses full screen: floating card
{ const page = await browser.newPage({ viewport: phone });
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new TypeError("denied")); });
  await boot(page); await tap(page); await page.waitForTimeout(500);
  const s = await st(page); eq("refused: floating card, no full-bleed flag", JSON.stringify([s.fs, s.nfs, s.full]), JSON.stringify([true, false, false])); await page.close(); }

// 5. tablet width: no automatic full screen, floating card as before
{ const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url.replace("#security", "#security")); await page.waitForTimeout(700);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; });
  await page.waitForTimeout(300); await tap(page); await page.waitForTimeout(400);
  const s = await st(page); eq("tablet: floating card, not real full screen", JSON.stringify([s.fs, s.nfs, s.full]), JSON.stringify([true, false, false]));
  await page.click("#scams .cam.fs .cx"); await page.waitForTimeout(700);
  const t = await st(page); eq("tablet: closes", t.fs, false); await page.close(); }

// 6. the webview never answers the orientation lock (Companion app): expand must still rotate with CSS, and turn back
{ const page = await browser.newPage({ viewport: phone });
  await page.addInitScript(() => { try { Object.defineProperty(screen.orientation, "lock", { value: () => new Promise(() => {}) }); } catch (_) {} });
  await boot(page); await tap(page); await page.waitForTimeout(500);
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(1200);
  let s = await st(page); eq("pending lock: still rotates with CSS", s.ls, true);
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(900);
  s = await st(page); eq("pending lock: expand again goes back to portrait", s.ls, false); await page.close(); }

// 7. the turn is a fade over black (only opacity animates, no width/height/transform tween), and the cover is gone afterwards
{ const page = await browser.newPage({ viewport: phone });
  await boot(page); await tap(page); await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector("#scams .cam.fs .fsb").click(); });
  let seen = null;
  for (let i = 0; i < 40 && !seen; i++) { await page.waitForTimeout(25); seen = await page.evaluate(() => document.documentElement.classList.contains("camsw") ? { anims: document.querySelector("#scams .cam").getAnimations({ subtree: true }).map(a => a.transitionProperty || a.animationName).filter(n => n !== "opacity"), lf: document.querySelector("#scams .cam").classList.contains("lf"), bg: getComputedStyle(document.documentElement, "::before").backgroundColor } : null); }
  eq("turn: black cover shows while switching", seen && seen.bg, "rgb(0, 0, 0)");
  eq("turn: nothing but opacity animates", JSON.stringify(seen && seen.anims.filter(n => !/^(camFin|fsin|camFopen)$/.test(n))), "[]");
  await page.waitForTimeout(1200);
  const e = await page.evaluate(() => ({ ls: document.querySelector("#scams .cam").classList.contains("ls"), lf: document.querySelector("#scams .cam").classList.contains("lf"), sw: document.documentElement.classList.contains("camsw"), op: getComputedStyle(document.querySelector("#scams .cam")).opacity }));
  eq("turn: landscape reached", e.ls, true); eq("turn: card visible again", e.op, "1"); eq("turn: cover removed", e.sw || e.lf, false);
  await page.click("#scams .cam.fs .fsb"); await page.waitForTimeout(900);
  const b = await page.evaluate(() => ({ ls: document.querySelector("#scams .cam").classList.contains("ls"), sw: document.documentElement.classList.contains("camsw"), op: getComputedStyle(document.querySelector("#scams .cam")).opacity }));
  eq("turn back: portrait again", b.ls, false); eq("turn back: card visible, cover removed", JSON.stringify([b.sw, b.op]), JSON.stringify([false, "1"]));
  await page.close(); }

await browser.close(); server.close();
if (problems.length) { console.error("LANDSCAPE FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`full screen ok: ${checks} checks`);
