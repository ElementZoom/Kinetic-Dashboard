// ---------- setup check (Admin page) ----------
// Walks config.js for anything that looks like a Home Assistant entity id and lists the ones Home Assistant does not have, with where they sit in config.js,
// so a typo, a renamed device or a removed helper is found in one look instead of a tile that quietly never works. Ids the engine computes itself (VIRT) are skipped.
const SCK_DOM = new Set("light switch sensor binary_sensor input_boolean input_text input_select input_number input_datetime input_button timer counter group automation script scene cover fan climate camera media_player lock alarm_control_panel weather person device_tracker vacuum humidifier water_heater number select button siren update event todo calendar sun zone remote valve lawn_mower image text datetime schedule".split(" "));
const SCK_SKIP = new Set(["token", "url", "relevance", "scenesRegex"]);
function sckScan() {
  const found = {};   // id -> [path, ...]
  const add = (id, path) => { if (!id || typeof id !== "string" || !/^[a-z_]+\.[a-z0-9_]+$/.test(id) || !SCK_DOM.has(id.split(".")[0]) || VIRT[id]) return; (found[id] = found[id] || []).push(path); };
  const walk = (x, path, d) => {
    if (d > 7 || x == null) return;
    if (typeof x === "string") { add(x, path); return; }
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + "[" + i + "]", d + 1)); return; }
    if (typeof x !== "object") return;
    Object.keys(x).forEach(k => { if (d === 0 && SCK_SKIP.has(k)) return; add(k, path + "." + k); walk(x[k], path ? path + "." + k : k, d + 1); });
  };
  walk(CONFIG, "", 0);
  const ids = Object.keys(found), out = { total: ids.length, missing: [], unavailable: [] };
  ids.forEach(id => { const s = states[id]; if (!s) out.missing.push([id, found[id]]); else if (s.state === "unavailable") out.unavailable.push([id, found[id]]); });
  const by = (a, b) => a[0] < b[0] ? -1 : 1; out.missing.sort(by); out.unavailable.sort(by);
  return out;
}
const sckSec = p => String(p || "").replace(/^\./, "").split(/[.\[]/)[0] || "config";
function sckRow(r) { const ps = r[1].slice(0, 2).map(p => esc(String(p).replace(/^\./, ""))).join("  ·  ") + (r[1].length > 2 ? "  +" + (r[1].length - 2) : ""); return '<div class="sck-r"><b>' + esc(r[0]) + '</b><small>' + ps + '</small></div>'; }
function sckGroup(list) {
  const g = {}; list.forEach(r => { const s = sckSec(r[1][0]); (g[s] = g[s] || []).push(r); });
  return Object.keys(g).sort().map(s => '<div class="sck-g"><div class="lbl">' + esc(s) + ' (' + g[s].length + ')</div>' + g[s].map(sckRow).join("") + '</div>').join("");
}
function sckText(r) { return r.missing.map(m => m[0] + "   (" + String(m[1][0]).replace(/^\./, "") + ")").join("\n"); }
let SCK = null;
function sckSection(sec) {
  if (!ADMIN_ON() || !Object.keys(states).length) return "";
  SCK = sckScan();
  const m = SCK.missing.length, u = SCK.unavailable.length, ok = m === 0;
  let h = '<div class="sck-s ' + (ok ? "ok" : "bad") + '"><b>' + (ok ? "All " + SCK.total + " entities in config.js were found" : m + " of " + SCK.total + " entities in config.js are missing in Home Assistant") + '</b>' + (u ? '<small>' + u + ' found but unavailable right now (offline devices)</small>' : '') + '</div>';
  if (m) h += '<div class="sck-l">' + sckGroup(SCK.missing) + '</div>' + '<div class="sck-a"><button class="eb" data-sck="copy">COPY LIST</button><button class="eb" data-sck="again">CHECK AGAIN</button></div><div class="lbl sck-h">Open Developer tools → States and search for the name; if the id differs, fix it in config.js. Leave it if that part is not used in this house.</div>';
  else h += '<div class="sck-a"><button class="eb" data-sck="again">CHECK AGAIN</button></div>';
  if (u) h += '<details class="sck-u"><summary class="lbl">Unavailable now (' + u + ')</summary><div class="sck-l">' + sckGroup(SCK.unavailable) + '</div></details>';
  return sec("Setup check", h);
}
$("#admin").addEventListener("click", e => {
  const b = e.target.closest("[data-sck]"); if (!b) return;
  if (b.dataset.sck === "again") { drawAdmin(); return; }
  const t = SCK ? sckText(SCK) : "";
  const done = () => { b.textContent = "COPIED"; setTimeout(() => { if (b.isConnected) b.textContent = "COPY LIST"; }, 1800); };
  try { navigator.clipboard.writeText(t).then(done, () => sckFallback(t, done)); } catch (_) { sckFallback(t, done); }
});
function sckFallback(t, done) { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch (_) {} a.remove(); }
