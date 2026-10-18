// ---------- scenes ----------
let scMode = "preset";
let scSheet = false; let scTab = 0, scCol = false; try { scCol = localStorage.getItem("dashScCol") === "1"; } catch (_) {}
function scPanel(g) {
  const S = CONFIG.scenes, G = S.groups; let body;
  if (g) body = hsw('<div class="chips tabs sctb">' + G.map((x, i) => '<button class="chip' + (i === scTab ? " on" : "") + '" data-st="' + i + '">' + mdi(x[1]) + '<span>' + esc(x[0]) + '</span></button>').join("") + '</div>') + '<div class="srl">' + G[scTab][2].map(i => '<div class="sr" data-r="' + i + '" style="--rc:' + S.rc[i] + '"><i class="sbd">' + mdi(S.ri[i]) + '</i><b>' + esc(S.rooms[i].n) + '</b><span class="ts2">--</span></div>').join("") + '</div>';
  else body = '<div class="srl">' + S.lights.map((l, i) => '<div class="sr" data-g="' + i + '" style="--rc:var(--lit,#f6bd60)"><i class="sbd">' + mdi("lightbulb") + '</i><b>' + esc(l.n) + '</b><span class="ts2">--</span></div>').join("") + '</div>';
  const ctl = '<div class="lbl np2">Scenes control</div>' + [[E("dynBrightness"), "Brightness", "brightness-6"], [E("dynInterval"), "Interval", "timer"]].map(x => '<div class="mv"><span>' + mdi(x[2]) + ' ' + x[1] + '</span><input type="range" data-nb="' + x[0] + '"><b class="nbv"></b></div>').join("") +
    '<div class="sr stp" data-stop="1"><i class="sbd">' + mdi("stop-circle") + '</i><b>Stop scenes</b><span class="ts2">--</span></div>';
  const col = isMobile() ? !scSheet : scCol, dir = CONFIG.url + (S.imageDir || "/local/hue/") + (g ? "raw/" : "multi_color/");
  body = '<div class="lbl scpk">Scene</div>' + hsw('<div class="scstp">' + (g ? S.preset : S.gradient).map(c => c[1].map(x => '<div class="sc" data-v="' + x[1] + '"><img loading="lazy" alt="" src="' + dir + x[0] + '.webp"><span>' + esc(title(x[1])) + '</span></div>').join("")).join("") + '</div>') + '<div class="lbl scpk">Apply to</div>' + body;
  return '<div class="scbk" data-sch="1"></div><div class="pn sct' + (col ? " col" : "") + '"><div class="sch" data-sch="1"><i class="schi" id="scth">' + mdi("palette") + '</i><div class="sck"><span class="lbl">Scene</span><b class="h3" id="scn">--</b><div class="sm">' + (g ? "Select a room to apply this scene" : "Tap a light to apply the scene") + '</div><div class="sm scsm" id="scsum"></div></div><span class="schc">' + mdi("chevron-down") + '<i class="schx">' + mdi("close") + '</i></span></div><div class="scb">' + body + ctl + '</div></div>';
}
function drawScenes() {
  const g = scMode === "preset", S = CONFIG.scenes, dir = CONFIG.url + (CONFIG.scenes.imageDir || "/local/hue/") + (g ? "raw/" : "multi_color/");
  $("#scenes").innerHTML = '<div class="eh" style="margin-bottom:14px"><div class="chips tabs"><button class="chip" data-md="preset">PRESETS</button><button class="chip" data-md="gradient">GRADIENT</button></div><div class="lbl" id="scsel" style="margin-left:auto"></div></div>' +
    '<div class="scl"><div>' + (g ? S.preset : S.gradient).map(c => '<div class="lbl" style="margin:6px 0 10px">' + esc(c[0]) + '</div><div class="gal" style="margin-bottom:16px">' + c[1].map(x => '<div class="sc" data-v="' + x[1] + '"><img loading="lazy" alt="" src="' + dir + x[0] + '.webp"><span>' + esc(title(x[1])) + '</span></div>').join("") + '</div>').join("") + '</div>' + scPanel(g) + '</div>';
  updScenes();
}
function updScenes() {
  const v = sv(E("dynSelected")) || "", S = CONFIG.scenes;
  $("#scsel").textContent = v ? "SCENE: " + title(v).toUpperCase() : "NO SCENE SELECTED";
  $("#scn").textContent = v ? title(v) : "No scene selected";
  { const th = $("#scth"); let fn = ""; [[S.preset, "raw/"], [S.gradient, "multi_color/"]].forEach(L => L[0].forEach(c => c[1].forEach(x => { if (!fn && x[1] === v) fn = CONFIG.url + (CONFIG.scenes.imageDir || "/local/hue/") + L[1] + x[0] + ".webp"; })));
    if (th) { th.classList.toggle("has", !!v); const im = $("img", th); if (v && fn) { if (!im || im.getAttribute("src") !== fn) th.innerHTML = '<img alt="" src="' + fn + '">'; } else if (im || !$("svg", th)) th.innerHTML = mdi("palette"); } }
  $$("#scenes .sc").forEach(el => el.classList.toggle("on", el.dataset.v === v));
  $$("#scenes [data-md]").forEach(b => b.classList.toggle("on", b.dataset.md === scMode));
  $$("#scenes [data-r]").forEach(el => { const t = sv(S.rooms[el.dataset.r].t) || ""; el.classList.toggle("on", !!t); $(".ts2", el).textContent = t ? title(t) : "OFF"; });
  $$("#scenes [data-g]").forEach(el => { const l = S.lights[el.dataset.g], on = isOn(l.l); el.classList.toggle("on", on); $(".ts2", el).textContent = on ? title(sv(l.s) || "ON") : "OFF"; });
  $$("#scenes [data-nb]").forEach(r => { const s = states[r.dataset.nb]; if (!s) return; const a = s.attributes; r.min = a.min != null ? a.min : 0; r.max = a.max != null ? a.max : 100; r.step = a.step || 1; if (document.activeElement !== r) r.value = s.state; $(".nbv", r.parentNode).textContent = Math.round(r.value); });
  { const sm = $("#scsum"), num = k => { const x = states[E(k)], v = x ? Math.round(+x.state) : NaN; return isNaN(v) ? "" : v; }, bb = num("dynBrightness"), iv = num("dynInterval"); if (sm) sm.textContent = [scMode === "preset" ? (S.groups[scTab] || [""])[0] : "Gradient", bb !== "" ? "Brightness " + bb : "", iv !== "" ? "Interval " + iv : ""].filter(Boolean).join(" · "); }
  const st = $("#scenes [data-stop]"); if (st) { const on = isOn(E("dynStop")); st.classList.toggle("on", on); $(".ts2", st).textContent = on ? "ON" : "OFF"; }
}
$("#scenes").oninput = e => { const r = e.target; if (r.dataset.nb) $(".nbv", r.parentNode).textContent = Math.round(r.value); };
$("#scenes").onchange = e => { const r = e.target; if (r.dataset.nb) call("input_number", "set_value", r.dataset.nb, { value: +r.value }); };
$("#scenes").onclick = e => {
  const md = e.target.closest("[data-md]"), sc = e.target.closest(".sc"), r = e.target.closest("[data-r]"), g = e.target.closest("[data-g]"), S = CONFIG.scenes;
  const stb = e.target.closest("[data-st]"), sch = e.target.closest("[data-sch]"), stp = e.target.closest("[data-stop]");
  if (md) { const old = scMode; scMode = md.dataset.md; drawScenes(); if (scMode !== old) txGo($("#scenes .scl > div"), scMode === "gradient" ? 1 : -1, true); }
  else if (stb) { const old = scTab; scTab = +stb.dataset.st; $("#scenes .scbk").remove(); $("#scenes .sct").outerHTML = scPanel(true); updScenes(); scStripGo(); if (scTab !== old) txGo($("#scenes .srl"), scTab > old ? 1 : -1, true); }
  else if (sch) { const p0 = $("#scenes .sct"), c = !p0.classList.contains("col"); if (sch.classList.contains("scbk") && !c) return;
    const ap = () => { const p = $("#scenes .sct"); if (!p) return; p.classList.toggle("col", c); $("#scenes").classList.toggle("scop", !c); document.body.classList.toggle("pill-open", !c && isMobile());
      if (isMobile()) { scSheet = !c; if (c) pillIn(p); else { shIn(p, $("#scenes .scbk")); scStripGo(); } } else { scCol = c; try { localStorage.setItem("dashScCol", scCol ? "1" : "0"); } catch (_) {} } };
    if (c && isMobile()) shShut(p0, $("#scenes .scbk"), ap); else ap(); }
  else if (stp) call("input_boolean", "toggle", E("dynStop"));
  else if (sc) call("input_text", "set_value", E("dynSelected"), { value: sc.dataset.v });
  else if (r) { const x = S.rooms[r.dataset.r]; send({ type: "call_service", domain: "script", service: "toggle_or_apply_dynamic_scene", service_data: { room_lights: x.l, presence_automation: x.p, room_boolean: x.b, room_scene_tracker: x.t } }); }
  else if (g) { const x = S.lights[g.dataset.g]; send({ type: "call_service", domain: "script", service: "toggle_or_apply_gradient_scene", service_data: { select_entity: x.s, light_entity: x.l, speed_entity: x.v } }); }
};

