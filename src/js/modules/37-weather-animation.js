// ---------- weather animation (greeting card) ----------
const WFX = { k: "", wind: 0, parts: [], t: 0, fl: 0, last: 0, w: 0, h: 0, ctx: null };
function wfxSet(state, raining, wind) {
  const hr = new Date().getHours(), sun = states["sun.sun"], night = sun ? sun.state === "below_horizon" : (hr < 6 || hr >= 19);
  let k = state === "sunny" || state === "clear-night" ? (night ? "night" : "sun") : state === "partlycloudy" ? (night ? "pnight" : "partly") : state || "cloudy";
  if (raining && (k === "cloudy" || k === "partly" || k === "pnight" || k === "sun" || k === "night")) k = "rainy";
  if (k === "exceptional" || !k) k = "cloudy";
  WFX.wind = Math.min(1.6, wind / 30);
  if (WFX.k !== k) { WFX.k = k; WFX.parts = []; wfxInit(); }
}
function wfxInit() {
  const k = WFX.k, W = WFX.w || 600, H = WFX.h || 80, r = Math.random, P = WFX.parts;
  const n = { rainy: 70, pouring: 150, lightning: 110, "lightning-rainy": 130, snowy: 60, "snowy-rainy": 80, night: 45, pnight: 35 }[k] || 0;
  for (let i = 0; i < n; i++) P.push({ x: r() * W, y: r() * H, v: 0.5 + r(), s: 0.5 + r(), p: r() * 6.28 });
  if (/cloud|partly|pnight|rain|pour|lightning|snow|fog|windy|hail/.test(k)) for (let i = 0; i < 5; i++) P.push({ cloud: 1, x: r() * W, y: 6 + r() * (H * 0.5), v: 0.2 + r() * 0.3, s: 0.7 + r() * 0.8 });
  if (k === "fog") for (let i = 0; i < 6; i++) P.push({ fog: 1, x: r() * W, y: r() * H, v: 0.2 + r() * 0.3, s: 1 + r() });
  if (k === "windy") for (let i = 0; i < 14; i++) P.push({ str: 1, x: r() * W, y: r() * H, v: 2 + r() * 3, s: 30 + r() * 60 });
}
function wfxFrame(ts) {
  requestAnimationFrame(wfxFrame);
  const c = WFX.c; if (!c || document.hidden || (curPg() !== "home" && !c.closest("header"))) return;   // Home, or any page while the tablet strip sits in the header (hmerge)
  if (ts - WFX.last < 33) return; const FXS = Math.max(0.05, +(CONFIG.weatherFx && CONFIG.weatherFx.speed) || 1), dt = Math.min(3, (ts - WFX.last) / 16.7) * FXS; WFX.last = ts;
  const g = c.getContext("2d"); if (!g) return;
  const W = c.clientWidth, H = c.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
  if (!W || !H) return;
  if (c.width !== Math.round(W * d) || c.height !== Math.round(H * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d); WFX.w = W; WFX.h = H; WFX.parts = []; wfxInit(); }
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
  let ax = W - 90; const hd = c.closest("header"), hr = hd && hd.querySelector(".hr");   // in the header the sun / moon sits in the free space left of the music note and the chips, not under them
  if (hr) { const hl = hr.getBoundingClientRect().left - c.getBoundingClientRect().left; ax = Math.max(W * 0.4, Math.min(W - 90, hl - 56)); const wm = Math.round(Math.max(40, Math.min(100, (hl - 16) / W * 100))); if (c._wm !== wm) { c._wm = wm; c.style.setProperty("--wm", wm + "%"); } }
  const light = document.documentElement.getAttribute("data-mode") === "light", k = WFX.k, wd = WFX.wind, t = (WFX.t += dt * 0.016);
  const ink = light ? "40,70,110" : "230,240,255", rain = light ? "50,110,200" : "150,200,255", cl = light ? "90,110,140" : "255,255,255";
  const clouds = () => WFX.parts.forEach(p => {
    if (!p.cloud) return; p.x += (p.v + wd * 0.8) * dt; if (p.x > W + 80) p.x = -100;
    g.fillStyle = "rgba(" + cl + "," + (/rain|pour|lightning|snow/.test(k) ? 0.2 : 0.12) + ")";
    g.beginPath(); [[0, 0, 26], [24, -8, 20], [-24, 2, 18], [46, 4, 16]].forEach(b => { g.moveTo(p.x + (b[0] + b[2]) * p.s, p.y + b[1] * p.s); g.arc(p.x + b[0] * p.s, p.y + b[1] * p.s, b[2] * p.s, 0, 6.283); }); g.fill();
  });
  const sunGlow = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(" + col + ",.55)"); gr.addColorStop(1, "rgba(" + col + ",0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
  if (k === "sun" || k === "partly") {
    const x = ax, y = H * 0.5, col = light ? "255,170,40" : "255,205,90"; sunGlow(x, y, 120, col);
    g.strokeStyle = "rgba(" + col + ",.55)"; g.lineWidth = 2.5; g.lineCap = "round";
    for (let i = 0; i < 12; i++) { const a = i * 0.5236 + t * 0.4; g.beginPath(); g.moveTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34); g.lineTo(x + Math.cos(a) * (46 + 5 * Math.sin(t * 2 + i)), y + Math.sin(a) * (46 + 5 * Math.sin(t * 2 + i))); g.stroke(); }
    g.fillStyle = "rgba(" + col + ",.9)"; g.beginPath(); g.arc(x, y, 24, 0, 6.283); g.fill();
  }
  if (k === "night" || k === "pnight") {
    const x = ax, y = H * 0.45; sunGlow(x, y, 90, light ? "120,140,200" : "170,190,255");
    g.fillStyle = light ? "rgba(90,100,150,.85)" : "rgba(235,240,255,.92)"; g.beginPath(); g.arc(x, y, 22, 0, 6.283); g.fill();
    g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(x + 11, y - 6, 20, 0, 6.283); g.fill(); g.globalCompositeOperation = "source-over";
    WFX.parts.forEach(p => { if (p.cloud) return; const a = 0.25 + 0.6 * Math.abs(Math.sin(t * p.v + p.p)); g.fillStyle = "rgba(" + (light ? "90,100,150" : "255,255,255") + "," + a + ")"; g.beginPath(); g.arc(p.x, p.y, p.s * 1.3, 0, 6.283); g.fill(); });
  }
  clouds();
  if (k === "fog") WFX.parts.forEach(p => { if (!p.fog) return; p.x += p.v * dt; if (p.x > W + 200) p.x = -250; const gr = g.createLinearGradient(p.x - 200, 0, p.x + 200, 0); gr.addColorStop(0, "rgba(" + cl + ",0)"); gr.addColorStop(.5, "rgba(" + cl + ",.12)"); gr.addColorStop(1, "rgba(" + cl + ",0)"); g.fillStyle = gr; g.fillRect(p.x - 200, p.y, 400, 14 * p.s); });
  if (k === "windy") { g.strokeStyle = "rgba(" + ink + ",.3)"; g.lineWidth = 1.6; g.lineCap = "round"; WFX.parts.forEach(p => { if (!p.str) return; p.x += (p.v + wd * 4) * dt; if (p.x - p.s > W) { p.x = -p.s; p.y = Math.random() * H; } g.beginPath(); g.moveTo(p.x - p.s, p.y); g.bezierCurveTo(p.x - p.s * 0.6, p.y - 6, p.x - p.s * 0.3, p.y + 6, p.x, p.y); g.stroke(); }); }
  if (/rain|pour|lightning/.test(k)) {
    const sl = 0.25 + wd * 0.5, len = k === "pouring" ? 16 : 11; g.strokeStyle = "rgba(" + rain + ",.55)"; g.lineWidth = k === "pouring" ? 1.6 : 1.2; g.lineCap = "round";
    WFX.parts.forEach(p => { if (p.cloud) return; p.y += (7 + 6 * p.v) * dt; p.x += (7 + 6 * p.v) * sl * dt; if (p.y > H + 10) { p.y = -10; p.x = Math.random() * (W + 80) - 40; } if (p.x > W + 20) p.x = -20; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + len * sl, p.y + len); g.stroke(); });
  }
  if (/lightning/.test(k)) { if (!WFX.fl && Math.random() < 0.004 * FXS) WFX.fl = 1; if (WFX.fl > 0) { g.fillStyle = "rgba(" + (light ? "255,255,200" : "255,255,255") + "," + (WFX.fl * 0.28) + ")"; g.fillRect(0, 0, W, H); WFX.fl = WFX.fl > 0.05 ? WFX.fl - 0.09 * dt : 0; } }
  if (/snow/.test(k)) { g.fillStyle = "rgba(" + (light ? "120,150,190" : "255,255,255") + ",.85)"; WFX.parts.forEach(p => { if (p.cloud) return; p.y += (0.6 + p.v * 0.7) * dt; p.x += (Math.sin(t * 2 + p.p) * 0.4 + wd * 0.8) * dt; if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; } if (p.x > W + 4) p.x = -4; g.beginPath(); g.arc(p.x, p.y, 1.2 + p.s * 1.3, 0, 6.283); g.fill(); }); }
}
WFX.c = document.getElementById("wfx"); requestAnimationFrame(wfxFrame);

