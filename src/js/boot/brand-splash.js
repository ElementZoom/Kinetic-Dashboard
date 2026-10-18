// Brand splash (config.js -> brand). Runs before the big script so the very first paint already shows the logo instead of the spinner.
// A short intro plays only on a cold start: the page was not open for brand.introAfter minutes (default 30), it is not a deep link
// (notification tap such as #view/driveway, #security ...), not the return from the login, and the device has not asked for reduced motion.
window.brandLogo = function () { var L = window.DASH_LOGO, B = (window.DASH_CONFIG || {}).brand; return L && L.svg ? { svg: L.svg, lockup: !!L.lockup } : B && B.mark ? { svg: B.mark, lockup: false } : null; };   // brand-logo.js wins over brand.mark in config.js
window.brandMark = function (s) { var g = window.brandLogo(); if (!g) return ""; return g.svg.replace(/\bid="([\w-]+)"/g, 'id="$1' + s + '"').replace(/url\(#([\w-]+)\)/g, 'url(#$1' + s + ')'); };
window.DASH_VER = "{{VERSION}}";   // the one place to change the version
(function () { try {
  var B = (window.DASH_CONFIG || {}).brand, el = document.getElementById("bootld"), r = document.documentElement, lp = "on";
  try { lp = localStorage.getItem("dashLogo") || "on"; } catch (e) {}   // Theme page -> "Start-up logo": on | load (no intro) | off (plain spinner, as before)
  var G = window.brandLogo(); if (!B || !G || !el || lp === "off") return;
  var d = document.createElement("div"); d.className = "bl"; d.innerHTML = window.brandMark("s");
  if (!G.lockup) { var n = document.createElement("b"); n.textContent = B.name || ""; var t = document.createElement("small"); t.textContent = B.tag || ""; d.appendChild(n); d.appendChild(t); }
  var vv = document.createElement("span"); vv.className = "bv"; vv.textContent = "Dashboard " + window.DASH_VER; d.appendChild(vv);
  el.appendChild(d); r.classList.add("brand"); if (G.lockup) r.classList.add("lockup"); window.__brandT0 = performance.now();
  var seen = 0, now = Date.now(), h = location.hash;
  try { seen = +localStorage.getItem("dashSeen") || 0; localStorage.setItem("dashSeen", now); } catch (e) {}
  try { if (window.parent !== window) { var P = window.parent.location, g = new URLSearchParams(P.search).get("go"); h = g ? "#" + g : (P.hash || h); } } catch (e) {}
  var deep = h && !/^#(home)?$/.test(h), back = /[?&]code=/.test(location.search), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (B.intro !== false && lp !== "load" && !deep && !back && !still && now - seen > (B.introAfter != null ? B.introAfter : 30) * 60000) { r.classList.add("intro"); window.__introEnd = performance.now() + (B.introMs || 3000); }
} catch (e) {} })();
