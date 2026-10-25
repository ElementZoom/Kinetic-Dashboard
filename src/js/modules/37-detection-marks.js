// ---------- Playback / Detections: mark the person or car that moves ----------
// Needs no extra software: the picture is compared with the one a moment ago, and a box follows whatever changed. It only runs for clips the camera tagged Person / Vehicle / Animal, so wind and shadows in plain "Motion" clips are left alone.
// config.js: detectMark: "brackets" (default) | "box" | "glow" | false
// config.js: detectAI: true  adds a small object-detection model (TensorFlow.js COCO-SSD, loaded from the internet the first time; nothing is sent anywhere, the picture is only looked at on this device). The movement only says where to look; the model decides what is a person / car / animal, so shadows and light changes stop counting. Needs internet on the viewing device, otherwise the movement boxes are used.
//   detectAI: { engine: "yolox", model: "/local/yolox_tiny.onnx" }  uses a YOLOX model (more exact, Apache-2.0, file hosted by you; onnxruntime-web is loaded from the internet). yolox_s.onnx finds smaller / further people but is slower (about 4x tiny); the picture size comes from the model file (416 for nano and tiny, 640 for s)
//   detectAI: { base: "mobilenet_v2" }  (bigger, more exact)   or   { model: "https://…/model.json", tf: "https://…/tf.min.js", coco: "https://…/coco-ssd.min.js" } to host the files yourself
const mkSrc = v => v.getAttribute("src") || v.srcObject;   // a recording has a web address; a live camera is a stream
const mkStyle = () => { const m = CONFIG.detectMark; return m === false ? "" : m === "box" || m === "glow" ? m : "brackets"; };
const MKN = { Person: "Person", Vehicle: "Car", Animal: "Animal" };
function mkKind(types, ar, area, prev) {   // which of the camera's tags a box is. One tag: that. Several: a big wide shape is a car, a small one a person (or an animal when wide); once chosen it only changes for a clear reason
  if (types.length === 1) return types[0];
  const veh = types.indexOf("Vehicle") > -1, oth = types.filter(t => t !== "Vehicle"), per = types.indexOf("Person") > -1;
  if (veh && oth.length) { const big = prev === "Vehicle" ? !(area < .03 || ar < .9) : area >= .07 && ar > 1.3; return big ? "Vehicle" : mkSmall(oth, ar, per); }
  return prev || types[0];
}
const mkSmall = (oth, ar, per) => per && !(ar > 1.5 && oth.length > 1) ? "Person" : oth.length > 1 && ar > 1.2 ? oth.filter(t => t !== "Person")[0] || "Person" : oth[0];
function mkAttach(el, tags) {   // el = .pbv or .dtv; call each time a clip is loaded
  const v = el && el.querySelector("video:not(.mkw)"), st = mkStyle(); if (!v) return;
  el._mkTags = (tags || []).filter(t => MKN[t]); el._mkv = v; el.dataset.mk = st; el._mkTok = (el._mkTok || 0) + 1; el._mkAiBusy = 0; el._mkD = []; el._mkPT = -1; el._mkLaOff = 0; el._mkLaBad = 0; el._mkLaOk = 0;
  mkClear(el); const on = st && el._mkTags.length; el.classList.toggle("mkon", !!on);
  if (!on) { if (el._mkg) el._mkg.innerHTML = ""; mkLaSync(el); return; }
  if (!el._mk) { el._mk = document.createElement("div"); el._mk.className = "mkl"; el._mkg = document.createElement("div"); el._mkg.className = "mkg"; el.append(el._mk, el._mkg); ["seeked", "emptied", "loadstart", "ended"].forEach(n => v.addEventListener(n, () => mkClear(el))); }
  el._mkg.innerHTML = st === "glow" ? el._mkTags.map(t => '<span class="' + t.toLowerCase() + '">' + MKN[t] + '</span>').join("") : "";
  if (!el._mkT) el._mkT = setTimeout(() => mkTick(el), 200);
  mkDbg(el);
  if (mkAiOn()) { mkAiLoad(); if (!el._mkAiT) el._mkAiT = setTimeout(() => mkAiRun(el), 300); }
}
function mkLiveOn(el) {   // detectLive: true (needs detectAI): a camera that is full screen gets the same boxes as a recording, for every kind the model knows
  if (el._mkLive || !CONFIG.detectLive || !mkAiCfg() || !mkStyle()) return; el._mkLive = 1; mkAttach(el, ["Person", "Vehicle", "Animal"]);
}
function mkLiveOff(el) { if (!el._mkLive) return; el._mkLive = 0; mkAttach(el, []); }
function mkClear(el) { el._mkS = null; el._mkB = []; el._mkD = []; el._mkG = []; el._mkPD = -1; el._mkTok = (el._mkTok || 0) + 1; if (el._mk) el._mk.innerHTML = ""; }
function mkTick(el) {
  el._mkT = 0; if (!el.isConnected) return;
  const v = mkAv(el); el._mkT = setTimeout(() => mkTick(el), 130);
  if (!el.classList.contains("mkon") || !mkSrc(v) || v.paused || v.ended || v.seeking || v.readyState < 2 || !v.videoWidth || !v.offsetWidth || document.hidden) return;
  try { mkStep(el, v); } catch (e) { el.classList.remove("mkon"); mkClear(el); }   // a picture the page may not read (other web address without permission): the labels stay, the boxes are off
}
function mkStep(el, v) {   // learns what the empty scene looks like and boxes what is different from it, ignoring the whole picture getting lighter or darker
  const cw = 240, ch = Math.max(16, Math.round(cw * v.videoHeight / v.videoWidth)), C = 4, gx = Math.ceil(cw / C), gy = Math.ceil(ch / C), N = cw * ch;
  const cv = el._mkc || (el._mkc = document.createElement("canvas")); cv.width = cw; cv.height = ch;
  const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(v, 0, 0, cw, ch);
  const d = cx.getImageData(0, 0, cw, ch).data, r0 = new Float32Array(N), g = new Float32Array(N); for (let i = 0, j = 0; i < d.length; i += 4, j++) r0[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) / 256;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { let t = 0, c = 0; for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= ch) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= cw) continue; t += r0[yy * cw + xx]; c++; } } g[y * cw + x] = t / c; }   // 3x3 average: video noise and compression blocks fade out
  let S = el._mkS; if (!S || S.len !== N) { el._mkS = { len: N, bg: Float32Array.from(g), prev: g, noise: 3 }; el._mkB = []; return; }
  const bg = S.bg; let gs = 0, gn = 0; for (let i = 0; i < N; i += 3) { const dd = g[i] - bg[i]; if (dd < 25 && dd > -25) { gs += dd; gn++; } } const gain = gn ? gs / gn : 0, T = Math.max(20, S.noise * 3.5);   // gain: the camera's exposure moved
  const cnt = new Uint16Array(gx * gy), mc = new Uint16Array(gx * gy); let nz = 0, nn = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const k = y * cw + x, dd = g[k] - bg[k] - gain, ad = dd < 0 ? -dd : dd, fg = ad > T; if (fg) cnt[((y / C) | 0) * gx + ((x / C) | 0)]++; else { nz += ad; nn++; }
    const mv = Math.abs(g[k] - S.prev[k]); if (mv > 14) mc[((y / C) | 0) * gx + ((x / C) | 0)]++; bg[k] += (g[k] - bg[k]) * (!fg ? .05 : mv < 6 ? .1 : .008); }   // what keeps still is slowly taken into the background (a parked car, a person who stopped, where someone used to be)
  if (nn) S.noise += (nz / nn - S.noise) * .1; S.prev = g;
  const heat = S.heat && S.heat.length === gx * gy ? S.heat : (S.heat = new Float32Array(gx * gy)); S.gx = gx; S.gy = gy; for (let i = 0; i < heat.length; i++) heat[i] = mc[i] >= 2 ? 1 : heat[i] * .9;   // a longer memory of where things moved (about 2 s), for the model to check against
  const me = S.me && S.me.length === gx * gy ? S.me : (S.me = new Float32Array(gx * gy)); for (let i = 0; i < me.length; i++) me[i] = mc[i] >= 2 ? 1 : me[i] * .5;   // where something moved in the last half second
  const near = new Uint8Array(gx * gy); for (let k = 0; k < me.length; k++) if (me[k] > .2) { const x = k % gx, y = (k / gx) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < gx && b < gy) near[b * gx + a] = 1; } }
  const on = new Uint8Array(gx * gy); let act = 0, all = 0; for (let i = 0; i < on.length; i++) if (cnt[i] >= (mkAiOn() ? 3 : 5)) { all++; if (near[i]) { on[i] = 1; act++; } }   // different from the empty scene AND moving: the trail left where a car just was (still in the background picture for a few seconds) is not an object
  if (all > on.length * 0.45) { S.bg = Float32Array.from(g); el._mkB = []; return; }   // the whole picture changed (light, scene change): start again
  const dm = new Uint8Array(gx * gy); for (let k = 0; k < on.length; k++) if (on[k]) { const x = k % gx, y = (k / gx) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < gx && b < gy) dm[b * gx + a] = 1; } }
  const seen = new Uint8Array(gx * gy), comps = [];
  for (let s0 = 0; s0 < on.length; s0++) { if (!on[s0] || seen[s0]) continue; const st = [s0]; seen[s0] = 1; let n = 0, x0 = gx, x1 = 0, y0 = gy, y1 = 0, px = 0;
    while (st.length) { const k = st.pop(), x = k % gx, y = (k / gx) | 0; if (on[k]) { n++; px += cnt[k]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy, q = b * gx + a; if (a >= 0 && b >= 0 && a < gx && b < gy && dm[q] && !seen[q]) { seen[q] = 1; st.push(q); } } }
    if (n >= (mkAiOn() ? 2 : 4) || (n >= 3 && px >= 36)) comps.push({ x0: x0, x1: x1, y0: y0, y1: y1, n: n }); }
  for (let ch2 = 1; ch2;) { ch2 = 0; for (let i = 0; i < comps.length && !ch2; i++) for (let j = i + 1; j < comps.length && !ch2; j++) { const a = comps[i], b = comps[j]; if (a.x0 - 4 <= b.x1 && b.x0 - 4 <= a.x1 && a.y0 - 3 <= b.y1 && b.y0 - 3 <= a.y1) { a.x0 = Math.min(a.x0, b.x0); a.x1 = Math.max(a.x1, b.x1); a.y0 = Math.min(a.y0, b.y0); a.y1 = Math.max(a.y1, b.y1); a.n += b.n; comps.splice(j, 1); ch2 = 1; } } }   // bits close together are one object
  const found = comps.map(c => { const l = Math.max(0, c.x0 * C - 2), t = Math.max(0, c.y0 * C - 2), rr = Math.min(cw, (c.x1 + 1) * C + 2), bb = Math.min(ch, (c.y1 + 1) * C + 2); return { n: c.n, x: l / cw, y: t / ch, w: (rr - l) / cw, h: (bb - t) / ch }; }).sort((a, b) => b.n - a.n);
  const B = el._mkB || (el._mkB = []); B.forEach(b => b.hit = 0);
  found.slice(0, 3).forEach(f => { let best = null, bd = .25; B.forEach(b => { if (b.hit) return; const dd = Math.hypot(b.x + b.w / 2 - f.x - f.w / 2, b.y + b.h / 2 - f.y - f.h / 2); if (dd < bd) { bd = dd; best = b; } });
    const ar = f.w * v.videoWidth / (f.h * v.videoHeight), ty = el._mkTags;
    if (best) { ["x", "y", "w", "h"].forEach(k => best[k] += (f[k] - best[k]) * .6); best.hit = 1; best.ttl = 5; best.age++; best.ar += (ar - best.ar) * .25; best.area += (f.w * f.h - best.area) * .25; best.kind = mkKind(ty, best.ar, best.area, best.kind); }
    else B.push({ x: f.x, y: f.y, w: f.w, h: f.h, hit: 1, ttl: 5, age: 1, ar: ar, area: f.w * f.h, kind: mkKind(ty, ar, f.w * f.h, "") }); });
  B.forEach(b => { if (!b.hit && B.some(o => o.hit && b.x + b.w / 2 > o.x - .02 && b.x + b.w / 2 < o.x + o.w + .02 && b.y + b.h / 2 > o.y - .02 && b.y + b.h / 2 < o.y + o.h + .02)) b.ttl = 0; });   // a leftover half of an object that is now seen whole
  B.forEach(b => { if (!b.hit) b.ttl--; }); el._mkB = B.filter(b => b.ttl > 0);
  if (mkAiOn() || el._mkLive) return;   // the model draws (once it is up); until it has failed nothing is drawn from movement alone
  const B0 = (el._mkB || []).filter(b => b.age >= 3).sort((a, b) => b.w * b.h - a.w * a.h); mkDraw(el, v, B0.filter((b, i) => i < 2 && b.w * b.h >= B0[0].w * B0[0].h * .3));
}
const MKC = { person: "Person", car: "Vehicle", truck: "Vehicle", bus: "Vehicle", motorcycle: "Vehicle", bicycle: "Vehicle", dog: "Animal", cat: "Animal", bird: "Animal", horse: "Animal", sheep: "Animal", cow: "Animal", bear: "Animal" };
const MKAI = { st: 0, m: null, slow: 0 };   // st: 0 not asked yet, 1 loading, 2 ready, -1 not available (offline, blocked, too slow)
const mkAiCfg = () => { const a = CONFIG.detectAI; return a ? (typeof a === "object" ? a : {}) : null; };
const mkAiOn = () => !!mkAiCfg() && MKAI.st !== -1;
const MKY = ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear"];   // the first COCO classes: all the ones used
function mkYolox(ort, session, S) {   // YOLOX (Apache-2.0): picture in as 0-255 BGR on a grey square, raw grid out; decoded and merged here
  const cv = document.createElement("canvas"); cv.width = cv.height = S; const cx = cv.getContext("2d", { willReadFrequently: true }), f = new Float32Array(3 * S * S), N = S * S;
  const grids = []; [8, 16, 32].forEach(st => { const n = S / st; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) grids.push([x, y, st]); });
  return { size: S, async detect(src) {
    const r = Math.min(S / src.width, S / src.height), nw = Math.round(src.width * r), nh = Math.round(src.height * r);
    cx.fillStyle = "rgb(114,114,114)"; cx.fillRect(0, 0, S, S); cx.drawImage(src, 0, 0, nw, nh); const d = cx.getImageData(0, 0, S, S).data;
    for (let i = 0; i < N; i++) { f[i] = d[i * 4 + 2]; f[N + i] = d[i * 4 + 1]; f[2 * N + i] = d[i * 4]; }
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", f, [1, 3, S, S]) }), o = out[session.outputNames[0]].data, K = o.length / grids.length, C = K - 5, cand = [];
    for (let i = 0; i < grids.length; i++) { const b = i * K, ob = o[b + 4]; if (ob < .1) continue; let bc = 0, bs = 0; for (let c = 0; c < Math.min(C, 24); c++) { const sc = o[b + 5 + c]; if (sc > bs) { bs = sc; bc = c; } } const sc = ob * bs; if (sc < .3 || !MKY[bc]) continue;
      const g = grids[i], cxx = (o[b] + g[0]) * g[2], cyy = (o[b + 1] + g[1]) * g[2], w = Math.exp(o[b + 2]) * g[2], h = Math.exp(o[b + 3]) * g[2]; cand.push({ c: bc, s: sc, x: (cxx - w / 2) / r, y: (cyy - h / 2) / r, w: w / r, h: h / r }); }
    cand.sort((a, b) => b.s - a.s); const keep = []; cand.forEach(a => { if (keep.length < 20 && !keep.some(k => k.c === a.c && mkIou({ x: k.x, y: k.y, w: k.w, h: k.h }, { x: a.x, y: a.y, w: a.w, h: a.h }) > .45)) keep.push(a); });
    return keep.map(k => ({ class: MKY[k.c], score: k.s, bbox: [Math.max(0, k.x), Math.max(0, k.y), Math.min(k.w, src.width - Math.max(0, k.x)), Math.min(k.h, src.height - Math.max(0, k.y))] }));
  } };
}
function mkAiLoad() {
  const a = mkAiCfg(); if (!a || MKAI.st) return; MKAI.st = 1;
  const js = u => new Promise((ok, no) => { const s = document.createElement("script"); s.src = u; s.onload = ok; s.onerror = () => no(new Error(u)); document.head.appendChild(s); });
  if (a.engine === "yolox" || /\.onnx(\?|$)/.test(a.model || "")) {
    const ou = a.ort || "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/" + (a.gpu ? "ort.webgpu.min.js" : "ort.wasm.min.js"), S = a.size || 416;   // gpu: true = the phone's graphics chip does the work (WebGPU), and the processor if it can't
    js(ou).then(() => { const ort = window.ort; ort.env.wasm.wasmPaths = ou.replace(/[^/]*$/, ""); ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2); return ort.InferenceSession.create(a.model || "/local/yolox_tiny.onnx", { executionProviders: a.gpu ? ["webgpu", "wasm"] : ["wasm"], graphOptimizationLevel: "all" }).then(se => { const sh = ((se.inputMetadata || [])[0] || {}).shape || [], S2 = sh[2] > 0 && sh[2] === sh[3] ? sh[2] : S; MKAI.m = mkYolox(ort, se, S2); MKAI.size = S2; MKAI.st = 2; }); })   // the model file says what picture size it takes (tiny / nano 416, s and bigger 640): that wins over size: in config.js
.catch(e => { MKAI.st = -1; MKAI.err = String(e && e.message || e).slice(0, 60); });
    return;
  }
  js(a.tf || "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js").then(() => js(a.coco || "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"))
    .then(() => window.cocoSsd.load(a.model ? { modelUrl: a.model } : { base: a.base || "lite_mobilenet_v2" })).then(m => { MKAI.m = m; MKAI.size = 300; MKAI.st = 2; }).catch(e => { MKAI.st = -1; MKAI.err = String(e && e.message || e).slice(0, 60); });
}
const mkIou = (a, b) => { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h / (a.w * a.h + b.w * b.h - w * h) : 0; };
const mkMoved = (el, g) => {   // is the thing really moving: the cells that changed lately inside its box must spread over most of it (a parked car with someone walking past only has a small patch)
  const S = el._mkS; if (!S || !S.heat) return false; const gx = S.gx, gy = S.gy, x0 = Math.max(0, Math.floor((g.x - g.w * .1) * gx)), x1 = Math.min(gx - 1, Math.ceil((g.x + g.w * 1.1) * gx) - 1), y0 = Math.max(0, Math.floor((g.y - g.h * .1) * gy)), y1 = Math.min(gy - 1, Math.ceil((g.y + g.h * 1.1) * gy) - 1);
  let ax = gx, bx = -1, ay = gy, by = -1; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (S.heat[y * gx + x] > .25) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
  return bx >= 0 && (bx - ax + 1) * (by - ay + 1) >= (x1 - x0 + 1) * (y1 - y0 + 1) * (g.kind === "Person" ? .25 : .45);
};
function mkShift(g, snap) {   // the model needs a moment: the person has walked on since the picture it looked at, so move the box by how far the movement under it went
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2; let best = null, bd = 1; snap.forEach(q => { if (q.cx < g.x - g.w * .2 || q.cx > g.x + g.w * 1.2 || q.cy < g.y - g.h * .2 || q.cy > g.y + g.h * 1.2) return; const d = Math.hypot(q.cx - cx, q.cy - cy); if (d < bd) { bd = d; best = q; } });
  if (best) { g.x += best.b.x + best.b.w / 2 - best.cx; g.y += best.b.y + best.b.h / 2 - best.cy; } return !!best;
}
const mkAiOk = (kind, score, ar, moved, paused, crop) => kind === "Person"   // ar = height / width
  ? ar >= .9 && ar <= 5 && score >= (paused ? .5 : moved ? .45 : .7)   // people are upright: a wide bush is not one; standing still, the model has to be really sure
  : score >= .6;
