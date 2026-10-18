// ---------- palette page ----------
function savePal() { try { localStorage.setItem("dashPal", JSON.stringify(PAL)); } catch (x) {} }
const logoPref = () => { try { const v = localStorage.getItem("dashLogo"); return v === "load" || v === "off" ? v : "on"; } catch (_) { return "on"; } };
function drawPalette() {
  const m = palMode(), P = PAL[m];
  const sec = (t, inner) => '<div class="pn pg"><div class="lbl">' + t + '</div>' + inner + '</div>';
  const preOn = Object.keys(PAL_PRE).filter(n => PAL.dark.accent === PAL_PRE[n].dark.accent && PAL.light.accent === PAL_PRE[n].light.accent)[0];
  const fnt = (FONTS.filter(x => x[0] === FONT)[0] || FONTS[0])[1].replace(/^Plus /, "").split(/[ (]/)[0] + (/mono/i.test(FONT) ? " mono" : ""), sum = [preOn || "Custom", fnt, { dark: "Dark", light: "Light", auto: "Auto", sun: "Sun", time: "Schedule" }[PAL.mode] || ""].join(" · ");
  const L = sec("Style", '<div class="stg">' + STYLES.map(x => '<button class="eb sty' + (STYLE === x[0] ? " sel" : "") + '" data-style="' + x[0] + '"><span class="spv" data-pv="' + x[0] + '"><b></b><i></i></span>' + x[1].toUpperCase() + '<small>' + x[2] + '</small></button>').join("") + '</div>') +
    sec("Presets", '<div class="pg4" style="margin-top:12px">' + Object.keys(PAL_PRE).map(n => { const p = PAL_PRE[n][m]; return '<button class="pre2' + (n === preOn ? " on" : "") + '" data-p="' + n + '"><i style="background:' + p.accent + '"></i><b>' + n + '</b></button>'; }).join("") + '</div>') +
    sec("Font", '<div class="stg">' + FONTS.map(x => '<button class="eb fnb' + (FONT === x[0] ? " sel" : "") + '" data-font="' + x[0] + '" style="font-family:' + x[3] + '"><b>22.5°</b><span>' + x[1] + '</span><small>' + x[2] + '</small></button>').join("") + '</div>') +
    sec("Mode", '<div class="seg" style="margin-top:12px;flex-wrap:wrap">' + [["dark", "DARK"], ["light", "LIGHT"], ["auto", "FOLLOW DEVICE"], ["sun", "FOLLOW SUN"], ["time", "SCHEDULE"]].map(x => '<button class="eb' + (PAL.mode === x[0] ? " on" : "") + '" data-mode="' + x[0] + '">' + x[1] + '</button>').join("") + '</div>' +
      (PAL.mode === "time" ? '<div class="lbl" style="margin-top:12px;text-transform:none;letter-spacing:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap">Dark from <input type="time" data-tm="from" value="' + esc(PAL.from || "18:00") + '"> until <input type="time" data-tm="to" value="' + esc(PAL.to || "06:00") + '"></div>' : "") + (PAL.mode === "sun" ? '<div class="lbl" style="margin-top:12px;text-transform:none;letter-spacing:0">Dark from sunset to sunrise, from <b>sun.sun</b> in Home Assistant' + (states["sun.sun"] ? "" : " (not found, using 6am–7pm)") + '. Saved on this device only.</div>' : "")) +
    (brandOn() ? sec("Start-up logo", '<div class="seg" style="margin-top:12px">' + [["on", "LOGO + INTRO"], ["load", "WHILE LOADING ONLY"], ["off", "OFF"]].map(x => '<button class="eb' + (logoPref() === x[0] ? " on" : "") + '" data-logo="' + x[0] + '">' + x[1] + '</button>').join("") + '</div><div class="lbl" style="margin-top:10px;text-transform:none;letter-spacing:0">Applies the next time the dashboard starts. Saved on this device only.</div>') : "") +
    (ME.admin ? accSec(sec) : "") +
    (AUTH && !AUTH.borrowed && !CONFIG.token ? sec("Account", '<div style="margin-top:12px"><button class="eb" data-signout="1">SIGN OUT OF THIS DEVICE</button><span class="lbl" style="margin-left:14px">Signed in on this device only</span></div>') : "") +
    ('<div class="pn pg thab"><span class="lbl">Dashboard ' + esc(ENGINE_VERSION) + '</span></div>');
  $("#theme").innerHTML = '<div class="thg"><div class="thl">' + L + '</div></div>';
}
$("#theme").oninput = e => {
  const t = e.target, k = t.dataset.k;
  if (t.dataset.tm) { PAL[t.dataset.tm] = t.value || (t.dataset.tm === "from" ? "18:00" : "06:00"); savePal(); palTick(); return; }
  if (k) PAL[palMode()][k] = t.value; else if (t.dataset.t != null) { PAL.temp[+t.dataset.t] = t.value; queueHome(); } else return;
  applyPal(); savePal();
};
// smooth colour fade when the palette changes (a short-lived class lets colours transition; no page snapshots, so no blink)
const themeFx = fn => fn(), themeDip = fn => fn();
$("#theme").onclick = e => {
  const p = e.target.closest("[data-p]"), r = e.target.closest("[data-reset]"), md = e.target.closest("button[data-mode]"), sy = e.target.closest("button[data-style]"), fn = e.target.closest("button[data-font]");
  const ac = e.target.closest("[data-acc]"); if (ac) { accClick(ac); return; }
  if (fn) { themeDip(() => { FONT = fn.dataset.font; try { localStorage.setItem("dashFont", FONT); } catch (_) {} applyFont(); drawPalette(); }); return; }
  if (sy) { themeDip(() => { STYLE = sy.dataset.style; try { localStorage.setItem("dashStyle", STYLE); } catch (_) {} applyStyle(); drawPalette(); }); return; }
  const lg = e.target.closest("button[data-logo]");
  if (lg) { try { localStorage.setItem("dashLogo", lg.dataset.logo); } catch (_) {} drawPalette(); return; }
  const so = e.target.closest("[data-signout]");
  if (so) {   // two taps, so it can't happen by accident on a wall tablet
    if (so.dataset.arm) signOut();
    else { so.dataset.arm = 1; so.textContent = "TAP AGAIN TO SIGN OUT"; setTimeout(() => { if (so.isConnected) { delete so.dataset.arm; so.textContent = "SIGN OUT OF THIS DEVICE"; } }, 4000); }
    return;
  }
  if (!(md || p || r)) return;
  themeFx(() => {
    if (md) PAL.mode = md.dataset.mode;
    else if (p) { Object.assign(PAL.dark, PAL_PRE[p.dataset.p].dark); Object.assign(PAL.light, PAL_PRE[p.dataset.p].light); }
    else PAL = JSON.parse(JSON.stringify(PAL_DEF));
    savePal(); drawPalette(); void document.body.offsetHeight; getComputedStyle(document.body).color;   // new cards exist with the old colours first, so they fade too
    applyPal(); queueHome();
  });
};

