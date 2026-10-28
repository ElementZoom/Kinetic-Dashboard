// ---------- Home weather shortcuts ----------
[[".hs", "#weather/now"], ["#fcp", "#weather/week"]].forEach(q => { const x = $(q[0]); x.style.cursor = "pointer"; x.onclick = () => { location.hash = q[1]; }; });   // the greeting opens the Now card, the Forecast card opens Next 7 days

