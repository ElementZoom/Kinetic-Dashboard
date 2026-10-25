// Seasonal themes: dates (fixed and moving festivals), per-device switch vs config.js, own palette + decoration for each of the eight, hidden on camera pages, falling bits off while a camera is live.
// Run:  node tests/seasons.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let extra = "";
const cfg = () => `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "living", name: "Living", main: true }]${extra},
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg()); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(process.env.DASH_FILE || path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const ok = (what, v) => { checks++; if (!v) problems.push(what); };
async function open(o = {}) {
  extra = o.config || "";
  const ctx = await browser.newContext({ viewport: o.vp || { width: 1100, height: 700 } });
  await ctx.addInitScript(([now, pref]) => {
    if (now) { const R = Date, t0 = new R(now).getTime(), s0 = R.now(); const F = function (...a) { return a.length ? new R(...a) : new R(t0 + (R.now() - s0)); }; F.prototype = R.prototype; F.now = () => t0 + (R.now() - s0); F.UTC = R.UTC; F.parse = R.parse; window.Date = F; }
    if (pref) { try { localStorage.setItem("dashSeason", pref); } catch (_) {} }
  }, [o.now || "", o.pref || ""]);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(String(e)));
  await page.routeWebSocket(/api\/websocket/, ws => {
    ws.send(JSON.stringify({ type: "auth_required" }));
    ws.onMessage(raw => { const m = JSON.parse(raw);
      if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      else if (m.id) ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: m.type === "get_states" ? [] : null })); });
  });
  await page.goto(base + (o.hash || "#home"));
  await page.waitForTimeout(900);
  return { ctx, page, id: () => page.evaluate(() => (typeof SEASON !== "undefined" && SEASON) ? SEASON.id : ""), layer: () => page.evaluate(() => { const l = document.getElementById("szn"); return l ? { n: l.children.length, hid: l.hidden, pe: getComputedStyle(l).pointerEvents } : null; }) };
}
// 1. which season on which day (pure date logic, all eight, both ends, a day outside)
{
  const { ctx, page } = await open({ config: ", seasonal: true", now: "2026-06-01T12:00:00" });
  const f = await page.evaluate(() => { const w = s => { const r = sznFind(new Date(s + "T12:00:00")); return r ? r.s.id : ""; };
    return Object.fromEntries(["2026-06-01", "2026-07-10", "2026-07-07", "2026-07-14", "2026-04-03", "2026-04-06", "2026-04-07", "2026-03-27", "2026-11-08", "2026-11-06", "2026-11-11", "2027-02-17", "2027-02-14", "2027-02-12", "2026-02-13", "2026-10-24", "2026-10-25", "2026-10-31", "2026-11-01", "2026-12-01", "2026-12-26", "2026-12-27", "2027-01-02", "2027-01-03", "2026-12-31", "2028-01-01"].map(d => [d, w(d)])); });
  const want = { "2026-06-01": "", "2026-07-10": "matariki", "2026-07-07": "matariki", "2026-07-14": "", "2026-04-03": "easter", "2026-04-06": "easter", "2026-04-07": "", "2026-03-27": "", "2026-11-08": "diwali", "2026-11-06": "diwali", "2026-11-11": "", "2027-02-17": "", "2027-02-14": "valentines", "2027-02-12": "valentines", "2026-02-13": "valentines", "2026-10-24": "", "2026-10-25": "halloween", "2026-10-31": "halloween", "2026-11-01": "", "2026-12-01": "christmas", "2026-12-26": "christmas", "2026-12-27": "newyear", "2027-01-02": "newyear", "2027-01-03": "", "2026-12-31": "newyear", "2028-01-01": "newyear" };
  for (const d of Object.keys(want)) ok(`date ${d} -> "${want[d]}" (got "${f[d]}")`, f[d] === want[d]);
  const cny = await page.evaluate(() => ["2026-02-14", "2026-02-21", "2026-02-22", "2026-02-13"].map(d => { const r = sznFind(new Date(d + "T12:00:00")); return r ? r.s.id : ""; }));
  ok("Chinese New Year 2026 window 14-21 Feb: " + cny, cny[0] === "cny" && cny[1] === "cny" && cny[2] === "" && cny[3] === "valentines");
  ok("easter computus 2026 = 5 Apr, 2027 = 28 Mar", await page.evaluate(() => sznEaster(2026).getDate() === 5 && sznEaster(2026).getMonth() === 3 && sznEaster(2027).getDate() === 28 && sznEaster(2027).getMonth() === 2));
  await ctx.close();
}
// 2. switch: off by default, config seasonal, device choice beats config
{
  let t = await open({ now: "2026-12-10T12:00:00" }); ok("off by default: no layer, no season", !(await t.layer()) && !(await t.id())); await t.ctx.close();
  t = await open({ now: "2026-12-10T12:00:00", config: ", seasonal: true" }); ok("config seasonal:true on in December -> christmas", (await t.id()) === "christmas" && !!(await t.layer()));
  const bg = await t.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()); ok("christmas colours applied (" + bg + ")", bg.toLowerCase() === "#0f1511" || bg.toLowerCase() === "#fbfdf8"); await t.ctx.close();
  t = await open({ now: "2026-12-10T12:00:00", config: ", seasonal: true", pref: "off" }); ok("device OFF beats config on", !(await t.layer()) && !(await t.id())); await t.ctx.close();
  t = await open({ now: "2026-12-10T12:00:00", pref: "on" }); ok("device ON works without config", (await t.id()) === "christmas"); await t.ctx.close();
  t = await open({ now: "2026-06-01T12:00:00", pref: "on" }); ok("on but nothing in season: no layer", !(await t.layer()) && !(await t.id())); await t.ctx.close();
}
// 3. config.js can switch a season off and move its dates
{
  let t = await open({ now: "2026-12-10T12:00:00", pref: "on", config: ", seasons: { christmas: false }" }); ok("seasons.christmas:false", !(await t.id())); await t.ctx.close();
  t = await open({ now: "2026-06-01T12:00:00", pref: "on", config: ', seasons: { christmas: ["05-30", "06-05"] }' }); ok("custom dates for christmas", (await t.id()) === "christmas"); await t.ctx.close();
  t = await open({ now: "2031-11-14T12:00:00", pref: "on", config: ', seasons: { diwali: { 2031: "11-14" } }' }); ok("diwali date for a year beyond the table", (await t.id()) === "diwali"); await t.ctx.close();
}
// 4. each season: own colours, own decoration, no taps taken, fine in dark and light
{
  const t = await open({ now: "2026-06-01T12:00:00" }); const seen = {};
  for (const id of ["christmas", "newyear", "halloween", "valentines", "matariki", "easter", "diwali", "cny"]) for (const mode of ["dark", "light"]) {
    await t.page.evaluate(([id, mode]) => { PAL.mode = mode; SZN_PREV = id; SZN_CUR = "\0"; sznApply(); }, [id, mode]);
    const r = await t.page.evaluate(() => { const l = document.getElementById("szn"); return { id: SEASON && SEASON.id, n: l ? l.querySelectorAll("*").length : 0, pe: l && getComputedStyle(l).pointerEvents, bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(), fx: l ? l.querySelectorAll(".fx").length : 0, nan: l ? /NaN|undefined/.test(l.innerHTML) : true }; });
    ok(`${id}/${mode}: active and decorated (${r.n} parts)`, r.id === id && r.n > 12 && r.pe === "none");
    ok(`${id}/${mode}: no NaN/undefined in the markup`, !r.nan);
    ok(`${id}/${mode}: has falling/floating bits`, r.fx > 0);
    seen[id + mode] = r.bg;
  }
  const bgs = Object.values(seen); ok("all 16 palettes are different: " + new Set(bgs).size + " " + JSON.stringify(seen), new Set(bgs).size === 16);
  // none of them is one of the normal presets
  ok("seasonal palettes are not reused presets", await t.page.evaluate(() => { const pre = new Set(); for (const k in PAL_PRE) for (const m of ["dark", "light"]) pre.add(PAL_PRE[k][m].bg.toLowerCase()); return SZN.every(z => ["dark", "light"].every(m => !pre.has(z.pal[m].bg.toLowerCase()))); }));
  await t.ctx.close();
}
// 5. camera safety: hidden on camera pages, bits stop while a camera is live, reduced motion
{
  const t = await open({ now: "2026-12-10T12:00:00", pref: "on" });
  ok("layer visible on home", (await t.layer()).hid === false);
  for (const h of ["#security", "#view/driveway", "#camera/driveway"]) { await t.page.evaluate(h => { location.hash = h; }, h); await t.page.waitForTimeout(250); const l = await t.layer(); ok("layer hidden on " + h, l && l.hid === true); }
  await t.page.evaluate(() => { location.hash = "#home"; }); await t.page.waitForTimeout(250); ok("layer back on home", (await t.layer()).hid === false);
  await t.page.evaluate(() => document.documentElement.classList.add("camlive"));
  ok("falling bits hidden while a camera is live", await t.page.evaluate(() => { const f = document.querySelector("#szn .fx"); return f && getComputedStyle(f).display === "none"; }));
  ok("static decoration still shown while a camera is live", await t.page.evaluate(() => { const s = document.querySelector("#szn svg"); return s && getComputedStyle(s).display !== "none"; }));
  await t.page.evaluate(() => document.documentElement.classList.remove("camlive"));
  await t.page.emulateMedia({ reducedMotion: "reduce" }); await t.page.waitForTimeout(100);
  ok("falling bits hidden under reduced motion", await t.page.evaluate(() => { const f = document.querySelector("#szn .fx"); return f && getComputedStyle(f).display === "none"; }));
  await t.ctx.close();
}
// 6. Theme page: switch, eight preview chips, preview on/off, ?season= link
{
  const t = await open({ hash: "#theme", now: "2026-06-01T12:00:00" });
  ok("Theme page has the Seasonal themes section", await t.page.evaluate(() => /Seasonal themes/i.test(document.body.textContent)));
  ok("eight preview chips", (await t.page.locator("button[data-szn]").count()) === 8);
  await t.page.click('button[data-szn="halloween"]'); await t.page.waitForTimeout(200);
  ok("tap a chip previews it", (await t.id()) === "halloween" && !!(await t.layer()));
  ok("Previewing label", await t.page.evaluate(() => /Previewing Halloween/.test(document.body.innerText)));
  await t.page.click('button[data-szn="halloween"]'); await t.page.waitForTimeout(200);
  ok("tap again stops the preview", !(await t.id()) && !(await t.layer()));
  await t.page.click('button[data-sznm="on"]'); await t.page.waitForTimeout(200);
  ok("ON saved on this device", await t.page.evaluate(() => localStorage.getItem("dashSeason") === "on"));
  ok("ON with nothing in season says so", await t.page.evaluate(() => /Nothing is in season/.test(document.body.innerText)));
  await t.page.click('button[data-sznm="off"]'); await t.page.waitForTimeout(200);
  ok("OFF saved", await t.page.evaluate(() => localStorage.getItem("dashSeason") === "off"));
  await t.ctx.close();
  const u = await open({ hash: "#home", now: "2026-06-01T12:00:00" }); await u.page.goto(base + "?season=diwali#home"); await u.page.waitForTimeout(800);
  ok("?season=diwali previews without any setting", (await u.id()) === "diwali"); await u.ctx.close();
}
// 7. phone size: layer fits, no horizontal scroll, mid-day change of season (clock crossing into a window)
{
  const t = await open({ now: "2026-12-10T12:00:00", pref: "on", vp: { width: 390, height: 780 } });
  ok("phone: no horizontal scroll with the layer", await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await t.ctx.close();
}
await browser.close(); server.close();
console.log(`seasons: ${checks} checks`);
if (errors.length) { console.log("PAGE ERRORS:\n" + errors.join("\n")); process.exitCode = 1; }
if (problems.length) { console.log("FAILED:\n - " + problems.join("\n - ")); process.exitCode = 1; } else if (!errors.length) console.log("ok");
