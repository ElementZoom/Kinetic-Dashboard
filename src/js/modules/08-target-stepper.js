// ---------- target stepper (shared by climate cards + home mini control) ----------
function bump(id, d) {
  const a = (states[id] || {}).attributes || {};
  const step = a.target_temp_step || 0.5, min = a.min_temp != null ? a.min_temp : 16, max = a.max_temp != null ? a.max_temp : 30;
  const t = T[id] || (T[id] = { v: null, h: 0, sent: 0 });
  const base = t.v != null ? t.v : (a.temperature != null ? a.temperature : a.current_temperature);
  if (base == null) return;
  t.v = Math.min(max, Math.max(min, +base + step * d)); t.sent = 0; showT(id);
  clearTimeout(t.h);
  t.h = setTimeout(() => {
    call("climate", "set_temperature", id, { temperature: t.v }); t.sent = 1;
    setTimeout(() => { if (t.sent) { t.v = null; t.sent = 0; showT(id); } }, 4000);
  }, 700);
}
function showT(id) {
  const a = (states[id] || {}).attributes || {}, t = T[id], v = t && t.v != null ? t.v : a.temperature;
  const txt = v != null ? f1(v) + "°" : (a.target_temp_low != null ? f1(a.target_temp_low) + "–" + f1(a.target_temp_high) : "--");
  if (cards[id]) { $(".tgt", cards[id].el).textContent = txt; const md = $(".md", cards[id].el); if (md) md.dataset.tg = txt; if (typeof cbar === "function") cbar(id); if (typeof clSub === "function") clSub(id); }
  if (id === MAIN) { $("#mt").textContent = txt; if (typeof mbSet === "function") mbSet(v); }
  $$('[data-tgt="' + id + '"]').forEach(x => { x.textContent = txt; });
}

