// ---------- siren: red while sounding. "Siren" = on/off (10 min max), "Siren · 30 s" = timed. Either tile's tap while sounding stops everything.
const SIR = { flag: (CONFIG.siren || {}).flag || E("sirenFlag"), s30: "script." + ((CONFIG.siren || {}).script30 || "unset"), max: 600000 };
function sirenSt() {
  const f = states[SIR.flag], sc = states[SIR.s30], lt = +(localStorage.getItem("dashSirT") || 0);
  const timed = !!sc && sc.state === "on", tm = timed ? Math.max(0, 30 - Math.round((Date.now() - Date.parse(sc.last_changed)) / 1000)) : 0;
  const tog = f ? (f.state === "on" && Date.now() - Date.parse(f.last_changed) < SIR.max) : (lt && Date.now() - lt < SIR.max);
  return { timed: timed, left: tm, tog: !!tog, any: timed || !!tog };
}
function sirenUpd(el) {
  const k = el.dataset.sir, st = sirenSt(), on = k === "timed" ? st.timed : st.any;
  el.classList.remove("na"); el.classList.toggle("on", on);
  $(".ts2", el).textContent = on ? (k === "timed" ? "SOUNDING · " + st.left + " s" : "SOUNDING") : "OFF";
}
function sirenTap(k) {
  const st = sirenSt(), sirOff = () => { try { localStorage.removeItem("dashSirT"); } catch (_) {} if (st.timed) call("script", "turn_off", SIR.s30); call("script", "alarm_siren_off"); if (states[SIR.flag]) call("input_boolean", "turn_off", SIR.flag); };
  if (st.any) sirOff();
  else if (k === "timed") call("script", (CONFIG.siren || {}).script30 || "unset");
  else { try { localStorage.setItem("dashSirT", String(Date.now())); } catch (_) {} call("script", "alarm_siren_on"); if (states[SIR.flag]) call("input_boolean", "turn_on", SIR.flag); }
  setTimeout(() => $$("#alp [data-sir]").forEach(sirenUpd), 250);
}
setInterval(() => { if (document.hidden) return; $$("#alp [data-sir]").forEach(sirenUpd); }, 1000);
function tapH(e) {
  const t = e.target; if (t.tagName === "INPUT") return;
  if (t.closest("[data-cpo]")) { $("#cpp").classList.add("on"); hsAll(); return; }
  const rc = t.closest("[data-rcv]");
  if (rc && curRoom) { const m = curPanels[+rc.closest("[data-pi]").dataset.pi]; if (m && m.ids.length) { call("cover", rc.dataset.rcv + "_cover", m.ids); covMark(m.ids, rc.dataset.rcv === "open" ? "opening" : "closing"); updTiles(); } return; }
  const ro = t.closest("[data-roff]");
  if (ro && curRoom) { const m = curPanels[+ro.dataset.roff], ids = m ? m.off.filter(x => isOn(x) && !npGone(x)) : [], now = Date.now(); if (ids.length) { ids.forEach(x => { NPOFF[x] = now; }); call("homeassistant", "turn_off", ids); updTiles(); setTimeout(updTiles, 12100); } return; }
  const c = t.closest("[data-c]");
  if (c) {
    const id = c.dataset.c, s = states[id], m = s ? s.attributes.hvac_modes || [] : [];
    if (t.dataset.d) bump(id, +t.dataset.d);
    else if (t.dataset.p) call("climate", "set_hvac_mode", id, { hvac_mode: s && s.state !== "off" ? "off" : (m.indexOf("heat_cool") > -1 ? "heat_cool" : "heat") });
    return;
  }
  const el = t.closest("[data-e]"); if (!el) return;
  const id = el.dataset.e, d = id.split(".")[0];
  if (el.dataset.cf && !t.dataset.a) {   // confirm-before-acting tiles (garage door)
    if (!el.dataset.arm) {   // first tap: the tile turns amber, pulses and counts down 3 s (CSS [data-arm]); a second tap inside that time acts
      el.dataset.arm = 1; const w = "TAP AGAIN TO " + (el.dataset.s ? (isOn(el.dataset.s) ? "CLOSE" : "OPEN") : (isOn(id) ? "TURN OFF" : "TURN ON")); let n = 3; $(".ts2", el).textContent = w + " · " + n;
      clearInterval(el._ai); clearTimeout(el._at); el._ai = setInterval(() => { n--; if (n > 0 && el.dataset.arm) $(".ts2", el).textContent = w + " · " + n; }, 1000);
      el._at = setTimeout(() => { clearInterval(el._ai); delete el.dataset.arm; updTiles(); }, 3000); return; }
    clearInterval(el._ai); clearTimeout(el._at); delete el.dataset.arm;
  }
  if (el.dataset.sir) sirenTap(el.dataset.sir);
  else if (t.dataset.a) { call("cover", t.dataset.a, id); if (t.dataset.a !== "stop_cover") covMark(id, t.dataset.a === "open_cover" ? "opening" : "closing"); else { delete COVMV[id]; updTiles(); } }
  else if (el.dataset.sc) send({ type: "call_service", domain: "script", service: el.dataset.sc });
  else if (d === "select") selOpen(id);
  else if (d === "light" || d === "switch" || d === "input_boolean" || d === "fan" || d === "automation") { if (npTab === "active" && el.closest("#np") && isOn(id)) npDismiss(id); if (!el.closest("#np") && npGone(id)) { delete NPOFF[id]; call(d, "turn_on", id); } else call(d, "toggle", id); }
};
function selOpen(id) {
  const s = states[id]; if (!s) return; const o = s.attributes.options || [];
  $("#sp").innerHTML = '<div class="spb"><div class="lbl">' + esc(s.attributes.friendly_name || id) + '</div>' + o.map(x => '<button data-o="' + esc(x) + '"' + (x === s.state ? ' class="on"' : "") + '>' + esc(title(x)) + (x === s.state ? mdi("check") : "") + '</button>').join("") + '</div>';
  $("#sp").dataset.e = id; $("#sp").classList.remove("out"); $("#sp").style.display = "flex";
}
$("#sp").onclick = e => { const b = e.target.closest("[data-o]"); if (b) call("select", "select_option", $("#sp").dataset.e, { option: b.dataset.o }); if (b || e.target.id === "sp") popOut($("#sp")); };
// sliders: ignore state echoes while dragging (they made the thumb jump back), and show the value live
document.addEventListener("pointerdown", e => { if (e.target.type === "range") e.target._d = Infinity; }, true);
["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(ev => document.addEventListener(ev, () => { $$("input[type=range]").forEach(r => { if (r._d === Infinity) r._d = Date.now() + 1500; }); }, true));
document.addEventListener("input", e => { const r = e.target, el = r.type === "range" && r.closest("[data-e]"); if (!el || el.dataset.sub) return; const d = el.dataset.e.split(".")[0]; if (d === "light" || d === "cover") { const t = $(".ts2", el); if (t) t.textContent = r.value + "%"; } }, true);

