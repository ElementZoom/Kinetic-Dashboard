// The #view camera header: name + Person tag, LIVE in the corner, Playback and Close, sound / mic. Nothing may sit on anything else, phones use two rows,
// wide screens one row, and the dual view has a single Close.   Run:  node tests/view-header.mjs
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
const VP = { "phone portrait": [390, 844, 1], "phone landscape": [844, 390, 1], "tablet portrait": [800, 1280, 0], "tablet landscape": [1280, 800, 0] };
const hit = (a, b) => a && b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const errors = [];
for (const [vn, [w, h, touch]] of Object.entries(VP)) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await page.waitForTimeout(700);
  await page.evaluate(() => { document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    for (const id of ["binary_sensor.front_test_person", "binary_sensor.garage_test_person", "binary_sensor.walk_test_person"]) states[id] = { entity_id: id, state: "on", attributes: {} }; });
  for (const v of ["driveway", "garage", "both", "right-walkway"]) {
    const cams = await page.evaluate(async v => {
      VW.mode = ""; location.hash = "#view/" + v; await new Promise(r => setTimeout(r, 800)); applyView(); detAll();
      document.querySelectorAll("#vw .cam").forEach(e => { if (e.style.display !== "none") e.classList.add("live"); }); await new Promise(r => setTimeout(r, 400));
      return [...document.querySelectorAll("#vw .cam")].filter(c => c.style.display !== "none").map(cam => { const cr = cam.getBoundingClientRect(), o = { card: [cr.width, cr.height] };
        for (const k of ["lbl", "dl", "lv", "aud", "px", "cx", "fsb"]) { const e = cam.querySelector("." + k); if (!e || getComputedStyle(e).display === "none") { o[k] = null; continue; } const q = e.getBoundingClientRect(); o[k] = [q.left - cr.left, q.top - cr.top, q.width, q.height]; }
        return o; });
    }, v);
    const tag = `${vn} ${v}`, K = ["lbl", "dl", "lv", "aud", "px", "cx", "fsb"];
    cams.forEach((c, i) => {
      const bad = []; K.forEach((a, x) => K.slice(x + 1).forEach(b => { if (hit(c[a], c[b])) bad.push(a + "/" + b); }));
      ok(`${tag} card ${i}: ${bad.join(", ")} overlap`, !bad.length);
      ok(`${tag} card ${i}: Person tag is showing`, !!c.dl);
      const wide = v === "both" ? (w >= 1000 && w > h) || (w >= 700 && h > w) : w >= 700;
      if (wide) { ok(`${tag} card ${i}: one row (name, LIVE and Playback level)`, Math.abs((c.lbl[1] + c.lbl[3] / 2) - (c.px[1] + c.px[3] / 2)) < 14 && Math.abs((c.lv[1] + c.lv[3] / 2) - (c.px[1] + c.px[3] / 2)) < 14); ok(`${tag} card ${i}: sound / mic below the row`, c.aud[1] > c.lbl[1] + c.lbl[3]); }
      else { ok(`${tag} card ${i}: two rows (sound / mic below the name)`, c.aud[1] > c.lbl[1] + c.lbl[3]); ok(`${tag} card ${i}: LIVE on the name row`, Math.abs((c.lv[1] + c.lv[3] / 2) - (c.lbl[1] + c.lbl[3] / 2)) < 14); ok(`${tag} card ${i}: LIVE in the top-right corner`, c.card[0] - (c.lv[0] + c.lv[2]) <= 20); }
    });
    if (v === "both") ok(`${tag}: one Close on the two cards`, cams.filter(c => c.cx).length === 1);
    else ok(`${tag}: Close on the card`, cams.length === 1 && !!cams[0].cx);
    ok(`${tag}: the floating Close is gone`, await page.evaluate(() => getComputedStyle(document.querySelector(".vwx")).display === "none"));
  }
  await ctx.close();
}
errors.forEach(e => problems.push("page error: " + e));
await browser.close(); server.close();
if (problems.length) { console.error("VIEW HEADER FAILED\n - " + problems.join("\n - ")); process.exit(1); }
console.log(`view header ok: ${checks} checks`);
