// ---------- start-up: runs last, once every module above has been defined ----------
// This used to sit at the end of 38-energy.js. A page opened from a notification link (#active/doors, #batteries ...) draws the notifications pop-up
// straight away, and that code reaches things defined in later files (galCfg in 40-garage-alert.js): "Cannot access 'galCfg' before initialization"
// stopped the whole script, so the pop-up stayed empty and the dashboard never connected.
route(); drawGsum(); authReturn().then(r => { if (r !== "fail") connect(); });

// the floating pills (Scenes, Irrigation, Theme, Now Playing) sit a little above the phone tab bar. Its height depends on the theme and font, so measure it (--navh, read by --dock in 13-phone-nav.css)
(() => { const b = $("#btab"); if (!b) return; const set = () => { const h = b.offsetHeight; if (h) document.documentElement.style.setProperty("--navh", h + "px"); }; set(); if (window.ResizeObserver) new ResizeObserver(set).observe(b); addEventListener("resize", set); })();
