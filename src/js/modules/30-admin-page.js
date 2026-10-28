// ---------- Admin page: for Home Assistant admins only (nav link hidden for everyone else, and #admin sends other people home) ----------
// Holds what used to sit at the bottom of the Theme page: who can see which pages (Access), plus the setup check, and a few facts about this dashboard.
function drawAdmin() {
  const el = $("#admin"); if (!el || !ADMIN_ON()) return;
  const sec = (t, inner) => '<div class="pn pg"><div class="lbl">' + t + '</div>' + inner + '</div>';
  const n = Object.keys(states).length, who = ME.name ? esc(ME.name) : (CONFIG.token ? "long-lived token" : "-");
  const about = sec("This dashboard", '<div class="adm-f"><div><small>Kinetic</small><b>' + esc(ENGINE_VERSION) + '</b></div><div><small>Signed in as</small><b>' + who + '</b></div><div><small>Entities loaded</small><b>' + n + '</b></div></div>');
  el.innerHTML = '<div class="thg"><div class="thl">' + accSec(sec) + sckSection(sec) + about + '</div></div>';
}
$("#admin").addEventListener("click", e => { const ac = e.target.closest("[data-acc]"); if (ac) accClick(ac); });
