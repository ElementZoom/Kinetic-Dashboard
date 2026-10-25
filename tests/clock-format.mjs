// 12- or 24-hour clock: config.js clock, the device's language ("auto"), and Theme page > Clock (saved on this device, wins over config.js).
// Run:  node tests/clock-format.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let clock = "";
const cfg = () => `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }]${clock ? `, clock: "${clock}"` : ""},
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg()); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const ok = (what, v) => { checks++; if (!v) problems.push(what); };
const H12 = /^\d{1,2}:\d{2}\s?(am|pm|a\.m\.|p\.m\.)$/i, H24 = /^\d{2}:\d{2}$/;
async function open(opts) {
  clock = opts.config || "";
  const ctx = await browser.newContext({ locale: opts.locale || "en-US" });
  if (opts.saved) await ctx.addInitScript(v => { try { localStorage.setItem("dashClock", v); } catch (_) {} }, opts.saved);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e)));
  await page.routeWebSocket(/api\/websocket/, ws => {
    ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw);
      if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); });
  });
  await page.goto(base + (opts.hash || ""));
  await page.waitForTimeout(1200);
  return { ctx, page, clk: () => page.evaluate(() => document.getElementById("clk").textContent.trim()) };
}
for (const c of [
  { name: "auto, en-US device", locale: "en-US", want: H12 },
  { name: "auto, en-GB device", locale: "en-GB", want: H24 },
  { name: 'config clock "24" on an en-US device', locale: "en-US", config: "24", want: H24 },
  { name: 'config clock "12" on an en-GB device', locale: "en-GB", config: "12", want: H12 },
  { name: 'saved "24" beats config "12"', locale: "en-US", config: "12", saved: "24", want: H24 },
  { name: 'saved "auto" beats config "24"', locale: "en-US", config: "24", saved: "auto", want: H12 }
]) {
  const { ctx, clk } = await open(c), t = await clk();
  ok(`${c.name}: header clock "${t}"`, c.want.test(t));
  await ctx.close();
}
// Theme page: tapping a choice changes the clock straight away and is remembered on this device
{
  const { ctx, page, clk } = await open({ locale: "en-US", hash: "#theme" });
  ok("Theme page has the Clock choices", await page.locator('button[data-clock]').count() === 3);
  ok("DEVICE is selected when nothing is saved", await page.locator('button[data-clock="auto"].on').count() === 1);
  await page.click('button[data-clock="24"]');
  await page.waitForTimeout(200);
  const t = await clk();
  ok(`tapping 24-HOUR switches the header clock ("${t}")`, H24.test(t));
  ok("24-HOUR is now selected", await page.locator('button[data-clock="24"].on').count() === 1);
  ok("the choice is saved on this device", await page.evaluate(() => localStorage.getItem("dashClock")) === "24");
  await page.reload(); await page.waitForTimeout(1200);
  const t2 = await clk();
  ok(`24-HOUR survives a reload ("${t2}")`, H24.test(t2));
  await ctx.close();
}
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error("clock-format FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`clock-format ok: ${checks} checks`);