async function mkAiJob(el, v, B, paused) {   // B = a moving spot to look at closely, or none = the whole picture
  const vw = v.videoWidth, vh = v.videoHeight, tok = el._mkTok; let sx = 0, sy = 0, sw = vw, sh = vh, cw = !MKAI.size || MKAI.size === 300 ? 640 : MKAI.size, ch = Math.round(cw * vh / vw);
  if (B) { const m = Math.min(vw, vh), cs = Math.min(m, Math.max(Math.max(B.w * vw, B.h * vh) * 2.2, m * .3)); sw = sh = cs; sx = Math.max(0, Math.min(vw - cs, (B.x + B.w / 2) * vw - cs / 2)); sy = Math.max(0, Math.min(vh - cs, (B.y + B.h / 2) * vh - cs / 2)); cw = ch = MKAI.size || 300; B.aiT = Date.now(); }   // a close-up of the spot: small people become big enough to recognise
  const ac = el._mkAc || (el._mkAc = document.createElement("canvas")); ac.width = cw; ac.height = ch; ac.getContext("2d").drawImage(v, sx, sy, sw, sh, 0, 0, cw, ch);
  const la = v !== el._mkv, pos = v.currentTime, snap = (el._mkB || []).filter(b => b.ttl > 0).map(b => ({ b: b, cx: b.x + b.w / 2, cy: b.y + b.h / 2 })), t0 = Date.now(), res = await MKAI.m.detect(ac, 8, .3), now = Date.now(); MKAI.ms = now - t0; if (tok !== el._mkTok) return;
  MKAI.slow = now - t0 > (mkAiCfg().maxMs || 1500) ? MKAI.slow + 1 : 0; if (MKAI.slow >= 3) { MKAI.st = -1; MKAI.err = "too slow, " + (now - t0) + "ms"; el._mkD = []; return; }   // this device is too slow for it: back to the movement boxes
  const D = el._mkD || (el._mkD = []), cr = { x: sx / vw, y: sy / vh, w: sw / vw, h: sh / vh }, hit = new Set(), got = [];
  res.forEach(r => { const kind = MKC[r.class]; if (!kind || el._mkTags.indexOf(kind) < 0 || r.score < .4 || (kind === "Vehicle" && B)) return;   // a close-up cuts a car in half: cars are only taken from looks at the whole picture
    const g = { x: (sx + r.bbox[0] * sw / cw) / vw, y: (sy + r.bbox[1] * sh / ch) / vh, w: r.bbox[2] * sw / cw / vw, h: r.bbox[3] * sh / ch / vh, kind: kind, score: r.score };
    if (mkAiOk(kind, r.score, g.h * vh / (g.w * vw), paused || mkMoved(el, g), paused, !!B)) { g.rc = [g.x + g.w / 2, g.y + g.h / 2]; g.tl = la ? pos * 1000 : mkShift(g, snap) ? now : t0; got.push(g); } });   // a bush, a pole or a house front the model was only half sure about is not let through
  got.sort((a, b) => b.score - a.score); for (let i = got.length - 1; i >= 0; i--) if (got.some((o, j) => j < i && mkIou(o, got[i]) > .5)) got.splice(i, 1);   // one thing is one box, whatever the model first thought it was
  got.forEach(g => { let best = null, bs = .2; D.forEach(d => { if (hit.has(d) || d.kind !== g.kind) return;   // the same person as an earlier look: overlapping, or close to where they should be by now (a quick walker or a slow device moves further than a box between two looks)
      const dt = d.vx != null ? Math.max(0, Math.min(.8, (g.tl - d.pt) / 1000)) : 0, dist = Math.hypot(d.x + d.w / 2 + (d.vx || 0) * dt - g.x - g.w / 2, d.y + d.h / 2 + (d.vy || 0) * dt - g.y - g.h / 2), reach = d.vx != null ? .06 : Math.max(.06, 1.1 * d.w), q = Math.max(mkIou(d, g), dist < reach ? .25 + .1 * (1 - dist / reach) : 0); if (q > bs) { bs = q; best = d; } });
    if (best) { const cx = g.x + g.w / 2, cy = g.y + g.h / 2; if (best.px != null && g.tl - best.pt > 60) { const dt = (g.tl - best.pt) / 1000, vx = Math.max(-2.4, Math.min(2.4, (cx - best.px) / dt)), vy = Math.max(-2.4, Math.min(2.4, (cy - best.py) / dt)); best.vx = best.vx == null ? vx : best.vx * .25 + vx * .75; best.vy = best.vy == null ? vy : best.vy * .25 + vy * .75; } best.px = cx; best.py = cy; best.pt = g.tl; best.tl = g.tl;   // how fast it goes, from the last two looks
      ["x", "y", "w", "h"].forEach(k => best[k] += (g[k] - best[k]) * .8); best.t = now; best.miss = 0; if (la) mkHist(best, pos); else best.hs = null; best.n = (best.n || 1) + 1; best.score += (g.score - best.score) * .5; hit.add(best); best.mv = Math.max(best.mv || 0, Math.hypot(g.rc[0] - best.c0[0], g.rc[1] - best.c0[1])); } else { g.px = g.x + g.w / 2; g.py = g.y + g.h / 2; g.pt = g.tl; g.t = now; g.t0 = now; g.hs = la ? [[pos, g.x, g.y, g.w, g.h]] : null; g.v0 = pos; g.n = paused ? 2 : 1; g.pz = paused; g.miss = 0; g.c0 = [g.x + g.w / 2, g.y + g.h / 2]; g.mv = 0; D.push(g); hit.add(g); } });
  D.forEach(d => { if (hit.has(d)) return; const cx = d.x + d.w / 2, cy = d.y + d.h / 2; if (!B || (cx > cr.x && cx < cr.x + cr.w && cy > cr.y && cy < cr.y + cr.h)) d.miss = (d.miss || 0) + 1; });   // looked where it was and it is not there
  hit.forEach(d => mkLink(el, d)); mkKeep(el, d => d.miss < 2 && now - d.t < 3500 || paused && hit.has(d));
  if (paused && !B) { D.forEach(d => { d.pp = hit.has(d) ? pos : null; }); el._mkPD = pos; }   // a paused picture: what the look found at this very spot stays shown, exactly where it was found
  if (B) { const near = got.some(g => { const cx = g.x + g.w / 2, cy = g.y + g.h / 2; return cx > B.x - B.w * .5 && cx < B.x + B.w * 1.5 && cy > B.y - B.h * .5 && cy < B.y + B.h * 1.5; }); B.miss = near ? 0 : (B.miss || 0) + 1; if (B.miss >= 2) B.badT = now; }   // movement with nothing in it (a shadow, light): not looked at again for a few seconds
}
const mkPred = (d, now) => { if (d.vx == null) return [0, 0]; const t = Math.min(now - (d.tl || d.t) + 80, 700) / 1000; return [d.vx * t, d.vy * t]; };   // the box goes on at the speed it had since the last look, so it is where the person is now and not where they were
function mkFollow(el) {   // between two looks of the model the box moves with the movement under it, so it stays on the person instead of catching up
  (el._mkD || []).forEach(d => { const b = d.trk; if (!b || b.ttl <= 0 || d.vx != null) return; const cx = b.x + b.w / 2, cy = b.y + b.h / 2; if (d.tx != null) { d.x += cx - d.tx; d.y += cy - d.ty; } d.tx = cx; d.ty = cy; });
}
function mkLink(el, d) {   // which moving spot is this person / car standing on
  let best = null, bd = 1; (el._mkB || []).forEach(b => { if (b.ttl <= 0) return; const cx = b.x + b.w / 2, cy = b.y + b.h / 2; if (cx < d.x - d.w * .2 || cx > d.x + d.w * 1.2 || cy < d.y - d.h * .2 || cy > d.y + d.h * 1.2) return; const q = Math.hypot(cx - d.x - d.w / 2, cy - d.y - d.h / 2); if (q < bd) { bd = q; best = b; } });
  d.trk = best; d.tx = best ? best.x + best.w / 2 : null; d.ty = best ? best.y + best.h / 2 : null;
}
function mkDbg(el) {   // detectAI: { debug: true } (or ?mkdebug in the address) shows what the boxes come from and which version runs, to tell why a box looks wrong
  const a = mkAiCfg(); if (!(a && a.debug) && !/mkdebug/.test(location.search + location.hash)) return; let c = el.querySelector(":scope>.mkd"); if (!c) { c = document.createElement("div"); c.className = "mkd"; el.appendChild(c); }
  c.textContent = "v" + (window.DASH_VER || "?") + " · " + (!a ? "no detectAI in config.js: movement only" : MKAI.st === 2 ? "AI " + Math.round(MKAI.ms || 0) + "ms · " + (MKAI.size || "") : MKAI.st === 1 ? "AI loading" : "movement only (" + (MKAI.err || "AI not started") + ")");
}
const mkLaCfg = () => { const a = mkAiCfg(), l = a && a.lookahead; return l ? Math.max(.3, Math.min(2, l === true ? .8 : +l || .8)) : 0; };
const mkAv = el => el._mkLaOk && el._mkv2 ? el._mkv2 : el._mkv;   // the picture the movement and the model look at: with lookahead a hidden second copy of the recording that runs a little ahead
function mkLaSync(el) {   // detectAI: { lookahead: 0.8 }: recordings only. The second copy plays that many seconds ahead, so a box is ready before the shown picture reaches the person
  const v = el._mkv, L = mkLaCfg(), now = Date.now(), live = v && el.classList.contains("mkon") && L && mkAiOn() && !el._mkLaOff && !el._mkLive && v.getAttribute("src") && v.readyState > 0 && isFinite(v.duration);
  if (!live) { if (el._mkw) { el._mkw.remove(); el._mkw = el._mkv2 = null; } if (el._mkLaOk) { el._mkLaOk = 0; el._mkS = null; el._mkB = []; } return; }
  let w = el._mkv2; if (!w) { const bx = document.createElement("div"); bx.className = "mklv"; w = document.createElement("video"); w.className = "mkw"; w.muted = true; w.playsInline = true; w.setAttribute("playsinline", ""); w.preload = "auto"; if (v.crossOrigin) w.crossOrigin = v.crossOrigin; bx.appendChild(w); el.appendChild(bx); el._mkw = bx; el._mkv2 = w; }
  const src = v.getAttribute("src"); if (w.getAttribute("src") !== src) { w.src = src; el._mkLaOk = 0; }
  let ok = 0;
  if (v.paused || v.seeking || v.ended) { if (!w.paused) w.pause(); el._mkLaBad = 0; }
  else {
    const tg = Math.min(v.currentTime + L, Math.max(0, w.duration - .1 || 0)), err = w.currentTime - tg;
    if (w.paused && !w.ended) w.play().catch(() => {});
    if (!w.seeking && (Math.abs(err) > .5 || w.ended)) w.currentTime = tg; else w.playbackRate = Math.max(.1, v.playbackRate * Math.max(.92, Math.min(1.08, 1 - err * .5)));
    ok = w.readyState >= 2 && !w.seeking && !w.paused && !w.ended && Math.abs(err) < 1 && isFinite(w.duration) && v.currentTime + L < w.duration - .1 ? 1 : 0;
    if (!ok && v.currentTime + L < w.duration - .1) { if (!el._mkLaBad) el._mkLaBad = now; if (now - el._mkLaBad > 4000) { el._mkLaOff = 1; MKAI.err = MKAI.err || "lookahead off"; } } else el._mkLaBad = 0;
  }
  if (ok !== (el._mkLaOk || 0)) { el._mkLaOk = ok; el._mkS = null; el._mkB = []; }
}
function mkHist(d, vt) { const h = d.hs || (d.hs = []); while (h.length && h[h.length - 1][0] >= vt) h.pop(); h.push([vt, d.x, d.y, d.w, d.h]); if (h.length > 10) h.shift(); }
function mkKeep(el, fn) { const D = el._mkD || [], keep = D.filter(fn), m = el._mkv ? el._mkv.currentTime : 0; if (el._mkv2) { const G = (el._mkG || []).filter(g => g.vOff != null && m < g.vOff + .5); D.forEach(d => { if (keep.indexOf(d) < 0 && d.vOn != null && G.indexOf(d) < 0) G.push(d); }); el._mkG = G.slice(-8); } el._mkD = keep; }   // a box that leaves the list while it is still due on the shown picture stays until then
function mkLaPos(d, m) {   // where the box is at media time m: between two looks it is drawn on the line between them, after the last one it goes on at the speed of the last two
  const h = d.hs, n = h ? h.length : 0, P = r => ({ x: r[1], y: r[2], w: r[3], h: r[4] }); if (!n) return null; if (m <= h[0][0]) return P(h[0]);
  for (let i = 0; i < n - 1; i++) if (m < h[i + 1][0]) { const f = (m - h[i][0]) / (h[i + 1][0] - h[i][0]), a = h[i], b = h[i + 1]; return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, w: a[3] + (b[3] - a[3]) * f, h: a[4] + (b[4] - a[4]) * f }; }
  const l = h[n - 1], p = h[n - 2], e = m - l[0]; if (e > .9) return null; if (!p || l[0] - p[0] < .05) return P(l);
  const dt = l[0] - p[0], vx = Math.max(-1.2, Math.min(1.2, (l[1] - p[1]) / dt)), vy = Math.max(-1.2, Math.min(1.2, (l[2] - p[2]) / dt)), k = Math.min(e, .7);
  return { x: Math.max(0, Math.min(1 - l[3], l[1] + vx * k)), y: Math.max(0, Math.min(1 - l[4], l[2] + vy * k)), w: l[3], h: l[4] };
}
function mkAiRun(el) {
  el._mkAiT = 0; if (el.isConnected) mkDbg(el); if (!el.isConnected || !mkAiOn()) { if (el.isConnected) mkLaSync(el); return; } const v = el._mkv; el._mkAiT = setTimeout(() => mkAiRun(el), 100); mkLaSync(el);
  if (MKAI.st === 1) { mkAiLoad(); return; }
  if (!el.classList.contains("mkon") || MKAI.st !== 2) return;
  el._mk.classList.add("ai"); const now = Date.now(); mkKeep(el, d => now - d.t < 3500 || v.paused && d.pp === v.currentTime); const la = !!el._mkLaOk; if (!v.paused && !la) mkFollow(el);
  const hold = v.paused && !v.seeking, done = hold && el._mkPD === v.currentTime;   // paused: the box stays on the person (no moving on at its old speed, no timing out) once the look at this very picture is done
  const L = el._mkD.filter(d => { if (done) return d.pp === v.currentTime; const lk = d.trk && d.trk.ttl > 0; return (hold ? now - d.t < 4000 : now - d.t < (d.miss >= 1 ? 500 : lk ? 1300 : 900)) && (d.n >= 2 || d.score >= .7 || d.pz || d.kind === "Vehicle" && lk)   // seen twice, or very sure, before it is shown
    && (d.kind === "Vehicle" ? d.pz || lk && (d.mv > Math.max(.04, .6 * Math.max(d.w, d.h * .56)) || d.score >= .6 && d.trk.w * d.trk.h > .15 * d.w * d.h) : d.pz || lk || d.mv > .02 || now - d.t0 < 2000 || el._mkLive && d.score >= .75); }).sort((a, b) => b.score - a.score);
  // a car only counts once it has really travelled; a "person" that never moves and has nothing moving under it is a post or a bush
  let P; if (la) {   // lookahead: the picture the model looks at is ahead of the one shown, so each box is read off its own track at the time being shown
    const m = v.currentTime, ta = el._mkv2.currentTime; L.forEach(d => { if (d.hs && d.hs.length) { if (d.vOn == null) d.vOn = d.v0; d.vOff = Math.min(ta, d.hs[d.hs.length - 1][0] + (d.miss >= 1 ? .25 : .7)); } });
    P = []; el._mkD.concat(el._mkG || []).forEach(d => { if (d.vOn == null || m < d.vOn - .1 || m > d.vOff + .15 || P.some(o => o.d === d)) return; const q = mkLaPos(d, m + .08); if (q) P.push(Object.assign({ d: d }, d, q)); });
    P.sort((a, b) => b.score - a.score);
  } else P = L.map(d => { const q = hold ? [0, 0] : mkPred(d, now); return Object.assign({}, d, { x: Math.max(0, Math.min(1 - d.w, d.x + q[0])), y: Math.max(0, Math.min(1 - d.h, d.y + q[1])) }); });
  mkDraw(el, v, P.filter((d, i) => !(d.kind === "Vehicle" && P.some(p => p.kind === "Person" && p.x + p.w / 2 > d.x && p.x + p.w / 2 < d.x + d.w && p.y + p.h / 2 > d.y && p.y + p.h / 2 < d.y + d.h && d.w * d.h < 5 * p.w * p.h)) && !P.some((o, j) => j < i && mkIou(o, d) > .5)).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 4));   // a "car" hardly bigger than the person standing in it is that person's shadow
  const a = mkAv(el);
  if (el._mkAiBusy || !mkSrc(a) || a.ended || a.seeking || a.readyState < 2 || !a.videoWidth || !a.offsetWidth || document.hidden) return;
  let job = null;
  if (!v.paused) {
    const L = (el._mkB || []).filter(b => b.age >= 1 && now - (b.aiT || 0) > 120 && !(b.miss >= 2 && now - (b.badT || 0) < 5000)).sort((a, b) => (a.aiT || 0) - (b.aiT || 0));
    L.forEach(b => { if (b.miss >= 2) b.miss = 1; }); const mvg = (el._mkB || []).some(b => b.age >= 1 && b.ttl > 0), fe = el._mkTags.indexOf("Vehicle") >= 0 ? mvg ? 250 : 800 : 2000;   // a car crosses the picture in a second or two: with cars tagged the whole picture is looked at more often, and before the close-ups (a close-up cuts a car in half)
    if (L.length && !(fe < 2000 && now - (el._mkFull || 0) > fe && mvg)) job = { b: L[0] }; else if (now - (el._mkFull || 0) > fe) job = {};
  } else if (el._mkPT !== v.currentTime) { el._mkPT = v.currentTime; job = {}; }
  if (!job) return; if (!job.b) el._mkFull = now; el._mkAiBusy = 1;
  mkAiJob(el, a, job.b, v.paused).catch(() => { MKAI.slow += 1; if (MKAI.slow >= 3) MKAI.st = -1; }).then(() => { el._mkAiBusy = 0; if (el._mkAiT) { clearTimeout(el._mkAiT); el._mkAiT = setTimeout(() => mkAiRun(el), 15); } });
}
function mkDraw(el, v, B) {
  const o = el._mk, W = v.offsetWidth, Hh = v.offsetHeight, r = v.videoWidth / v.videoHeight; if (!o || !W || !Hh) return;
  let pw = W, ph = Hh; if (W / Hh > r) pw = Hh * r; else ph = W / r; const pl = v.offsetLeft + (W - pw) / 2, pt = v.offsetTop + (Hh - ph) / 2;
  while (o.children.length < B.length) { const n = document.createElement("div"); n.className = "mkb"; n.innerHTML = "<em></em>"; o.appendChild(n); }
  while (o.children.length > B.length) o.lastChild.remove();
  B.forEach((b, i) => { const n = o.children[i], k = b.kind;
    n.style.cssText = "left:" + (pl + b.x * pw) + "px;top:" + (pt + b.y * ph) + "px;width:" + b.w * pw + "px;height:" + b.h * ph + "px"; const cl = "mkb " + k.toLowerCase(); if (n.className !== cl) { n.className = cl; n.firstChild.textContent = MKN[k]; } });
  mkLabels(el, o, B, pl, pt, pw, ph);
}
function mkLabels(el, o, B, pl, pt, pw, ph) {   // two people close together would wear their labels on top of each other, and a box at the top edge would push its label off the picture: each label takes the first free place (above, below, inside), left box first
  if (el.dataset.mk === "glow") return;
  const sv = n => parseFloat(el.style.getPropertyValue(n)) || 0, z = Math.max(1, sv("--zs") || 1), M = el._mkLw || (el._mkLw = {}), placed = [], G = 3, ow = o.offsetWidth, oh = o.offsetHeight;
  const x0 = Math.max(pl, ow / 2 + (-ow / 2 - sv("--zx")) / z), x1 = Math.min(pl + pw, ow / 2 + (ow / 2 - sv("--zx")) / z), y0 = Math.max(pt, oh / 2 + (-oh / 2 - sv("--zy")) / z), y1 = Math.min(pt + ph, oh / 2 + (oh / 2 - sv("--zy")) / z);   // the part of the picture that shows (zoomed in, less of it does)
  B.map((b, i) => i).sort((a, c) => B[a].x - B[c].x).forEach(i => {
    const n = o.children[i], e = n && n.firstChild, b = B[i]; if (!e) return;
    const lw = (M[b.kind] || (M[b.kind] = e.offsetWidth || 56)) / z, lh = (M.h || (M.h = e.offsetHeight || 19)) / z, bx = pl + b.x * pw, by = pt + b.y * ph, bw = b.w * pw, bh = b.h * ph;
    const at = { aL: [bx - 2, by - 3 - lh], bL: [bx - 2, by + bh + 3], aR: [bx + bw + 2 - lw, by - 3 - lh], bR: [bx + bw + 2 - lw, by + bh + 3], iL: [bx + 4, by + 4], iR: [bx + bw - 4 - lw, by + 4] };
    const free = k => { const x = at[k][0], y = at[k][1]; return x >= x0 - 1 && y >= y0 - 1 && x + lw <= x1 + 1 && y + lh <= y1 + 1 && !placed.some(r => x < r[0] + r[2] + G && r[0] < x + lw + G && y < r[1] + r[3] + G && r[1] < y + lh + G); };
    const pick = [n.dataset.lb, "aL", "bL", "aR", "bR", "iL", "iR"].find(k => k && free(k)) || "iL"; placed.push([at[pick][0], at[pick][1], lw, lh]); n.dataset.lb = pick; });
}
// day strip above the list of clips: one coloured bar per clip, where it sits in the day; tap one to play it
function pbStrip(P, items, filter) {
  const L = []; items.forEach((x, i) => { const p = P[i]; if (!p || x.can_expand || (filter !== "all" && p.tags.indexOf(filter) < 0)) return; const t = p.time.split(":").map(Number); L.push({ i: i, s: t[0] * 3600 + t[1] * 60 + (t[2] || 0), len: p.secs, tags: p.tags }); });
  if (L.length < 2) return "";
  let lo = Math.floor(Math.min.apply(0, L.map(x => x.s)) / 3600) * 3600, hi = Math.ceil(Math.max.apply(0, L.map(x => x.s + x.len)) / 3600) * 3600; if (hi - lo < 4 * 3600) hi = Math.min(86400, lo + 4 * 3600); if (hi - lo < 4 * 3600) lo = hi - 4 * 3600;
  const hr = s => { const h = Math.round(s / 3600) % 24; return (h % 12 || 12) + (h < 12 ? "am" : "pm"); }, ty = a => a.indexOf("Person") > -1 && a.indexOf("Vehicle") > -1 ? "pv" : a.indexOf("Person") > -1 ? "person" : a.indexOf("Vehicle") > -1 ? "vehicle" : a.indexOf("Animal") > -1 ? "animal" : "motion", used = {};
  const segs = L.map(x => { const k = ty(x.tags); used[k] = 1; return '<i class="pbs ' + k + '" data-si="' + x.i + '" style="left:' + ((x.s - lo) / (hi - lo) * 100).toFixed(2) + '%;width:' + Math.max(1.2, x.len / (hi - lo) * 100).toFixed(2) + '%" title="' + esc(pbClock(Math.floor(x.s / 3600) + ":" + ("0" + Math.floor(x.s % 3600 / 60)).slice(-2))) + '"></i>'; }).join("");
  const lg = [["person", "Person"], ["vehicle", "Car"], ["animal", "Animal"], ["motion", "Other"]].filter(a => used[a[0]] || (a[0] === "person" && used.pv) || (a[0] === "vehicle" && used.pv)).map(a => '<span class="' + a[0] + '">' + a[1] + '</span>').join("");
  return '<div class="pbtl"><div class="pbtr">' + segs + '</div><div class="pbax"><span>' + hr(lo) + '</span><span>' + hr((lo + hi) / 2) + '</span><span>' + hr(hi) + '</span></div><div class="pblg">' + lg + '</div></div>';
}
