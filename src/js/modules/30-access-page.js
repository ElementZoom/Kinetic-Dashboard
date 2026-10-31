// ---------- Access: which person sees which pages (Theme page, admins only) ----------
const ACC = { users: null, t: 0, err: "", fold: {} };
const accWrap = inner => '<div class="pn pg"><div class="lbl">Access</div>' + inner + '</div>';   // each person folds up and down (chevron after the name)
function accLoad() {
  if (!ME.admin || (ACC.users && Date.now() - ACC.t < 30000) || ACC.busy) return; ACC.busy = true;
  const fin = list => { ACC.busy = false; ACC.t = Date.now(); ACC.users = list; if (curPg() === "admin") drawAdmin(); };
  send({ type: "config/auth/list" }, r => {
    if (Array.isArray(r)) return fin(r.filter(u => !u.system_generated && u.is_active !== false && !u.is_owner && (u.group_ids || []).indexOf("system-admin") < 0).map(u => ({ id: u.id, name: u.name || u.username || "User" })));
    fin(Object.keys(states).filter(k => k.indexOf("person.") === 0 && states[k].attributes.user_id && states[k].attributes.user_id !== ME.id).map(k => ({ id: states[k].attributes.user_id, name: states[k].attributes.friendly_name || k.split(".")[1] })));   // no access to the user list: use the people linked to a login
  });
}
function accSec(sec) {
  accLoad();
  const ent = states[E("access")], M = accMap(), pages = RU_ALL.filter(p => !Array.isArray(CONFIG.pages) || CONFIG.pages.indexOf(p) > -1 || p === "home");
  let h = '<div class="lbl acc-h">Choose what each person can see. Admins always see everything. Changes apply on their screen straight away.</div>';
  if (!ACC.users) return accWrap(h + '<div class="acc-n">Loading people…</div>');
  if (!ACC.users.length) return accWrap(h + '<div class="acc-n">No other Home Assistant users yet. Add a person with non-admin access and they will show up here.</div>');
  const id = E("access"), cfgSet = !!(CONFIG.entities && CONFIG.entities.access);
  if (!ent) h += '<div class="acc-n acc-w">' + (cfgSet ? 'The dashboard is looking for <b>' + esc(id) + '</b>, but Home Assistant has no entity with that id. Open Developer tools → States and search for it; if the id is different, put the real one in config.js (<b>entities → access</b>). Settings → Devices &amp; services → Helpers → Text, maximum length 255.' : 'config.js has no <b>access</b> line under <b>entities</b> (or this device is still using an old copy: raise <b>?v=</b> on the config.js line and hard-refresh). Then create a text helper: Settings → Devices &amp; services → Helpers → Text, name it <b>Dashboard access</b>, maximum length 255.') + ' Until then nothing can be saved.</div>';
  h += ACC.users.map(u => {
    const k = u.id.slice(0, 8), n = M[k], on = n != null, fixed = !on && ruFind(u.name, ""), cnt = on ? RU_ALL.filter((p, i) => n & (1 << i)).length : 0;
    const rms = accRooms(), nr = on ? rms.filter((r, q) => !accBit(n, 17 + q)).length : 0, rsum = on && nr < rms.length ? " · " + nr + (nr === 1 ? " room" : " rooms") : "";
    const op = ACC.fold[k] !== false;
    return '<div class="acc-u' + (on && op ? " open" : "") + '"><div class="acc-r"><div class="acc-l"><span><b>' + esc(u.name) + '</b><small>' + (on ? cnt + (cnt === 1 ? " page" : " pages") + rsum : fixed ? "Fixed in config.js" : "Can see all pages") + '</small></span>' +
      (on ? '<button class="acf" data-acc="fold" data-u="' + k + '" aria-expanded="' + op + '" aria-label="Show or hide ' + esc(u.name) + ' settings"><i class="acct">' + mdi(op ? "chevron-up" : "chevron-down") + '</i></button>' : "") + '</div>' +
      (fixed ? "" : '<button class="accsw' + (on ? " on" : "") + '"' + (ent ? "" : " disabled") + ' data-acc="r" data-u="' + k + '" aria-label="Restrict ' + esc(u.name) + '"></button>') + '</div>' +
      (on ? '<div class="accb"><div class="acci"><div class="chips acc-c">' + pages.map(p => '<button class="chip' + (n & (1 << RU_ALL.indexOf(p)) ? " on" : "") + '" data-acc="p" data-u="' + k + '" data-v="' + RU_ALL.indexOf(p) + '">' + RU_NAME[p].toUpperCase() + '</button>').join("") + '</div>' +
        ((n & (1 << RU_ALL.indexOf("rooms"))) || (n & (1 << RU_ALL.indexOf("home"))) || (n & (1 << RU_ALL.indexOf("climate"))) ? '<div class="lbl acc-s">Rooms they can see</div><div class="acc-n">A room that is switched off is hidden everywhere for them: its tile, its climate control, and its lights, doors and windows in lists and alerts.</div><div class="chips acc-c">' + rms.map((r, q) => '<button class="chip' + (accBit(n, 17 + q) ? "" : " on") + '" data-acc="p" data-u="' + k + '" data-v="' + (17 + q) + '">' + esc(r.name).toUpperCase() + '</button>').join("") + '</div>' : "") +
        (n & (1 << RU_ALL.indexOf("security")) ? '<div class="lbl acc-s">Security</div><div class="chips acc-c">' + RU_SEC.map((x, j) => '<button class="chip' + (n & (1 << (13 + j)) ? " on" : "") + '" data-acc="p" data-u="' + k + '" data-v="' + (13 + j) + '">' + x[1].toUpperCase() + '</button>').join("") + '</div>' : "") + '</div></div>' : "") + '</div>';
  }).join("");
  return accWrap(h);
}
function accSave(M) { const v = accEncode(M); if (v.length > 255) return false; const id = E("access"); states[id] = Object.assign({}, states[id], { state: v }); call("input_text", "set_value", id, { value: v }); ruRefresh(); if (curPg() === "admin") drawAdmin(); else if (curPg() === "theme") drawPalette(); return true; }   // Access lives on the Admin page now: redraw that (it used to redraw the Theme page, so taps saved but the switch and chips never changed on screen)
function accClick(b) {
  if (b.dataset.acc === "fold") { const k = b.dataset.u, w = b.closest(".acc-u"), o = !w.classList.contains("open"); ACC.fold[k] = o; w.classList.toggle("open", o); b.setAttribute("aria-expanded", o); $(".acct", b).innerHTML = mdi(o ? "chevron-up" : "chevron-down"); return; }
  if (!states[E("access")]) return;
  const M = accMap(), k = b.dataset.u, v = +b.dataset.v, kind = b.dataset.acc;
  if (kind === "r") { if (M[k] != null) delete M[k]; else M[k] = 1 << RU_ALL.indexOf("home"); }   // a newly restricted person starts with Home only and no Security extras
  else { const n = M[k]; if (n == null) return; const nn = n ^ (1 << v); if ((v < 13 && !(nn & ((1 << 13) - 1))) || (v > 16 && accRooms().every((r, q) => accBit(nn, 17 + q)))) { b.classList.add("acc-no"); setTimeout(() => b.classList.remove("acc-no"), 600); return; } M[k] = nn; }   // at least one page stays on
  if (!accSave(M)) { const l = $("#admin .acc-h"); if (l) { l.textContent = "The access list is full (about 14 people). Remove someone first."; } }
}

