// Phone and tablet layouts that were not covered before: the Detections pop-up (card, close button and player stay on the screen, also on a landscape phone) and the
// recordings screen of the #view camera page (no Playback pill on the heading, Close X not on top of BACK, a usable player in landscape).   Run:  node tests/layout-mobile.mjs
import http from "node:http";
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }],
  cameras: [{ id: "camera.garage_test", name: "Garage" }, { id: "camera.front_test", name: "Driveway" }],
  security: [{ id: "camera.garage_test", name: "Garage" }, { id: "camera.walk_test", name: "Right walkway" }],
  playback: { "camera.front_test": {}, "camera.garage_test": {}, "camera.walk_test": {} },
  view: { driveway: { id: "camera.front_test", name: "Driveway", trig: [] }, garage: { id: "camera.garage_test", name: "Garage", trig: [] } } };`;
const html = (await import("node:fs")).readFileSync(new URL("../dash.html", import.meta.url));
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(html); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const ok = (what, cond) => { checks++; if (!cond) problems.push(what); };
const VP = { "phone portrait": [390, 844, 1], "phone landscape": [844, 390, 1], "small phone": [360, 640, 1], "small phone landscape": [640, 360, 1], "tablet portrait": [800, 1280, 0], "tablet landscape": [1280, 800, 0] };
const errors = [];
for (const [vn, [w, h, touch]] of Object.entries(VP)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await page.waitForTimeout(700);
  const det = await page.evaluate(async () => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const m = document.getElementById("dtm"); m.classList.add("on"); m.querySelector(".dtt").textContent = "Driveway · Today 4:32 pm · Person"; await new Promise(r => setTimeout(r, 300));
    const R = e => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; }; const o = { vw: innerWidth, vh: innerHeight, card: R(m.querySelector(".dtc")), close: R(m.querySelector(".evx")), video: R(m.querySelector(".dtv")), sw: document.documentElement.scrollWidth };
    m.classList.remove("on"); return o; });
  const inside = (r, e = 1) => r[0] >= -e && r[1] >= -e && r[2] <= det.vw + e && r[3] <= det.vh + e;
  ok(`${vn}: the Detections card is on the screen`, inside(det.card));
  ok(`${vn}: the Detections close button is on the screen`, inside(det.close));
  ok(`${vn}: the Detections picture is on the screen`, inside(det.video));
  ok(`${vn}: no sideways scroll with the Detections pop-up`, det.sw <= det.vw);
  await page.evaluate(() => { states["binary_sensor.front_test_person"] = { entity_id: "binary_sensor.front_test_person", state: "on", attributes: {} }; });
  const pb = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); VW.mode = ""; location.hash = "#view/driveway"; await wait(800); applyView(); detAll();
    const cam = [...document.querySelectorAll("#vw .cam")].find(c => c.style.display !== "none"); cam.classList.add("live"); await wait(400);
    const px = cam.querySelector(".px"); px.click(); await wait(900);
    const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, r: q.right, b: q.bottom }; }, vis = e => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
    const back = cam.querySelector(".pbh button, .pbh [data-pb=back]") || cam.querySelector(".pbh *"), cx = cam.querySelector(".cx");
    return { pb: cam.classList.contains("pb"), px: vis(cam.querySelector(".px")), cx: vis(cx) ? R(cx) : null, back: R(cam.querySelector(".pbh [data-pb=back]") || back), head: R(cam.querySelector(".pbh")), pbv: R(cam.querySelector(".pbv")), pbl: R(cam.querySelector(".pbl")), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth }; });
  ok(`${vn}: the recordings screen opened`, pb.pb);
  ok(`${vn}: the Playback pill is not on top of the recordings heading`, !pb.px);
  if (pb.cx) { ok(`${vn}: Close X is not on top of BACK`, !(pb.cx.x < pb.back.r && pb.cx.r > pb.back.x && pb.cx.y < pb.back.b && pb.cx.b > pb.back.y)); ok(`${vn}: Close X is at the right of the heading`, pb.cx.r > pb.vw - 40 && pb.cx.r <= pb.vw); }
  ok(`${vn}: the recording player is big enough to watch (${Math.round(pb.pbv.w)}x${Math.round(pb.pbv.h)})`, pb.pbv.h >= Math.min(150, pb.vh * .35) && pb.pbv.w >= 200);
  ok(`${vn}: the list of recordings is on the screen`, pb.pbl.h > 60 && pb.pbl.b <= pb.vh + 1);
  ok(`${vn}: no sideways scroll on the recordings screen`, pb.sw <= pb.vw);
  await ctx.close();
}
await browser.close(); server.close();
if (errors.length) problems.push("page errors: " + errors.join(" | "));
if (problems.length) { console.error("FAIL:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`mobile layouts ok: ${checks} checks`);
