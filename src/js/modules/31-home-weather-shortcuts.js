// ---------- Home weather shortcuts ----------
[".hs", "#fcp"].forEach(q => { const x = $(q); x.style.cursor = "pointer"; x.onclick = () => { location.hash = "#weather"; }; });

