// Media page on a phone: compact player card, lyrics icon + sheet, one normal page scroll.   Run:  node tests/media-phone.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], media: ["media_player.a", "media_player.b"],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
async function open(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  p.on("pageerror", e => errors.push(String(e)));
  await p.goto(url); await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
    st("media_player.a", "playing", { friendly_name: "Living Area", media_title: "Hold My Hand", media_artist: "Michael Jackson", media_album_name: "Michael", media_duration: 200, media_position: 10, media_position_updated_at: new Date().toISOString() });
    st("media_player.b", "idle", { friendly_name: "Master Bedroom" });
    window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ syncedLyrics: "[00:01.00] Line one\n[00:05.00] Line two\n[00:09.00] Line three" }) });
    location.hash = "#media";
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => { drawMedia(); lyrUpdate(); }); await p.waitForTimeout(500);
  return p;
}
let p = await open(390, 800);
const box = s => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { top: Math.round(r.top), h: Math.round(r.height), disp: c.display, pos: c.position }; }, s);
const card = await box("#mp .mpc.pl"), second = await box("#mp .mpc.idle");
eq("phone: the playing card is compact", card.h < 300, true);
eq("phone: the second speaker card is visible under it", second && second.top < 800 - 110, true);
eq("phone: lyrics icon on the card, lyrics sheet hidden", [(await box("#mp .mpc.pl .mly")).disp, (await box("#lyr")).disp], ["flex", "none"]);
eq("phone: no sideways pager or inner scroller", await p.evaluate(() => [getComputedStyle(document.querySelector(".mlay")).overflowX, getComputedStyle(document.querySelector("#mp")).overflowY]), ["visible", "visible"]);
await p.click("#mp .mly"); await p.waitForTimeout(600);
eq("phone: the icon opens the lyrics as a sheet", await p.evaluate(() => [document.body.classList.contains("ly-open"), getComputedStyle(document.querySelector("#lyr")).position, document.querySelectorAll("#lyr .ly").length, !!document.querySelector("#lyr .lyf [data-mp=pp]")]), [true, "fixed", 3, true]);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + "_ly.png" });
await p.click("#lyr .lyx"); await p.waitForTimeout(300);
eq("phone: the close button closes the sheet", await p.evaluate(() => document.body.classList.contains("ly-open")), false);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + "_card.png" });
await p.click("#mp .mly"); await p.waitForTimeout(400); await p.mouse.click(195, 40); await p.waitForTimeout(300);
eq("phone: tapping outside closes it too", await p.evaluate(() => document.body.classList.contains("ly-open")), false);
await p.close();
p = await open(1200, 800);
eq("wide: no lyrics icon, lyrics stay beside the player", await p.evaluate(() => [getComputedStyle(document.querySelector("#mp .mly")).display, getComputedStyle(document.querySelector("#lyr")).display]), ["none", "block"]);
await p.close();
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`media phone ok: ${checks} checks`);
