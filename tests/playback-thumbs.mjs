// Camera playback previews: HA's own detection snapshot wins over a frame grabbed from the clip (even a saved one), and a picture that will not load is dropped for a clip frame instead of staying a broken-image icon.   Run:  node tests/playback-thumbs.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], playback: { "camera.d": "media-source://demo/d" }, detections: { snapshots: "media-source://demo/snaps" },
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAMEAYFL09IQAAAAAElFTkSuQmCC", "base64");
const server = http.createServer((q, r) => { const u = q.url.split("?")[0];
  if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); }
  if (u === "/ok.png" || u === "/thumb.png") { r.writeHead(200, { "content-type": "image/png" }); return r.end(PNG); }
  if (u !== "/dash.html") { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 390, height: 1600 } }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true;
  const d = new Date(), at = (h, m, s) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s).getTime(), FRAME = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAMEAYFL09IQAAAAAElFTkSuQmCC";
  const mk = (n, t) => ({ title: t, media_content_id: "clip-" + n, can_play: true, can_expand: false });
  const items = [mk(1, "16:30:00 0:29 Person"), mk(2, "15:06:12 0:26 Vehicle"), mk(3, "14:17:37 1:16 Person"), mk(4, "13:00:44 0:26 Vehicle"), Object.assign(mk(5, "17:10:00 0:30 Person"), { thumbnail: "/thumb.png" }), Object.assign(mk(6, "18:00:00 0:20 Person"), { thumbnail: "/thumb.png" })];
  DT.cache["s|camera.d"] = { t: Date.now(), l: [{ ts: at(14, 17, 37), id: "snap-bad" }, { ts: at(15, 6, 12), id: "snap-bad" }, { ts: at(16, 30, 0), id: "snap-ok" }, { ts: at(17, 10, 0), id: "snap-ok2" }] };
  DT.th["clip-1"] = FRAME; DT.th["clip-3"] = FRAME;   // frames saved on this device earlier
  window.send = (m, cb) => setTimeout(() => cb({ url: /^snap-ok/.test(m.media_content_id) ? "/ok.png" : m.media_content_id === "snap-bad" ? "/missing.png" : "/missing.mp4" }), 5);
  const el = document.createElement("div"); el.className = "cam pb"; el.innerHTML = '<div class="pbf"></div><div class="pbl" style="height:1500px;overflow:auto"></div>'; document.body.appendChild(el);
  const c = { id: "camera.d", o: { el: el } }; el.pb = { st: [], items: items, filter: "all", view: "grid", thumbs: DT.th, bad: {}, day: new Date(d.getFullYear(), d.getMonth(), d.getDate()) };
  pbList(c); await new Promise(r => setTimeout(r, 1800));
  return [...el.querySelectorAll(".pbth")].map(n => { const i = n.querySelector("img"); return i ? (i.getAttribute("src").slice(0, 5) === "data:" ? "frame" : i.getAttribute("src").replace(/^.*\//, "")) : "none"; });
});
eq("a saved frame, or the camera's own thumbnail, is replaced by HA's snapshot, and the camera's thumbnail is never shown while snapshots are set up; a snapshot that will not load falls back to the saved frame, or to no picture (never a broken icon)", out, ["ok.png", "none", "frame", "none", "ok.png", "none"]);
const fit = await p.evaluate(() => ["", "fs", "fs nfs", "fs nfs ls", "fs ls", "vf", "vf ls"].map(c => { const e = document.createElement("div"); e.className = "cam pb " + c; e.innerHTML = '<div class="pbl pbg"><div class="pbi pbc2"><div class="pbth"><img alt="" src="/ok.png"></div></div></div>'; document.body.appendChild(e); const i = e.querySelector("img"), r = i.getBoundingClientRect(), b = i.parentElement.getBoundingClientRect(), cs = getComputedStyle(i), ok = Math.abs(r.width - b.width) < 1 && Math.abs(r.height - b.height) < 1 && cs.objectFit === "cover"; e.remove(); return ok ? "" : c || "plain"; }).filter(Boolean));
eq("the full-screen camera rules (fs, nfs, ls, vf) do not stretch or letterbox the preview pictures", fit, []);
eq("no page errors", errors, []);
await browser.close(); server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`playback thumbs ok: ${checks} checks`);
