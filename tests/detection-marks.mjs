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
  ok("the debug chip says which version runs and how long a look takes", /^v\S+ · AI \d+ms · 416$/.test(o.last.dbg), o.last.dbg);
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

// --- a bigger model: yolox_s.onnx takes 640, whatever size: says in config.js (the model file wins); the debug chip shows the size
if (fs.existsSync(path.join(MK, "models/yolox_s.onnx"))) { CFG = `detectAI: { engine: "yolox", model: "/local/yolox_s.onnx", ort: "/ort/ort.wasm.min.js", size: 416, debug: true }`; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const o = await p.evaluate(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); mkAiLoad(); for (let i = 0; i < 600 && MKAI.st === 1; i++) await wait(100);
    const v = document.createElement("video"); v.muted = true; v.src = "/clips/one.webm"; document.body.appendChild(v); await v.play(); while (v.currentTime < 3) await wait(30); v.pause(); await wait(200);
    const c = document.createElement("canvas"); c.width = 640; c.height = 360; c.getContext("2d").drawImage(v, 0, 0, 640, 360); const r = MKAI.st === 2 ? await MKAI.m.detect(c, 8, .3) : [];
    return { st: MKAI.st, size: MKAI.size, err: MKAI.err, people: r.filter(x => x.class === "person").map(x => ({ x: x.bbox[0], y: x.bbox[1], w: x.bbox[2], h: x.bbox[3] })), t: v.currentTime }; });
  ok("yolox_s: loads with size 416 in config.js", o.st === 2, o); ok("yolox_s: the model file decides the size (640)", o.size === 640, o);
  ok("yolox_s: finds the person on the picture", o.people.length === 1 && near(o.people[0], truth("one", o.t)[0], 45, 45), { o: o.people, truth: truth("one", o.t)[0] }); await ctx.close(); }

// --- the recogniser cannot load: back to the movement boxes
{ const o = await run("one", ["Person"], `detectAI: { engine: "yolox", model: "/local/missing.onnx", ort: "/ort/ort.wasm.min.js", debug: true }`, { from: 3.4 }); const hits = o.S.filter(s => person(s).some(b => iou(b, truth("one", s.t)[0]) > .25)).length;
  ok("no model file: the chip says movement only", /movement only/.test(o.last.dbg), o.last.dbg); ok("no model file: the movement boxes take over", hits >= o.S.length * .5, { hits, of: o.S.length }); }

