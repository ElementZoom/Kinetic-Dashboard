// Switching between the light and the clear stream (tap to full screen / close): the picture that is playing keeps playing until the new one has its first picture.   Run:  node tests/cam-stream-swap.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], layout: { tablet: ["cams"], mobile: ["cams"] },
  cameras: [{ id: "camera.a_clear", name: "A" }, { id: "camera.b", name: "B" }, { id: "camera.c", name: "C" }],
  view: { driveway: { id: "camera.a", name: "D", trig: [] }, garage: { id: "camera.b", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const p = await browser.newPage({ viewport: { width: 1100, height: 800 } }); const errors = []; p.on("pageerror", e => errors.push(String(e)));
await p.goto(`http://127.0.0.1:${server.address().port}/dash.html`); await p.waitForTimeout(800);

// a clip to make live streams from (Chromium has no camera here): captureStream() gives a real MediaStream
const out = await p.evaluate(async () => {
  document.documentElement.classList.remove("boot"); const lg = document.getElementById("lg"); if (lg) lg.hidden = true; const wait = ms => new Promise(r => setTimeout(r, ms));
  states["camera.a_fluent"] = { state: "idle", attributes: {} }; states["camera.a_clear"] = { state: "idle", attributes: {} };
  const mk = () => { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 36; const g = cv.getContext("2d"); setInterval(() => { g.fillStyle = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"); g.fillRect(0, 0, 64, 36); }, 40); return cv.captureStream(25); };
  const pcs = []; window.RTCPeerConnection = function () { const pc = { closed: false, addTransceiver() {}, createDataChannel() {}, createOffer: async () => ({ type: "offer", sdp: "x" }), setLocalDescription: async () => {}, setRemoteDescription: async () => {}, addIceCandidate: async () => ({}), close() { this.closed = true; }, connectionState: "new" }; pcs.push(pc); return pc; };
  const sent = []; send = (m, cb) => { if (m.type === "camera/webrtc/get_client_config") cb({ configuration: {} }); }; ws = { readyState: 1, send(t) { sent.push(JSON.parse(t)); } };
  const c = CONFIG.cameras[0], el = c.o.el, vid = c.o.vid, out = {};
  liveCam(c); await wait(100); const A = mk(); pcs[0].ontrack({ track: { kind: "video" }, streams: [A] }); await wait(300); out.tile = vid.srcObject === A && c.live === true; out.sent1 = sent.map(m => m.entity_id);
  el.click(); await wait(300);   // tap to full screen
  out.kept = vid.srcObject === A; out.two = pcs.length === 2; out.oldOpen = !pcs[0].closed; out.sent2 = sent.map(m => m.entity_id);
  const B = mk(); pcs[1].ontrack({ track: { kind: "video" }, streams: [B] }); await wait(600);
  out.swapped = vid.srcObject === B; out.oldClosed = pcs[0].closed; out.newOpen = !pcs[1].closed;
  el.click(); await wait(1500);   // close: back to the light stream, same way
  out.kept2 = vid.srcObject === B; const C = mk(); pcs[2].ontrack({ track: { kind: "video" }, streams: [C] }); await wait(600); out.back = vid.srcObject === C && pcs[1].closed;
  // the new stream never comes: the playing one stays
  el.click(); await wait(300); out.three = pcs.length === 4; await wait(8600); out.stays = vid.srcObject === C && !pcs[2].closed && pcs[3].closed;
  return out; });
eq("the tile plays", out.tile, true); eq("the tile asks for the light stream", out.sent1.slice(-1)[0], "camera.a_fluent");
eq("full screen asks for the clear stream", out.sent2.slice(-1)[0], "camera.a_clear");
eq("the light picture keeps playing while the clear one connects", out.kept, true); eq("a second connection is made", out.two, true); eq("the first is still open", out.oldOpen, true);
eq("the clear picture takes over at its first picture", out.swapped, true); eq("the light connection is then closed", out.oldClosed, true); eq("the clear connection stays", out.newOpen, true);
eq("closing keeps the clear picture until the light one is there", out.kept2, true); eq("then the light one takes over and the clear one is closed", out.back, true);
eq("a new stream that never comes: a second connection is tried", out.three, true); eq("and the playing picture stays after the wait", out.stays, true);
await browser.close(); server.close();
if (errors.length) problems.push("page errors: " + errors.join(" | "));
if (problems.length) { console.error("FAIL:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`camera stream swap ok: ${checks} checks`);
