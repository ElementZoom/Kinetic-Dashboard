// Garage door alert: drives the state machine with fake entity states and checks the camera cards.
// Run:  node tests/garage-alert.mjs [--shots dir]   (writes screenshots when --shots is given)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const si = process.argv.indexOf("--shots"), shots = si > -1 ? process.argv[si + 1] : "";
if (shots) fs.mkdirSync(shots, { recursive: true });
const files = { "/dash.html": ["dash.html", "text/html"], "/config.js": ["tests/garage.config.js", "text/javascript"] };
const server = http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]]; if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f[1] }); res.end(fs.readFileSync(path.join(root, f[0])));
}).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;

const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (got !== want) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };

async function run(name, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.goto(url); await page.waitForTimeout(800);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; });
  const gal = () => page.evaluate(() => [...document.querySelectorAll(".cam")].filter(e => /^Garage$/.test((e.querySelector(".lbl") || {}).textContent || "")).map(e => e.dataset.gal || ""));
  const text = () => page.evaluate(() => (document.querySelector('.cam[data-gal] .gal b') || {}).textContent || "");
  const feed = (id, st) => page.evaluate(([id, st]) => { const s = { entity_id: id, state: st, attributes: {} }; states[id] = s; galOnState(id, s); }, [id, st]);
  const clock = ms => page.evaluate(ms => { const real = Date.now; window.__off = (window.__off || 0) + ms; Date.now = () => real() + ms; }, ms);
  const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, `${name}-${n}.png`) }); };

  await feed("binary_sensor.garage_contact_test", "off");
  eq(`${name} closed: no alert on any garage card`, (await gal()).every(x => x === ""), true);
  await feed("switch.garage_opener_test", "off");
  await feed("switch.garage_opener_test", "on");                       // button pressed while closed
  eq(`${name} press while closed -> opening`, (await gal()).every(x => x === "opening"), true);
  eq(`${name} opening text`, (await text()).trim(), "GARAGE OPENING"); await shot("opening");
  await feed("binary_sensor.garage_contact_test", "on");               // door lifts
  eq(`${name} sensor on keeps opening`, (await gal()).every(x => x === "opening"), true);
  await clock(16000); await page.evaluate(() => galStep("camera.garage_test", false));
  eq(`${name} after travel time -> open`, (await gal()).every(x => x === "open"), true);
  eq(`${name} open text`, (await text()).trim(), "GARAGE OPEN"); await shot("open");
  eq(`${name} other camera untouched`, await page.evaluate(() => document.querySelectorAll('.cam[data-gal]').length > 0 && ![...document.querySelectorAll('.cam[data-gal]')].some(e => /front/.test((e.querySelector(".lbl") || {}).textContent || ""))), true);
  await feed("switch.garage_opener_test", "off"); await feed("switch.garage_opener_test", "on");   // press while open
  eq(`${name} press while open -> closing`, (await gal()).every(x => x === "closing"), true);
  eq(`${name} closing text`, (await text()).trim(), "GARAGE CLOSING"); await shot("closing");
  await feed("binary_sensor.garage_contact_test", "off");
  eq(`${name} sensor off -> alert gone`, (await gal()).every(x => x === ""), true);
  // closing that never finishes falls back to open
  await feed("binary_sensor.garage_contact_test", "on"); await clock(20000); await page.evaluate(() => galStep("camera.garage_test", false));
  await feed("switch.garage_opener_test", "off"); await feed("switch.garage_opener_test", "on");
  await clock(30000); await page.evaluate(() => galStep("camera.garage_test", false));
  eq(`${name} stuck closing -> back to open`, (await gal()).every(x => x === "open"), true);
  errors.forEach(e => problems.push(`${name} page error: ${e}`));
  await page.close();
}
await run("tablet", { width: 1280, height: 800 });
await run("phone", { width: 412, height: 860 });
await browser.close(); server.close();
if (problems.length) { console.error("GARAGE ALERT FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`garage alert ok: ${checks} checks`);
