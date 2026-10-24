// Full-screen camera: pinch to zoom, drag to move, tap while zoomed to reset; a pinch or drag never closes the card.   Run:  node tests/camera-zoom.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let off = false;
const cfg = () => `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], layout: { tablet: ["cams"], mobile: ["cams"] }, ${off ? "camZoom: false," : ""}
  cameras: [{ id: "camera.a", name: "A" }, { id: "camera.b", name: "B" }],
  view: { driveway: { id: "camera.a", name: "D", trig: [] }, garage: { id: "camera.b", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg()); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
async function run() {
  const p = await browser.newPage({ viewport: { width: 1100, height: 800 } }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
  const out = await p.evaluate(async () => {
    document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
    const wait = ms => new Promise(r => setTimeout(r, ms)), el = document.querySelector("#cams .cam"), img = el.querySelector("img"), r = {};
    const pe = (t, id, x, y) => img.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true }));
    const zs = () => +(el.style.getPropertyValue("--zs") || 1), zx = () => parseFloat(el.style.getPropertyValue("--zx") || 0);
    el.click(); await wait(500); r.fs = el.classList.contains("fs");
    pe("pointerdown", 1, 500, 300); pe("pointerdown", 2, 600, 300); pe("pointermove", 2, 800, 300); await wait(30);
    r.pinch = { zoomed: el.classList.contains("zm"), s: Math.round(zs() * 10) / 10 }; r.moves = getComputedStyle(img).transform !== "none";
    pe("pointerup", 1, 500, 300); pe("pointerup", 2, 800, 300); img.click(); await wait(60);
    r.afterPinchTap = { open: el.classList.contains("fs") && !el.classList.contains("fclose"), zoomed: el.classList.contains("zm") };
    await wait(500); const x0 = zx();
    pe("pointerdown", 3, 500, 400); pe("pointermove", 3, 460, 380); pe("pointerup", 3, 460, 380); await wait(30); r.pan = Math.round(zx() - x0); await wait(500);
    img.click(); await wait(60); r.tapReset = { zoomed: el.classList.contains("zm"), open: el.classList.contains("fs") && !el.classList.contains("fclose"), var: el.style.getPropertyValue("--zs") };
    pe("pointerdown", 1, 500, 300); pe("pointerdown", 2, 600, 300); pe("pointermove", 2, 5000, 300); await wait(30); r.max = zs(); pe("pointerup", 1, 0, 0); pe("pointerup", 2, 0, 0); await wait(500); img.click(); await wait(500);
    img.click(); await wait(60); r.closing = el.classList.contains("fclose"); await wait(500); r.closed = !el.classList.contains("fs") && !el.classList.contains("zm");
    r.players = {};
    for (const cls of ["pbv", "dtv"]) {   // the recording players: camera Playback and Detections
      const h = document.createElement("div"); h.className = cls + " has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:400px;height:300px;z-index:99;background:#000"; h.innerHTML = '<video controls src="/none.mp4" style="width:100%;height:100%"></video>'; document.body.appendChild(h); await wait(300);   // let the video start loading (that fires loadstart once)
      const v = h.firstChild, pv = (t, id, x, y) => v.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true }));
      pv("pointerdown", 1, 150, 100); pv("pointerdown", 2, 250, 100); pv("pointermove", 2, 350, 100); await wait(30);
      const z = { zoomed: h.classList.contains("zm"), s: Math.round(+(h.style.getPropertyValue("--zs") || 1) * 10) / 10, scaled: getComputedStyle(v).transform !== "none" };
      pv("pointerup", 1, 150, 100); pv("pointerup", 2, 350, 100); await wait(500); czReset(h);
      pv("pointerdown", 1, 150, 290); pv("pointerdown", 2, 250, 290); pv("pointermove", 2, 350, 290); await wait(30);   // over the play bar: left to the video's own controls
      z.playBar = h.classList.contains("zm") ? 1 : 0; pv("pointerup", 1, 0, 0); pv("pointerup", 2, 0, 0);
      v.setAttribute("src", "/other.mp4"); v.dispatchEvent(new Event("loadstart")); z.newClip = h.classList.contains("zm") ? 0 : 1;
      r.players[cls] = z; h.remove();
    }
    return r;
  });
  await p.close(); return { out, errors };
}
let { out, errors } = await run();
eq("tapping a camera opens it full screen", out.fs, true);
eq("two fingers moving apart 100 to 300 px zoom 3x", out.pinch, { zoomed: true, s: 3 });
eq("the picture itself is scaled (the buttons are not)", out.moves, true);
eq("lifting the fingers after a pinch does not close the card or reset the zoom", out.afterPinchTap, { open: true, zoomed: true });
eq("one finger moves the zoomed picture (40 px left)", out.pan, -40);
eq("a tap while zoomed resets the zoom and does not close the card", out.tapReset, { zoomed: false, open: true, var: "" });
eq("zoom stops at 6x", out.max, 6);
eq("a tap on the unzoomed picture still closes the card", out.closing, true);
eq("the card is closed and the zoom cleared", out.closed, true);
eq("the Playback and Detections players zoom too, but not over their own play bar, and a new clip starts unzoomed", out.players, { pbv: { zoomed: true, s: 2, scaled: true, playBar: 0, newClip: 1 }, dtv: { zoomed: true, s: 2, scaled: true, playBar: 0, newClip: 1 } });
eq("no page errors", errors, []);
off = true; ({ out } = await run());
eq("camZoom: false turns it off", out.pinch, { zoomed: false, s: 1 });
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`camera zoom ok: ${checks} checks`);