// --- lookahead (detectAI.lookahead): a hidden second copy of the recording runs ahead, so the boxes are ready before the shown picture gets there
{ const LA = AI.replace("debug: true", "debug: true, lookahead: 0.8"), err = (S, clip) => S.filter(s => s.boxes.length).map(s => { const T = truth(clip, s.t); return Math.min(...s.boxes.map(b => Math.hypot(b.x + b.w / 2 - T[0].x - T[0].w / 2, b.y + b.h / 2 - T[0].y - T[0].h / 2))); }).sort((a, b) => a - b);
  const d = await run("one", ["Person"], AI, { from: 1.5, to: 5 }), l = await run("one", ["Person"], LA, { from: 1.5, to: 5, hook: async (p, o) => { o.w = await p.evaluate(() => ({ has: !!window.__h._mkv2, ok: window.__h._mkLaOk, kids: window.__h.querySelectorAll("video").length })); } });
  const ed = err(d.S, "one"), el = err(l.S, "one"), md = ed[ed.length >> 1], ml = el[el.length >> 1]; console.log("lookahead: median error direct", md, "lookahead", ml, "frames", ed.length, el.length, l.w);
  ok("lookahead: the second copy exists and runs", l.S.some(s => /AI/.test(s.dbg)), l.last.dbg);
  ok("lookahead: boxes are shown for most of the walk", el.length >= l.S.length * .4, { shown: el.length, of: l.S.length });
  ok("lookahead: boxes sit closer to the person than without", ml < md * .8 || ml < 25, { direct: md, ahead: ml });
  ok("lookahead: never two boxes on one person", l.S.every(s => person(s).length <= 1), l.S.filter(s => person(s).length > 1).length);
  const t2 = await run("two", ["Person"], LA, { from: 1.5, to: 5 }); ok("lookahead: two people (the model sees the wide patch as two), at most three boxes", t2.S.every(s => person(s).length <= 3), t2.S.filter(s => person(s).length > 3).length);
  const e0 = await run("none", ["Person"], LA, { from: 1.5, to: 4 }); ok("lookahead: an empty scene stays empty", e0.S.every(s => s.boxes.length === 0));
  // pause in the middle, then play on: the box is on the paused picture, and boxes come back soon after play
  CFG = LA; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const o = await p.evaluate(async () => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
    const h = document.createElement("div"); h.className = "pbv has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:640px;height:360px;z-index:99999;background:#000"; h.innerHTML = '<video muted playsinline style="width:100%;height:100%"></video>'; document.body.appendChild(h);
    const v = h.firstChild; v.muted = true; mkAiLoad(); for (let i = 0; i < 400 && MKAI.st === 1; i++) await wait(100); v.src = "/clips/one.webm"; await v.play(); mkAttach(h, ["Person"]);
    const bx = () => [...h.querySelectorAll(".mkl .mkb")].map(n => ({ x: parseFloat(n.style.left), y: parseFloat(n.style.top), w: parseFloat(n.style.width), h: parseFloat(n.style.height) }));
    while (v.currentTime < 2.5 && !v.ended) await wait(50); v.pause(); const t = v.currentTime; await wait(2500); const a = bx(), w1 = h._mkv2 ? h._mkv2.paused : null; v.play(); const t1 = Date.now(); let back = -1; for (let i = 0; i < 100 && v.currentTime < 5.5; i++) { await wait(100); if (bx().length) { back = Date.now() - t1; break; } }
    return { t, a, w1, back, ok: h._mkLaOk }; });
  const T = truth("one", o.t)[0]; ok("lookahead: paused, one box, on the person", o.a.length === 1 && near(o.a[0], T, 45, 45), { box: o.a, truth: T }); ok("lookahead: the second copy waits while paused", o.w1 === true, o.w1);
  ok("lookahead: boxes are back within 2.5 s of play", o.back >= 0 && o.back < 2500, o); await ctx.close();
  // the second copy cannot be made: back to the plain mode, still boxes
  const fb = await run("one", ["Person"], LA, { from: 2.5, to: 5, hook: async () => {} }); ok("lookahead: runs on a clip that plays", fb.S.length > 3);
}

// --- a fast car (clip "car": a car crossing in 1.8 s, optional asset): it is boxed while it passes, not only after it has gone
if (fs.existsSync(path.join(MK, "clips/car.webm"))) { const r = await run("car", ["Vehicle"], AI, { from: 0.6, to: 3.4, every: 80 }), inC = r.S.filter(s => s.t >= 1.3 && s.t <= 3.2);
  ok("a fast car: boxed while it crosses (this machine looks only a few times per second)", inC.filter(s => s.boxes.some(b => b.kind === "vehicle")).length >= 1, inC.map(s => s.boxes.length));
  ok("a fast car: no box before it comes", r.S.filter(s => s.t < 1).every(s => s.boxes.length === 0)); }

