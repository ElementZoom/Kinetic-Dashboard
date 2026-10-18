// ---------- sign-in (replaces the long-lived token in config.js) ----------
// With no token in config.js, a device that opens the page is sent to Home Assistant's own login, comes back with a one-time code and swaps it
// for a refresh token that stays on THIS device only (localStorage "dashAuth"). Short-lived access tokens are made from it as needed.
// Inside the Home Assistant app / iframe the page reuses the HA session and shows no login. A token still in config.js is used as before.
const AUTH_CLIENT = location.origin + "/", AUTHK = "dashAuth", authErr = (code, msg) => Object.assign(new Error(code), { code: code, msg: msg });
let AUTH = null, tokP = null, tokFresh = 0, forceTok = false, loginUp = false, noBorrow = false;
try { AUTH = JSON.parse(localStorage.getItem(AUTHK) || "null"); if (!AUTH || !AUTH.refresh_token) AUTH = null; } catch (_) {}
function authSave() { try { if (AUTH && !AUTH.borrowed) localStorage.setItem(AUTHK, JSON.stringify(AUTH)); else if (!AUTH) localStorage.removeItem(AUTHK); } catch (_) {} }
function authRand() { try { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, b => ("0" + b.toString(16)).slice(-2)).join(""); } catch (_) { return String(Math.random()).slice(2) + Date.now(); } }
function authBack() { const u = new URL(location.href); ["code", "state"].forEach(k => u.searchParams.delete(k)); u.hash = ""; return u.toString(); }
function showLogin(msg) {
  loginUp = true; window.__introEnd = 0; window.__noHold = 1; bootGo();
  let el = $("#lg"); if (!el) { el = document.createElement("div"); el.id = "lg"; document.body.appendChild(el); }
  el.hidden = false;
  el.innerHTML = '<div class="lgc">' + brandBlock("lgb", "l") + '<h2>Sign in</h2><p>Use your normal Home Assistant login. This device then stays signed in until you sign out.</p>' + (msg ? '<p class="lge">' + esc(msg) + '</p>' : "") + '<button id="lgb">SIGN IN WITH HOME ASSISTANT</button></div>';
  $("#lgb").onclick = authStart;
  setStatus(false, "SIGN IN");
}
function hideLogin() { loginUp = false; const el = $("#lg"); if (el) el.hidden = true; }
function authStart() {
  const st = authRand();
  try { localStorage.setItem("dashAuthState", JSON.stringify({ s: st, h: location.hash, t: Date.now() })); } catch (_) { showLogin("This browser is blocking site storage, so the sign-in could not be kept."); return; }
  location.href = CONFIG.url + "/auth/authorize?response_type=code&client_id=" + encodeURIComponent(AUTH_CLIENT) + "&redirect_uri=" + encodeURIComponent(authBack()) + "&state=" + encodeURIComponent(st);
}
// back from Home Assistant's login with ?code=...&state=...: swap the code for tokens. Resolves "none" (not a login return), "ok" or "fail".
async function authReturn() {
  const q = new URLSearchParams(location.search), code = q.get("code"), st = q.get("state"); if (!code || !st) return "none";
  let sv = null; try { sv = JSON.parse(localStorage.getItem("dashAuthState") || "null"); } catch (_) {}
  if (!sv || sv.s !== st) return "none";
  try { localStorage.removeItem("dashAuthState"); } catch (_) {}
  history.replaceState(null, "", authBack() + (sv.h || "")); if (sv.h) route();   // the one-time code must not stay in the address bar
  try {
    const r = await fetch(CONFIG.url + "/auth/token", { method: "POST", body: new URLSearchParams({ grant_type: "authorization_code", code: code, client_id: AUTH_CLIENT }) });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) throw new Error(j.error_description || j.error || ("HTTP " + r.status));
    AUTH = { refresh_token: j.refresh_token, access_token: j.access_token, expires: Date.now() + (j.expires_in || 1800) * 1000, clientId: AUTH_CLIENT }; tokFresh = Date.now(); authSave();
    return "ok";
  } catch (x) { showLogin("Sign-in did not complete (" + (x && x.message || x) + "). Please try again."); return "fail"; }
}
// the Home Assistant page around the iframe / app already has a session: borrow its access token
async function frameToken(force) {
  let a = null; try { if (window.parent !== window) { const h = window.parent.document.querySelector("home-assistant"); a = h && h.hass && h.hass.auth; } } catch (_) {}
  if (!a) return "";
  try { if (force || a.expired) { await a.refreshAccessToken(); tokFresh = Date.now(); } } catch (_) {}
  return a.accessToken || (a.data && a.data.access_token) || "";
}
// this browser is already signed in to the Home Assistant frontend on the same address: borrow that session (never copied into dashAuth)
function borrowFrontend() {
  try {
    const t = JSON.parse(localStorage.getItem("hassTokens") || "null");
    if (t && t.refresh_token && String(t.hassUrl || "").replace(/\/$/, "") === String(CONFIG.url).replace(/\/$/, ""))
      return { refresh_token: t.refresh_token, clientId: t.clientId || AUTH_CLIENT, access_token: t.access_token, expires: t.expires || 0, borrowed: true };
  } catch (_) {}
  return null;
}
async function refreshTok() {
  let r, j = null;
  try { r = await fetch(CONFIG.url + "/auth/token", { method: "POST", body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: AUTH.refresh_token, client_id: AUTH.clientId || AUTH_CLIENT }) }); } catch (_) { throw authErr("net"); }
  try { j = await r.json(); } catch (_) {}
  if (r.ok && j && j.access_token) { AUTH.access_token = j.access_token; AUTH.expires = Date.now() + (j.expires_in || 1800) * 1000; tokFresh = Date.now(); authSave(); return; }
  if (r.status === 400 || r.status === 401 || r.status === 403) {   // Home Assistant says this sign-in is no longer valid (signed out / revoked)
    if (AUTH.borrowed) noBorrow = true; AUTH = null; authSave();
    throw authErr("login", "Your sign-in has ended. Please sign in again.");
  }
  throw authErr("net");   // server or network trouble: keep the sign-in and try again later
}
// a valid access token, whichever way this device signs in. Rejects with code "login" (needs the login screen) or "net" (try again).
function getToken(force) {
  if (CONFIG.token) return Promise.resolve(CONFIG.token);
  if (tokP) return tokP;
  const p = tokP = (async () => {
    const ft = await frameToken(force); if (ft) return ft;
    if (!AUTH && !noBorrow) AUTH = borrowFrontend();
    if (!AUTH) throw authErr("login");
    if (!force && AUTH.access_token && AUTH.expires - 60000 > Date.now()) return AUTH.access_token;
    await refreshTok(); return AUTH.access_token;
  })();
  const done = () => { if (tokP === p) tokP = null; }; p.then(done, done);
  return p;
}
function authBad() {   // Home Assistant refused the access token
  if (CONFIG.token) { setStatus(false, "BAD TOKEN"); return; }
  if (Date.now() - tokFresh < 20000) { AUTH = null; noBorrow = true; authSave(); showLogin("Home Assistant did not accept the sign-in. Please sign in again."); return; }   // a brand-new token was refused
  forceTok = true;   // it was just a stale one: the close handler reconnects with a fresh one
}
function signOut() {
  const a = AUTH; AUTH = null; noBorrow = true; authSave();
  if (a && !a.borrowed && a.refresh_token) { try { fetch(CONFIG.url + "/auth/revoke", { method: "POST", body: new URLSearchParams({ token: a.refresh_token }), keepalive: true }).catch(() => {}); } catch (_) {} }
  showLogin(); try { ws && ws.close(); } catch (_) {}
}

