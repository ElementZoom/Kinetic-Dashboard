// ---------- hold on any tile: when it last changed ("Turned on 5 minutes ago", "Opened 2 hours 5 minutes ago", "Closed 3 days ago") ----------
function agoTxt(ms) {
  const m = Math.floor(Math.max(0, ms) / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24), pl = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  if (m < 1) return "less than a minute"; if (m < 60) return pl(m, "minute"); if (h < 24) return pl(h, "hour") + (m % 60 ? " " + pl(m % 60, "minute") : ""); return pl(d, "day");
}
const agoFull = ms => ms < 60000 ? "just now" : agoTxt(ms) + " ago";
function lastVerb(id, el) {
  const st = (states[id] || {}).state, d = id.split(".")[0], door = el && (el.dataset.k || el.dataset.s || el.classList.contains("bd")) || d === "cover";
  if (st === "unavailable") return "Went unavailable"; if (st === "unknown") return "Became unknown";
  if (door || d === "cover") { if (st === "on" || st === "open" || st === "opening") return "Opened"; if (st === "off" || st === "closed" || st === "closing") return "Closed"; }
  if (st === "on") return "Turned on"; if (st === "off") return "Turned off"; return "Changed to " + title(String(st));
}
let infT = 0;
function lsInfo(id, el) {
  const s = states[id]; if (!s) return; const t = Date.parse(s.last_changed || s.last_updated || ""); if (!t) return;
  let b = $("#linf"); if (!b) { document.body.insertAdjacentHTML("beforeend", '<div id="linf"></div>'); b = $("#linf"); b.onclick = () => b.classList.remove("show"); }
  const dt = new Date(t), p2 = n => ("0" + n).slice(-2), when = p2(dt.getDate()) + "/" + p2(dt.getMonth() + 1) + "/" + dt.getFullYear() + " " + p2(dt.getHours()) + ":" + p2(dt.getMinutes());
  b.innerHTML = '<b>' + esc(s.attributes.friendly_name || fname(id)) + '</b><span>' + lastVerb(id, el) + " " + agoFull(Date.now() - t) + '</span><small>' + when + '</small>';
  b.classList.add("show"); clearTimeout(infT); infT = setTimeout(() => b.classList.remove("show"), 6000);
}
const lsDims = a => (a.supported_color_modes || []).some(m => m !== "onoff"), lsCt = a => (a.supported_color_modes || []).indexOf("color_temp") > -1, lsCol = a => (a.supported_color_modes || []).some(m => ["hs", "rgb", "rgbw", "rgbww", "xy"].indexOf(m) > -1);
const LSW = [[255, 90, 80], [255, 160, 60], [255, 224, 90], [110, 235, 170], [90, 170, 255], [160, 120, 255], [255, 130, 210]];
document.body.insertAdjacentHTML("beforeend", '<div id="lsh"><div class="lbk" data-ls="x"></div><div class="lb"><div class="gr" data-ls="x"></div><div class="sh"><div><b id="lsn"></b><div id="lsi" class="lsi"></div></div><button class="swt" id="lsw" aria-label="Toggle"></button></div><div id="lsd"></div></div></div>');
function lsOpen(id) {
  const s = states[id]; if (!s) return; const a = s.attributes; LS.id = id; $("#lsn").textContent = a.friendly_name || id;
  $("#lsd").innerHTML = (lsDims(a) ? '<div class="dial" id="lsdl"><svg viewBox="0 0 210 210"><circle cx="105" cy="105" r="88" stroke="rgba(128,128,140,.25)" stroke-width="15" stroke-dasharray="415 553" transform="rotate(135 105 105)" stroke-linecap="round"/><circle id="lsarc" cx="105" cy="105" r="88" stroke="var(--lsc,#ffc766)" stroke-width="15" stroke-dasharray="0 553" transform="rotate(135 105 105)" stroke-linecap="round"/></svg><div class="c"><div><b id="lsp">--</b><small>BRIGHTNESS</small></div></div></div>' : "") +
    (lsCt(a) ? '<div class="sec">WARM ⟷ COOL</div><div class="ct" id="lsct"><i></i></div>' : "") +
    (lsCol(a) ? '<div class="sec">COLOUR</div><div class="cs">' + LSW.map(c => '<button data-rgb="' + c.join(",") + '" style="background:rgb(' + c.join(",") + ')" aria-label="Colour"></button>').join("") + '</div>' : "") +
    (() => { const S = CONFIG.scenes; if (!S) return ""; const ri = S.rooms.findIndex(x => x.l.indexOf(id) > -1), gi = S.lights.findIndex(x => x.l === id);   // this light's room (or gradient light) from the Scenes setup
      return '<div class="sec">SCENES</div><div class="scq">' + (ri > -1 ? '<button class="chip" data-lsr="' + ri + '"></button>' : gi > -1 ? '<button class="chip" data-lsg="' + gi + '"></button>' : "") + '<button class="chip all" data-lsa="1">All scenes ' + mdi("chevron-right") + '</button></div>'; })();
  document.body.classList.add("ls-open"); lsUpd();
}
const lsClose = () => { document.body.classList.remove("ls-open"); LS.id = ""; };
function lsUpd() {
  const id = LS.id, s = id && states[id]; if (!s) return; const a = s.attributes, on = s.state === "on", now = Date.now();
  $("#lsw").classList.toggle("on", on); { const t = Date.parse(s.last_changed || ""); $("#lsi").textContent = t ? lastVerb(id) + " " + agoFull(Date.now() - t) : ""; }
  const rgb = on && a.rgb_color; $("#lsh").style.setProperty("--lsc", rgb ? "rgb(" + rgb.join(",") + ")" : "#ffc766");
  const dl = $("#lsdl"); if (dl && !(dl._d > now)) { const b = on && a.brightness != null ? Math.round(a.brightness / 2.55) : 0; lsDial(b); }
  const ct = $("#lsct"); if (ct && !(ct._d > now)) { const mn = a.min_color_temp_kelvin || 2000, mx = a.max_color_temp_kelvin || 6500, k = a.color_temp_kelvin; $("i", ct).style.left = (k ? Math.max(0, Math.min(1, (k - mn) / (mx - mn))) * 100 : 50) + "%"; $("i", ct).style.display = on && k ? "" : "none"; }
  $$("#lsd .cs button").forEach(b => b.classList.toggle("on", !!rgb && b.dataset.rgb.split(",").every((v, i) => Math.abs(v - rgb[i]) < 40)));
  { const S = CONFIG.scenes, r = $("#lsd [data-lsr]"), g = $("#lsd [data-lsg]");
    if (S && r) { const t = sv(S.rooms[r.dataset.lsr].t) || "", sel = sv(E("dynSelected")) || ""; r.classList.toggle("on", !!t); r.innerHTML = mdi("palette") + esc(t ? title(t) : sel ? "Apply " + title(sel) : "Apply scene"); }
    if (S && g) { const x = S.lights[g.dataset.lsg], o = isOn(x.l); g.classList.toggle("on", o); g.innerHTML = mdi("palette") + esc(o && sv(x.s) ? title(sv(x.s)) : "Gradient scene"); } }
}
function lsDial(b) { $("#lsarc").setAttribute("stroke-dasharray", (415 * b / 100) + " 553"); $("#lsp").textContent = b ? b + "%" : "Off"; }
function lsDialPct(e) { const r = $("#lsdl").getBoundingClientRect(), d = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI, rel = ((d - 135) % 360 + 360) % 360; return Math.max(1, Math.min(100, Math.round((rel > 270 ? (rel > 315 ? 0 : 270) : rel) / 270 * 100))); }
function lsCtK(e) { const r = $("#lsct").getBoundingClientRect(), a = states[LS.id].attributes, mn = a.min_color_temp_kelvin || 2000, mx = a.max_color_temp_kelvin || 6500, f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); return { f: f, k: Math.round(mn + f * (mx - mn)) }; }
document.addEventListener("pointerdown", e => {
  const lt = e.target.closest("#lsh");
  if (lt) {
    const dl = e.target.closest("#lsdl"), ct = e.target.closest("#lsct");
    if (dl) { dl._d = Infinity; dl.setPointerCapture(e.pointerId); dl._v = lsDialPct(e); lsDial(dl._v); }
    else if (ct) { ct._d = Infinity; ct.setPointerCapture(e.pointerId); const c = lsCtK(e); ct._k = c.k; $("i", ct).style.display = ""; $("i", ct).style.left = c.f * 100 + "%"; }
    return;
  }
  const el = e.target.closest('.tl[data-e], .bd[data-e]'); if (!el || (e.pointerType === "mouse" && e.button !== 0) || e.target.closest("button, input, a")) return;
  const a = (states[el.dataset.e] || { attributes: {} }).attributes, b0 = a.brightness != null ? Math.round(a.brightness / 2.55) : 0;
  LP = { el: el, id: el.dataset.e, x: e.clientX, y: e.clientY, v0: b0, w: el.offsetWidth || 160, drag: false, lp: false, can: !el.closest(".hsc,.cpanel,.cps,.cpl"), t: 0 };
  LP.t = setTimeout(() => { if (!LP || LP.drag) return; const id = LP.id, st = states[id]; if (!st) return; LP.lp = true; el._nc = 1; if (navigator.vibrate) try { navigator.vibrate(12); } catch (_) {}
    if (id.indexOf("light.") === 0 && (lsDims(st.attributes) || lsCol(st.attributes))) lsOpen(id); else lsInfo(el.dataset.s || id, el); }, 450);
}, true);
document.addEventListener("pointermove", e => {
  const dl = e.target.closest && e.target.closest("#lsdl"), ct = e.target.closest && e.target.closest("#lsct");
  if (dl && dl._d === Infinity) { dl._v = lsDialPct(e); lsDial(dl._v); return; }
  if (ct && ct._d === Infinity) { const c = lsCtK(e); ct._k = c.k; $("i", ct).style.left = c.f * 100 + "%"; return; }
  if (!LP || LP.lp) return;
  const dx = e.clientX - LP.x, dy = e.clientY - LP.y, el = LP.el;
  if (!LP.drag) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    clearTimeout(LP.t);
    if (LP.can && LP.id.indexOf("light.") === 0 && Math.abs(dx) > Math.abs(dy) && el.classList.contains("dim") && el.classList.contains("on")) { LP.drag = true; el.classList.add("drag"); el._d = Infinity; try { el.setPointerCapture(e.pointerId); } catch (_) {} } else { LP = null; return; }
  }
  const v = Math.max(1, Math.min(100, Math.round(LP.v0 + dx / LP.w * 100))); LP.v = v; el.style.setProperty("--b", v + "%"); const t = $(".ts2", el); if (t) t.textContent = v + "%";
}, true);
const lpEnd = e => {
  const dl = $("#lsdl"), ct = $("#lsct");
  if (dl && dl._d === Infinity) { dl._d = Date.now() + 1500; call("light", "turn_on", LS.id, { brightness_pct: dl._v }); }
  if (ct && ct._d === Infinity) { ct._d = Date.now() + 1500; call("light", "turn_on", LS.id, { color_temp_kelvin: ct._k }); }
  if (!LP) return; clearTimeout(LP.t); const el = LP.el;
  if (LP.drag) { el.classList.remove("drag"); el._d = Date.now() + 1500; el._nc = 1; call("light", "turn_on", LP.id, { brightness_pct: LP.v }); }
  if (el._nc) setTimeout(() => { el._nc = 0; }, 450);
  LP = null;
};
["pointerup", "pointercancel"].forEach(ev => document.addEventListener(ev, lpEnd, true));
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest(".tl, .bd"); if (t && t._nc) { e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest('.tl[data-e], .bd[data-e]')) e.preventDefault(); });
$("#lsh").addEventListener("click", e => {
  if (e.target.closest('[data-ls="x"]')) { lsClose(); return; }
  if (e.target.closest("#lsw")) { call("light", "toggle", LS.id); return; }
  const c = e.target.closest("[data-rgb]"); if (c) { call("light", "turn_on", LS.id, { rgb_color: c.dataset.rgb.split(",").map(Number) }); return; }
  const S = CONFIG.scenes, sr = e.target.closest("[data-lsr]"), sg = e.target.closest("[data-lsg]");   // same scripts the Scenes page uses
  if (sr) { const x = S.rooms[sr.dataset.lsr]; send({ type: "call_service", domain: "script", service: "toggle_or_apply_dynamic_scene", service_data: { room_lights: x.l, presence_automation: x.p, room_boolean: x.b, room_scene_tracker: x.t } }); }
  else if (sg) { const x = S.lights[sg.dataset.lsg]; send({ type: "call_service", domain: "script", service: "toggle_or_apply_gradient_scene", service_data: { select_entity: x.s, light_entity: x.l, speed_entity: x.v } }); }
  else if (e.target.closest("[data-lsa]")) { lsClose(); location.hash = "#scenes"; }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && LS.id) lsClose(); });
function chgH(e) {
  const t = e.target; if (t.tagName !== "INPUT") return;
  const id = t.closest("[data-e]").dataset.e, d = id.split(".")[0];
  if (d === "light") call("light", "turn_on", id, { brightness_pct: +t.value });
  else if (d === "cover") { const cur = (states[id] && states[id].attributes.current_position) || 0; call("cover", "set_cover_position", id, { position: +t.value }); if (+t.value !== cur) covMark(id, +t.value > cur ? "opening" : "closing"); }
};
$("#rl").className = "rooms rooms2"; $("#rv").onclick = tapH; $("#cpp").onclick = e => { if (e.target.id === "cpp" || e.target.closest("[data-cpc]")) { $("#cpp").classList.remove("on"); return; } const ct = e.target.closest("[data-cpt]"); if (ct) { const L = $("#cpp .cpl"); CPT[L.dataset.rid] = +ct.dataset.cpt; cpShow(L.dataset.rid); return; } tapH(e); }; $("#rv").onchange = chgH;

