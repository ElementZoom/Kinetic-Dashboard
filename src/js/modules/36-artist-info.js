// ---------- Artist info (Media page "Artist" tab · Now Playing sheet "Artist" page) · Wikipedia, fetched by this browser ----------
// Needs no key. Home Assistant only knows the artist's name, so the bio and photo come from Wikipedia's public API (the name is sent there, the same way lyrics are looked up on lrclib.net).
// config: artistInfo: { enabled: true, lang: "en" }   (enabled: false hides the Artist tab and page)
Object.assign(MDI, { "open-in-new": "M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" });
const AI = { cache: {}, busy: {}, more: false, tab: "lyrics" };
try { AI.tab = localStorage.getItem("dashLyTab") === "artist" ? "artist" : "lyrics"; AI.cache = JSON.parse(localStorage.getItem("dashArtist") || "{}") || {}; } catch (_) { AI.cache = {}; }
const aiOn = () => !CONFIG.artistInfo || CONFIG.artistInfo.enabled !== false;
const aiSave = () => { try { const k = Object.keys(AI.cache).filter(x => AI.cache[x].st === "ok" || AI.cache[x].st === "none").sort((x, y) => AI.cache[y].t - AI.cache[x].t).slice(0, 40), o = {}; k.forEach(x => { o[x] = AI.cache[x]; }); localStorage.setItem("dashArtist", JSON.stringify(o)); } catch (_) {} };
const aiNames = full => { const f = String(full || "").split(/\s*[,;]\s*/)[0].trim(), all = String(full || "").trim(); return (f ? [f] : []).concat(all && all !== f ? [all] : []); };   // Spotify lists every artist on a song ("A, B"): the first one is the artist, the whole text is the fallback
function aiRedraw() { LY.drawn = ""; try { lyrUpdate(); } catch (_) {} queueNp(); }
async function aiFetch(name) {
  const lang = (CONFIG.artistInfo && CONFIG.artistInfo.lang) || "en", q = o => Object.keys(o).map(k => k + "=" + encodeURIComponent(o[k])).join("&");
  const r = await fetch("https://" + lang + ".wikipedia.org/w/api.php?" + q({ action: "query", format: "json", origin: "*", generator: "search", gsrsearch: '"' + name + '" (musician OR singer OR band OR "disc jockey" OR rapper OR producer OR duo OR songwriter)', gsrlimit: 4, prop: "extracts|pageimages|info", inprop: "url", exintro: 1, explaintext: 1, exchars: 900, piprop: "thumbnail", pithumbsize: 640 }));
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json(), P = d && d.query && d.query.pages ? Object.keys(d.query.pages).map(k => d.query.pages[k]).sort((x, y) => x.index - y.index) : [], nm = name.toLowerCase();
  const p = P.filter(x => /(musician|singer|band|disc jockey|\bdj\b|rapper|producer|composer|duo|songwriter|vocalist)/i.test(x.extract || "") && ((x.title || "").toLowerCase().indexOf(nm) > -1 || (x.extract || "").toLowerCase().indexOf(nm) > -1))[0];
  return p ? { name: name, bio: String(p.extract || "").replace(/\n{2,}/g, "\n").trim(), img: p.thumbnail && /^https:\/\//.test(p.thumbnail.source || "") ? p.thumbnail.source : "", url: /^https:\/\//.test(p.fullurl || "") ? p.fullurl : "" } : null;
}
function aiGet(c) {   // { st: "load" | "ok" | "none" | "err", d }: cached for a month, a failed lookup is tried again after a minute
  const key = c[0].toLowerCase(), e = AI.cache[key], age = e ? Date.now() - e.t : 0;
  if (e && (e.st === "ok" || e.st === "none") && age < 2592e6) return e;
  if (e && e.st === "err" && age < 60000) return e;
  if (!AI.busy[key]) {
    AI.busy[key] = 1;
    (async () => { for (const n of c) { const d = await aiFetch(n); if (d) return d; } return null; })()
      .then(d => { AI.cache[key] = { st: d ? "ok" : "none", d: d, t: Date.now() }; })
      .catch(x => { AI.cache[key] = { st: "err", d: null, t: Date.now(), m: String(x && x.message || x) }; })
      .then(() => { delete AI.busy[key]; aiSave(); aiRedraw(); });
  }
  return e && (e.st === "ok" || e.st === "none") ? e : { st: "load", d: null };
}
const aiLink = artist => aiOn() && artist ? '<button class="ai-nm" data-ai="open" aria-label="Artist info: ' + esc(artist) + '">' + esc(artist) + mdi("chevron-right") + '</button>' : esc(artist || "");   // the artist's name on a player card opens the Artist tab / page
function aiHtml(ctl) {
  const s = states[ctl] || { attributes: {} }, a = s.attributes, full = a.media_artist || "", c = aiNames(full);
  if (!c.length) return '<div class="ar"><div class="sm">No artist is listed for this song.</div></div>';
  const e = aiGet(c), d = e.d, nm = d ? d.name : c[0], img = d && d.img;
  const hero = '<div class="arh' + (img ? "" : " no") + '"' + (img ? ' style="background-image:url(&quot;' + esc(img) + '&quot;)"' : ' data-i="' + esc(nm.charAt(0).toUpperCase()) + '"') + '><div class="arn"><small>ARTIST</small><b>' + esc(nm) + '</b></div></div>';
  const acts = '<div class="ara"><a class="eb on" href="spotify:search:' + encodeURIComponent(nm) + '">' + mdi("spotify") + '<span>OPEN IN SPOTIFY</span></a>' + (d && d.url ? '<a class="eb" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + mdi("open-in-new") + '<span>WIKIPEDIA</span></a>' : "") + '</div>';
  const about = e.st === "ok" ? '<div><div class="lbl">About</div><div class="arb' + (AI.more ? "" : " cl") + '">' + esc(d.bio) + '</div>' + (d.bio.length > 230 ? '<button class="arm" data-ai="more">' + (AI.more ? "SHOW LESS" : "READ MORE") + '</button>' : "") + '</div>'
    : e.st === "load" ? '<div class="sm">Looking for artist info…</div>' : e.st === "none" ? '<div class="sm">No artist info found for ' + esc(nm) + '.</div>' : '<div class="sm">Couldn’t reach Wikipedia (the device needs internet).</div><button class="eb" data-ai="retry">TRY AGAIN</button>';
  let on = ""; try { const g = mpGroups().filter(x => x.ctl === ctl)[0]; on = g ? g.mem.map(fname).join(" + ") : ""; } catch (_) {}
  const rows = [["Song", a.media_title], ["Performed by", full], ["Album", a.media_album_name], ["Playing on", on]].filter(r => r[1]);
  return '<div class="ar">' + hero + acts + about + '<div><div class="lbl">This song</div>' + rows.map(r => '<div class="ark"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>').join("") + '</div></div>';
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ai]"); if (!b) return;
  e.stopPropagation(); const k = b.dataset.ai;
  if (k === "more") { AI.more = !AI.more; aiRedraw(); return; }
  if (k === "retry") { const s = states[LY.ctl] || { attributes: {} }, c = aiNames((s.attributes || {}).media_artist); if (c.length) delete AI.cache[c[0].toLowerCase()]; aiRedraw(); return; }
  if (k !== "open") return;
  if (b.closest("#npbody")) {   // Now Playing sheet: slide to the Artist page
    const sl = $("#npbody .nps"), i = sl ? (sl.dataset.pn || "").split("|").indexOf("Artist") : -1;
    if (sl && i > -1) sl.scrollTo({ left: i * npPw(sl), behavior: "smooth" });
    return;
  }
  AI.tab = "artist"; try { localStorage.setItem("dashLyTab", "artist"); } catch (_) {}
  const c = b.closest("[data-c]");
  if (isMobile()) lyOpen(c ? c.dataset.c : ""); else { if (c) LY.sel = c.dataset.c; LY.open = true; try { localStorage.setItem("dashLyr", "1"); } catch (_) {} LY.drawn = ""; lyrUpdate(); }
}, true);
