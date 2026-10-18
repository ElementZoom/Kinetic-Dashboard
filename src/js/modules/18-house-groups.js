// ---------- whole-house groups, built here instead of in HA (a real HA group with the same name still wins) ----------
function vGroups() {
  const G = CONFIG.derived.groups || {};
  Object.keys(G).forEach(gid => {
    G[gid].forEach(m => { VGM[m] = 1; });
    if (REAL[gid]) return;
    const mem = G[gid], dom = gid.split(".")[0], cov = /^cover\./.test(mem[0]);
    const on = mem.some(m => { const x = states[m] && states[m].state; return cov ? (x === "open" || x === "opening") : x === "on" || x === "open" || x === "unlocked"; });
    const st = cov ? (on ? "open" : "closed") : (on ? "on" : "off"), old = states[gid];
    if (old && old.state === st && old.attributes.entity_id && old.attributes.entity_id.length === mem.length) return;
    vBusy = 1; try { setState({ entity_id: gid, state: st, attributes: { entity_id: mem, friendly_name: gid }, last_changed: old && old.state === st ? old.last_changed : new Date().toISOString(), last_updated: new Date().toISOString(), context: {} }); } finally { vBusy = 0; }
  });
}
const rawSv = id => { const s = states[id]; return s && s.state !== "unavailable" && s.state !== "unknown" ? s.state : null; };
const sv = id => VIRT[id] ? VIRT[id]() : rawSv(id);
