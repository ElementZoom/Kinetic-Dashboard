// ---------- start-up: runs last, once every module above has been defined ----------
// This used to sit at the end of 38-energy.js. A page opened from a notification link (#active/doors, #batteries ...) draws the notifications pop-up
// straight away, and that code reaches things defined in later files (galCfg in 40-garage-alert.js): "Cannot access 'galCfg' before initialization"
// stopped the whole script, so the pop-up stayed empty and the dashboard never connected.
route(); drawGsum(); authReturn().then(r => { if (r !== "fail") connect(); });

// the floating pills (Scenes, Irrigation, Theme, Now Playing) sit a little above the phone tab bar. Its height depends on the theme and font, so measure it (--navh, read by --dock in 13-phone-nav.css)
(() => { const b = $("#btab"); if (!b) return; const set = () => { const h = b.offsetHeight; if (h) document.documentElement.style.setProperty("--navh", h + "px"); if (curPg() === "irrigation") irrFit(); }; set(); if (window.ResizeObserver) new ResizeObserver(set).observe(b); addEventListener("resize", set); })();

// tablet header squeeze: on tablets the strip shows the alarm state, named alert chips and (while music plays) the player. When they do not all fit on one row, step down:
// 1) the alarm pill and the alert chips become icon only (like on phones), 2) the player's volume slider goes. Checked on resize, on a new alert and when the player appears.
(() => {
  const hd = document.querySelector("header"); if (!hd) return;
  const bad = () => { if (hd.scrollWidth > hd.clientWidth + 1) return true; const np = $("#hnp"), hr = hd.querySelector(".hr"); if (!np || np.classList.contains("npoff") || !hr) return false; const a = np.getBoundingClientRect(), b = hr.getBoundingClientRect(), t = $("#ttl").getBoundingClientRect(); if (a.top > b.bottom - 4) return false; const art = np.querySelector(".npart"), ctl = np.querySelector(".hnpc"); if (art && ctl && art.getBoundingClientRect().right > ctl.getBoundingClientRect().left - 6) return true; return a.right > b.left + 1 || a.left < t.right - 1 || np.scrollWidth > np.clientWidth + 1; };
  const mo = new MutationObserver(() => later()), ob = () => mo.observe(hd, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "data-k", "data-more", "data-more2"] });
  const fit = () => { mo.disconnect(); hd.classList.remove("hcmp", "hcmp2"); if (innerWidth > 760 && bad()) { hd.classList.add("hcmp"); if (bad()) hd.classList.add("hcmp2"); } ob(); };
  let tm = 0; const later = () => { clearTimeout(tm); tm = setTimeout(fit, 60); };
  addEventListener("resize", later);
  fit();
})();
