// ---------- start-up: runs last, once every module above has been defined ----------
// This used to sit at the end of 38-energy.js. A page opened from a notification link (#active/doors, #batteries ...) draws the notifications pop-up
// straight away, and that code reaches things defined in later files (galCfg in 40-garage-alert.js): "Cannot access 'galCfg' before initialization"
// stopped the whole script, so the pop-up stayed empty and the dashboard never connected.
route(); drawGsum(); authReturn().then(r => { if (r !== "fail") connect(); });
