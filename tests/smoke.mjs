// Smoke test: builds nothing, just loads ./dash.html in headless Chromium with an invented config
// and checks that the engine boots without a JavaScript error and reports the right version.
// Run:  node tests/smoke.mjs        (needs the "playwright" package; CI installs it)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/smoke.config.js", "text/javascript"] };

const server = http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]];
  if (!f) { res.writeHead(404); return res.end(); }   // brand-logo.js, fonts, the HA websocket: absent on purpose
  res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0])));
}).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;

const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(1500);
const got = await page.evaluate(() => ({ ver: window.DASH_VER, status: (document.getElementById("st") || {}).textContent }));
await browser.close(); server.close();

const problems = [];
if (got.ver !== version) problems.push(`DASH_VER is "${got.ver}", VERSION file says "${version}"`);
if (/JS ERROR/.test(got.status || "")) problems.push("engine reported: " + got.status);
errors.forEach(e => problems.push("page error: " + e));
if (problems.length) { console.error("SMOKE FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`smoke ok: engine v${got.ver} booted, no JavaScript errors`);