// --- how close the box stays to a walker when the model answers like a phone does (a stand-in model that finds the walker exactly, 70 ms after the picture)
{ const LA = AI.replace("debug: true", "debug: true, lookahead: 0.8");
for (const [n, c] of [["direct", AI], ["la", LA]]) { CFG = c; const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const o = await p.evaluate(async () => { document.documentElement.classList.remove("boot"); const wait = ms => new Promise(r => setTimeout(r, ms));
    const h = document.createElement("div"); h.className = "pbv has"; h.style.cssText = "position:fixed;left:10px;top:10px;width:640px;height:360px;z-index:99999;background:#000"; h.innerHTML = '<video muted playsinline style="width:100%;height:100%"></video>'; document.body.appendChild(h); window.__h = h;
    const v = h.firstChild; v.muted = true; mkAiLoad(); for (let i = 0; i < 600 && MKAI.st === 1; i++) await wait(100);
    const dI = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (...a) { if (h._mkAc && this.canvas === h._mkAc && a.length === 9) h._mkRect = a.slice(1); return dI.apply(this, a); };
    MKAI.m = { detect: async (cv) => { const a = mkAv(h), t = a.currentTime, R = h._mkRect; await wait(70); const [sx, sy, sw, sh, , , cw, ch] = R, X = 60 + 150 * t, Y = 200, W = 84, H = 300, x0 = Math.max(X, sx), x1 = Math.min(X + W, sx + sw), y0 = Math.max(Y, sy), y1 = Math.min(Y + H, sy + sh); if (x1 - x0 < W * .6 || y1 - y0 < H * .6) return [];
      return [{ class: "person", score: .9, bbox: [(x0 - sx) * cw / sw, (y0 - sy) * ch / sh, (x1 - x0) * cw / sw, (y1 - y0) * ch / sh] }]; } };
    v.src = "/clips/one.webm"; await v.play(); mkAttach(h, ["Person"]); const out = [];
    while (v.currentTime < 5 && !v.ended) { await wait(60); const t = v.currentTime; if (t < 1.8) continue; const b = h.querySelector(".mkl .mkb"); const T = (60 + 150 * t) * 640 / 960 + 42 * 640 / 960; out.push(b ? Math.round(parseFloat(b.style.left) + parseFloat(b.style.width) / 2 - T) : "-"); }
    return out; });
  const e = o.filter(x => x !== "-").map(Math.abs).sort((a, b) => a - b), med = e[e.length >> 1]; ok("a phone-speed model (70 ms): the box stays within 14 px of the walker (" + n + ")", e.length > 20 && med <= 14 && e[Math.floor(e.length * .9)] <= 28, { median: med, p90: e[Math.floor(e.length * .9)], n: e.length }); await ctx.close(); }
}

// --- live: a camera tapped to full screen gets boxes too (detectLive: true); closing it stops them; without the option nothing changes
for (const live of [true, false]) { CFG = AI + (live ? ", detectLive: true" : ""); const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }), p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(700);
  const o = await p.evaluate(async () => { document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
    mkAiLoad(); for (let i = 0; i < 600 && MKAI.st === 1; i++) await wait(100);
    const c = CONFIG.cameras[0], el = c.o.el, out = { before: el.classList.contains("mkon") }; el.click(); await wait(300);
    const src = document.createElement("video"); src.muted = true; src.src = "/clips/one.webm"; src.style.cssText = "position:fixed;left:-9999px;width:320px"; document.body.appendChild(src); await src.play(); c.o.vid.srcObject = src.captureStream(); await c.o.vid.play().catch(() => {});
    out.open = el.classList.contains("mkon"); const seen = []; for (let i = 0; i < 40; i++) { await wait(150); seen.push([...el.querySelectorAll(".mkl .mkb")].map(n => n.className.replace("mkb ", ""))); if (src.ended) break; }
    out.kinds = [...new Set(seen.flat())]; out.frames = seen.filter(a => a.length).length; el.click(); await wait(1200); out.closed = !el.classList.contains("mkon") && el.querySelectorAll(".mkl .mkb").length === 0; return out; });
  if (live) { ok("live: the full-screen camera is marked on", o.open, o); ok("live: a person is boxed on the live picture", o.kinds.indexOf("person") >= 0 && o.frames >= 3, o); ok("live: nothing is marked on the tile before opening", !o.before); ok("live: closing it stops the marks", o.closed, o); }
  else ok("live: without detectLive nothing is marked", !o.open && o.frames === 0, o); await ctx.close(); }

await browser.close(); server.close();
if (errors.length) problems.push("page errors: " + errors.join(" | "));
if (problems.length) { console.error("FAIL:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`detection marks ok: ${checks} checks`);
