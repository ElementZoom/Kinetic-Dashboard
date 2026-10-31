// Climate page: the House card (big number, mode switch, 24-hour graph) and the room bottom sheet on a phone.   Run:  node tests/climate-house.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "tok", rooms: [{ id: "climate.heat_pump", name: "Heat pump", main: true }, { id: "climate.living", name: "Living" }, { id: "climate.kids", name: "Kids" }], notifTimers: [], outside: "sensor.out" };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [], errors = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const calls = [];
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
await page.routeWebSocket(/api\/websocket/, ws => { ws.send(JSON.stringify({ type: "auth_required" })); ws.onMessage(raw => { const m = JSON.parse(raw);
  if (m.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
  else if (m.type === "history/history_during_period") ws.send(JSON.stringify({ id: m.id, type: "result", success: true, result: Object.fromEntries(m.entity_ids.map((id, i) => [id, [{ s: "heat_cool", a: { current_temperature: 19 + i }, lu: Date.now() / 1000 - 80000 }, { s: "heat_cool", a: { current_temperature: 21 + i }, lu: Date.now() / 1000 - 3000 }]])) }));
  else if (m.type === "call_service" && m.domain === "climate") calls.push([m.service, m.service_data || {}]); }); });
await page.goto(`http://127.0.0.1:${server.address().port}/dash.html#home`); await page.waitForTimeout(1200);
await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true; bootDone = true; });
const S = (id, st, a) => page.evaluate(([i, s, a]) => { setState({ entity_id: i, state: s, attributes: Object.assign({ friendly_name: i }, a || {}) }); }, [id, st, a]);
const rm = ["off", "heat_cool"], modes = ["off", "heat", "cool", "heat_cool"];
await S("climate.heat_pump", "heat", { hvac_modes: modes, fan_modes: ["auto", "low"], fan_mode: "auto", current_temperature: 21.8, temperature: 23 }); await S("sensor.out", "14.6"); await S("sensor.in", "21.8");
await S("climate.living", "heat_cool", { hvac_modes: rm, current_temperature: 21.6, temperature: 23, current_humidity: 52 }); await S("climate.kids", "off", { hvac_modes: rm, current_temperature: 20, temperature: 21 });
await page.evaluate(() => { window.AN = []; document.addEventListener("animationstart", e => AN.push([performance.now(), e.animationName]), true); location.hash = "#climate"; }); await page.waitForTimeout(1500);
const t0 = await page.evaluate(() => performance.now());
const r = await page.evaluate(() => { const c = cards["climate.heat_pump"].el, g = $(".czg", c); return { cls: c.className, hm: c.dataset.hm, label: $(".lbl", c).textContent, cur: $(".cur", c).textContent, md: $(".md", c).textContent, tgt: $(".tgt", c).textContent, out: $(".cout b", c).textContent, chips: [...$$(".chip", c)].map(x => x.textContent), on: [...$$(".chip.on", c)].map(x => x.textContent), fan: $(".fanb b", c).textContent, graph: !g.hidden && !!$("path", g), cap: $("small", g).textContent, living: cards["climate.living"].el.dataset.hm, kids: cards["climate.kids"].el.dataset.hm || "", aur: document.querySelectorAll("#grid .aur").length }; });
eq("house card classes", r.cls, "card main2 czh"); eq("colour follows the heat pump", [r.hm, r.living, r.kids], ["heat", "heat", ""]); eq("label", r.label, "House"); eq("number", r.cur, "21.8");
eq("line says Heating to the target", [r.md, r.tgt], ["Heating to", "23.0°"]); eq("outside", r.out, "14.6°"); eq("fan", r.fan, "AUTO"); eq("modes + the active one", [r.chips, r.on], [["OFF", "HEAT", "COOL", "AUTO"], ["HEAT"]]);
eq("24-hour graph drawn from the recorder", r.graph, true); eq("graph is the average of the rooms (19/20 then 21/22 = 19.5 to 21.5)", /LAST 24 HOURS · 19\.5.21\.5°/.test(r.cap), true); eq("no aurora glow on the climate cards", r.aur, 0);
await S("climate.heat_pump", "cool", { hvac_modes: modes, current_temperature: 21.8, temperature: 24 }); await page.waitForTimeout(200);
eq("cooling: colour and wording follow", await page.evaluate(() => [cards["climate.heat_pump"].el.dataset.hm, $(".md", cards["climate.heat_pump"].el).textContent, cards["climate.living"].el.dataset.hm]), ["cool", "Cooling to", "cool"]);
await S("climate.heat_pump", "off", { hvac_modes: modes, current_temperature: 21.8 }); await page.waitForTimeout(200);
eq("off: no colour, stepper hidden", await page.evaluate(() => [cards["climate.heat_pump"].el.dataset.hm || "", getComputedStyle($(".czt .row", cards["climate.heat_pump"].el)).display]), ["", "none"]);
await S("climate.heat_pump", "heat", { hvac_modes: modes, current_temperature: 21.8, temperature: 23 });
// phone: a room opens as a sheet
await page.click("#grid .card.rm .md"); await page.waitForTimeout(500);
const sh = await page.evaluate(() => { const c = $("#grid .card.rm[data-open]"), b = c.getBoundingClientRect(), k = $("#clbk"); return { id: [...$$("#grid .card")].indexOf(c), bottom: Math.round(b.bottom), h: innerHeight, pos: getComputedStyle(c).position, bk: getComputedStyle(k).display, sub: $(".sub", c).textContent, body: document.body.classList.contains("cl-sheet"), x: getComputedStyle($(".shx", c)).display }; });
eq("sheet: fixed to the bottom with the dimmed background", [sh.pos, sh.bottom === sh.h, sh.bk, sh.body, sh.x], ["fixed", true, "block", true, "flex"]); eq("sheet: target and humidity line", sh.sub, "Target 23.0° · humidity 52%");
await page.click("#clbk", { position: { x: 195, y: 40 } }); await page.waitForTimeout(300);
eq("tapping the dimmed background closes it", await page.evaluate(() => [!!$("#grid .card[data-open]"), document.body.classList.contains("cl-sheet")]), [false, false]);
await page.click("#grid .card.rm .md"); await page.waitForTimeout(400); await page.click("#grid .card[data-open] .shx"); await page.waitForTimeout(300);
eq("the x closes it", await page.evaluate(() => !!$("#grid .card[data-open]")), false);
await page.click("#grid .card.rm .md"); await page.waitForTimeout(300); await page.click("#grid .card[data-open] [data-d='1']"); await page.waitForTimeout(100);
eq("buttons inside the sheet do not close it", await page.evaluate(() => !!$("#grid .card[data-open]")), true); await page.keyboard.press("Escape");
eq("Escape closes it", await page.evaluate(() => !!$("#grid .card[data-open]")), false);
// nothing replays after the entrance while states stream in
const an0 = await page.evaluate(() => AN.length);
for (let i = 0; i < 5; i++) { await S("climate.heat_pump", "heat", { hvac_modes: modes, current_temperature: 21.8 + i / 10, temperature: 23 }); await S("sensor.out", String(14.6 + i / 10)); await S("climate.living", "heat_cool", { hvac_modes: rm, current_temperature: 21.6 + i / 10, temperature: 23 }); await page.waitForTimeout(120); }
eq("no animation restarts on live updates", await page.evaluate(() => AN.length), an0);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.log("FAIL\n" + problems.join("\n")); process.exit(1); } console.log(`climate-house: ${checks} checks passed`);
