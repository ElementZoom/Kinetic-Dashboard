// Marks on recordings (Playback / Detections): movement boxes, the YOLOX recogniser, tag gating, fall-back, label placement, lookahead.   Run:  node tests/detection-marks.mjs
// Needs the optional assets in /home/claude/mk-ai/ (or MK_AI=dir): ort-pkg/package/dist (onnxruntime-web), models/yolox_tiny.onnx, clips/{one,two,none}.webm (made by tools/make-clips.py
// from a sample photo, not part of this repo). Skipped when they are not there.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MK = process.env.MK_AI || "/home/claude/mk-ai";
const need = ["ort-pkg/package/dist/ort.wasm.min.js", "models/yolox_tiny.onnx", "clips/one.webm", "clips/two.webm", "clips/none.webm"];
if (need.some(f => !fs.existsSync(path.join(MK, f)))) { console.log("detection marks: skipped (assets missing in " + MK + ")"); process.exit(0); }
let CFG = "";
const mime = { ".wasm": "application/wasm", ".mjs": "text/javascript", ".js": "text/javascript", ".webm": "video/webm" };
const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); let f = null;
  if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(`window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], layout: { tablet: ["cams"], mobile: ["cams"] }, cameras: [{ id: "camera.a", name: "A" }], view: { driveway: { id: "camera.a", name: "D", trig: [] }, garage: { id: "camera.a", name: "G", trig: [] } }, ${CFG} };`); }
  if (u === "/dash.html") f = path.join(root, "dash.html"); else if (u.startsWith("/ort/")) f = path.join(MK, "ort-pkg/package/dist", u.slice(5)); else if (u.startsWith("/local/")) f = path.join(MK, "models", u.slice(7)); else if (u.startsWith("/clips/")) f = path.join(MK, "clips", u.slice(7));
  if (!f || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  const st = fs.statSync(f), ct = u === "/dash.html" ? "text/html" : mime[path.extname(f)] || "application/octet-stream", rg = /bytes=(\d+)-(\d*)/.exec(q.headers.range || "");
  if (rg) { const a = +rg[1], b = rg[2] ? +rg[2] : st.size - 1; r.writeHead(206, { "content-type": ct, "accept-ranges": "bytes", "content-range": `bytes ${a}-${b}/${st.size}`, "content-length": b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  r.writeHead(200, { "content-type": ct, "accept-ranges": "bytes", "content-length": st.size }); fs.createReadStream(f).pipe(r); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
const problems = []; let checks = 0; const errors = [];
const ok = (what, cond, info) => { checks++; if (!cond) problems.push(what + (info === undefined ? "" : ": " + JSON.stringify(info))); };
// the clips are 960x540 and shown at 640x360: where the people really are at time t (left, top, width, height in shown pixels)
const K = 640 / 960, PATCH = { one: [[60, 84]], two: [[40, 126], [141, 84]], none: [] };
const truth = (clip, t) => PATCH[clip].map(([x0, w]) => ({ x: (x0 + 150 * t) * K, y: 200 * K, w: w * K, h: 300 * K }));
const near = (a, b, dx = 110, dy = 70) => Math.abs(a.x + a.w / 2 - b.x - b.w / 2) < dx && Math.abs(a.y + a.h / 2 - b.y - b.h / 2) < dy;
const iou = (a, b) => { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h / (a.w * a.h + b.w * b.h - w * h) : 0; };
async function run(clip, tags, cfg, { from = 1.2, to = 5.4, every = 150, hook } = {}) {
  CFG = cfg; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const out = await p.evaluate(async ([clip, tags, from, to, every]) => {
    document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
    const h = document.createElement("div"); h.className = "pbv has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:640px;height:360px;z-index:99999;background:#000"; h.innerHTML = '<video muted playsinline style="width:100%;height:100%"></video>'; document.body.appendChild(h);
    const v = h.firstChild; v.muted = true; if (mkAiCfg()) { mkAiLoad(); for (let i = 0; i < 400 && MKAI.st === 1; i++) await wait(100); }   // the model is loaded before the clip starts, so the walk is not over by then
    v.src = "/clips/" + clip + ".webm"; await v.play(); mkAttach(h, tags); const S = [], t0 = Date.now(); window.__h = h;
    const snap = () => ({ t: v.currentTime, mk: h.classList.contains("mkon"), dbg: (h.querySelector(".mkd") || {}).textContent || "", boxes: [...h.querySelectorAll(".mkl .mkb")].map(n => ({ kind: n.className.replace("mkb ", ""), x: parseFloat(n.style.left), y: parseFloat(n.style.top), w: parseFloat(n.style.width), h: parseFloat(n.style.height), label: (n.firstChild || {}).textContent, em: (() => { const e = n.firstChild, q = e && e.getBoundingClientRect(); return q ? [q.left - 10, q.top - 10, q.width, q.height] : null; })() })) });
    while (v.currentTime < to && !v.ended && Date.now() - t0 < 30000) { await wait(every); if (v.currentTime >= from) S.push(snap()); }
    return { S, last: snap() }; }, [clip, tags, from, to, every]);
  if (hook) await hook(p, out); await ctx.close(); return out;
}
const person = s => s.boxes.filter(b => b.kind === "person");
const AI = `detectAI: { engine: "yolox", model: "/local/yolox_tiny.onnx", ort: "/ort/ort.wasm.min.js", size: 416, debug: true }`;

// --- the pieces on their own
{ CFG = ""; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const u = await p.evaluate(() => { const mk = (tags, ar, area, prev) => mkKind(tags, ar, area, prev), el = (t) => { const h = document.createElement("div"); h.className = "pbv has"; h.innerHTML = "<video></video>"; document.body.appendChild(h); mkAttach(h, t); return h; };
    return { one: mk(["Person"], 1, .1, ""), carWide: mk(["Person", "Vehicle"], 2, .12, ""), personSmall: mk(["Person", "Vehicle"], .4, .02, ""), keep: mk(["Person", "Vehicle"], 1.6, .06, "Person"),
      okTall: mkAiOk("Person", .8, 2, false, false), okWide: mkAiOk("Person", .95, .5, true, false), okStill: mkAiOk("Person", .6, 2.2, false, false), okMoving: mkAiOk("Person", .5, 2.2, true, false), okPaused: mkAiOk("Person", .5, 2.2, false, true), carLow: mkAiOk("Vehicle", .55, 1, true, false), carOk: mkAiOk("Vehicle", .65, 1, true, false),
      iouSame: mkIou({ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 1, h: 1 }), iouNone: mkIou({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 2, w: 1, h: 1 }),
      predNone: mkPred({}, 1000), predCap: mkPred({ vx: 1, vy: 0, t: 0 }, 5000), motionOnly: el(["Motion"]).classList.contains("mkon"), person: el(["Person"]).classList.contains("mkon") }; });
  ok("one tag is that kind", u.one === "Person"); ok("a big wide shape is a car when the camera tagged both", u.carWide === "Vehicle"); ok("a small tall shape is a person", u.personSmall === "Person"); ok("a chosen kind stays unless there is a clear reason", u.keep === "Person");
  ok("an upright sure person is let through", u.okTall); ok("a wide shape is not a person", !u.okWide); ok("standing still needs 70% sure", !u.okStill); ok("moving needs 45%", u.okMoving); ok("a paused picture needs 50%", u.okPaused); ok("a car needs 60%", !u.carLow && u.carOk);
  ok("iou", u.iouSame === 1 && u.iouNone === 0); ok("no speed means no move on", JSON.stringify(u.predNone) === "[0,0]"); ok("the move-on is capped at 0.7 s", Math.abs(u.predCap[0] - .7) < .001, u.predCap);
  ok("clips tagged only Motion are left alone", !u.motionOnly); ok("a Person clip is marked", u.person); await ctx.close(); }

// --- labels: two people close together must not wear labels on top of each other, and a label stays on the picture (also when the box is at an edge or the picture is zoomed)
{ CFG = ""; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const L = await p.evaluate(async () => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
    const h = document.createElement("div"); h.className = "pbv has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:640px;height:360px;z-index:99999;background:#000"; h.innerHTML = '<video muted playsinline style="width:100%;height:100%"></video>'; document.body.appendChild(h); const st = document.createElement("style"); st.textContent = ".mkb{transition:none!important}"; document.head.appendChild(st);   // measure where things are, not halfway through a move
    const v = h.firstChild; v.muted = true; v.src = "/clips/one.webm"; await v.play(); v.pause(); v.currentTime = 1; await wait(500); mkAttach(h, ["Person", "Vehicle"]);
    const P = (x, y, w, hh, kind) => ({ x: x, y: y, w: w, h: hh, kind: kind || "Person" }), out = {};
    const rects = () => [...h.querySelectorAll(".mkl .mkb")].map(n => { const q = n.firstChild.getBoundingClientRect(); return [q.left - 10, q.top - 10, q.right - 10, q.bottom - 10]; });
    const cases = { single: [P(.3, .3, .1, .5)], top: [P(.3, 0, .1, .5)], right: [P(.9, .3, .1, .5)], corner: [P(.9, 0, .1, .5)], pair: [P(.3, .3, .08, .5), P(.36, .3, .08, .5)], trio: [P(.3, .3, .08, .5), P(.35, .3, .08, .5), P(.4, .3, .08, .5)], pairTop: [P(.3, 0, .08, .5), P(.36, 0, .08, .5)], carAndPerson: [P(.3, .3, .08, .5), P(.33, .25, .3, .4, "Vehicle")] };
    for (const [k, B] of Object.entries(cases)) { mkDraw(h, v, B); await wait(50); out[k] = rects(); }
    h.style.setProperty("--zs", "2"); h.classList.add("zm"); mkDraw(h, v, cases.pair); await wait(50); out.zoomPair = rects(); h.classList.remove("zm"); h.style.removeProperty("--zs");
    return out; });
  const inP = r => r[0] >= -1 && r[1] >= -1 && r[2] <= 641 && r[3] <= 361, hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (const [k, R] of Object.entries(L)) { ok("labels (" + k + "): every label is on the picture", R.every(inP), R); ok("labels (" + k + "): no two labels overlap", R.every((a, i) => R.every((b, j) => j <= i || !hit(a, b))), R); } await ctx.close(); }

// --- movement only (no detectAI)
{ const o = await run("one", ["Person"], "", { from: 2.6 }); const hits = o.S.filter(s => person(s).some(b => iou(b, truth("one", s.t)[0]) > .25)).length;
  ok("movement only: a walking person is boxed most of the time", hits >= o.S.length * .6, { hits, of: o.S.length });
  const n = await run("none", ["Person"], "", { from: 2.6 }); ok("movement only: an empty scene gets no boxes", n.S.every(s => s.boxes.length === 0)); }

// --- the recogniser
{ const o = await run("one", ["Person"], AI, { from: 2.4 }); const hits = o.S.filter(s => person(s).some(b => near(b, truth("one", s.t)[0]))).length;
  ok("YOLOX: the walking person is boxed and the box sits on them", hits >= o.S.length * .7, { hits, of: o.S.length });
  ok("YOLOX: never more than one person box for one person", o.S.every(s => person(s).length <= 1), o.S.map(s => person(s).length));
  ok("the debug chip says which version runs and how long a look takes", /^v\S+ · AI \d+ms$/.test(o.last.dbg), o.last.dbg);
  const n = await run("none", ["Person"], AI, { from: 2.4 }); ok("YOLOX: an empty scene gets no boxes", n.S.every(s => s.boxes.length === 0)); ok("YOLOX: it did run", /AI \d+ms/.test(n.last.dbg), n.last.dbg);
  const wr = await run("one", ["Vehicle"], AI, { from: 2.4 }); ok("YOLOX: a clip tagged only Vehicle does not box the person", wr.S.every(s => s.boxes.length === 0)); }

// --- a paused picture: the box sits on the person standing in it (it does not run on ahead)
{ CFG = AI; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const o = await p.evaluate(async () => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
    const h = document.createElement("div"); h.className = "pbv has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:640px;height:360px;z-index:99999;background:#000"; h.innerHTML = '<video muted playsinline style="width:100%;height:100%"></video>'; document.body.appendChild(h);
    const v = h.firstChild; v.muted = true; mkAiLoad(); for (let i = 0; i < 400 && MKAI.st === 1; i++) await wait(100); v.src = "/clips/one.webm"; await v.play(); mkAttach(h, ["Person"]);
    while (v.currentTime < 3 && !v.ended) await wait(50); v.pause(); const t = v.currentTime, bx = () => [...h.querySelectorAll(".mkl .mkb")].map(n => ({ x: parseFloat(n.style.left), y: parseFloat(n.style.top), w: parseFloat(n.style.width), h: parseFloat(n.style.height) }));
    await wait(2500); const a = bx(); await wait(1500); return { t, a, b: bx() }; });
  const T = truth("one", o.t)[0]; ok("paused: one box, on the person", o.a.length === 1 && near(o.a[0], T, 45, 45), { box: o.a, truth: T });
  ok("paused: the box stays where it is", o.b.length === 1 && Math.abs(o.b[0].x - o.a[0].x) < 3, { a: o.a, b: o.b }); await ctx.close(); }

// --- the recogniser cannot load: back to the movement boxes
{ const o = await run("one", ["Person"], `detectAI: { engine: "yolox", model: "/local/missing.onnx", ort: "/ort/ort.wasm.min.js", debug: true }`, { from: 3.4 }); const hits = o.S.filter(s => person(s).some(b => iou(b, truth("one", s.t)[0]) > .25)).length;
  ok("no model file: the chip says movement only", /movement only/.test(o.last.dbg), o.last.dbg); ok("no model file: the movement boxes take over", hits >= o.S.length * .5, { hits, of: o.S.length }); }

await browser.close(); server.close();
if (errors.length) problems.push("page errors: " + errors.join(" | "));
if (problems.length) { console.error("FAIL:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`detection marks ok: ${checks} checks`);
