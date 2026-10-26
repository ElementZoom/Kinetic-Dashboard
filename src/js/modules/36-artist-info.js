// ---------- Artist info (Media page "Artist" tab · Now Playing sheet "Artist" page) · Wikipedia, fetched by this browser ----------
// Needs no key. Home Assistant only knows the artist's name, so the bio and photo come from Wikipedia's public API (the name is sent there, the same way lyrics are looked up on lrclib.net).
// config: artistInfo: { enabled: true, lang: "en", deezer: false }   (enabled: false hides the Artist tab and page; deezer: true also asks Deezer for a better photo and the fan count)
Object.assign(MDI, { "open-in-new": "M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" });
const AI = { cache: {}, busy: {}, more: false, tab: "lyrics" };
try { AI.tab = localStorage.getItem("dashLyTab") === "artist" ? "artist" : "lyrics"; AI.cache = JSON.parse(localStorage.getItem("dashArtist3") || "{}") || {}; } catch (_) { AI.cache = {}; }
const aiOn = () => !CONFIG.artistInfo || CONFIG.artistInfo.enabled !== false;
const aiSave = () => { try { const k = Object.keys(AI.cache).filter(x => AI.cache[x].st === "ok" || AI.cache[x].st === "none").sort((x, y) => AI.cache[y].t - AI.cache[x].t).slice(0, 40), o = {}; k.forEach(x => { o[x] = AI.cache[x]; }); localStorage.setItem("dashArtist3", JSON.stringify(o)); } catch (_) {} };
const aiNames = full => { const f = String(full || "").split(/\s*[,;]\s*/)[0].trim(), all = String(full || "").trim(); return (f ? [f] : []).concat(all && all !== f ? [all] : []); };   // Spotify lists every artist on a song ("A, B"): the first one is the artist, the whole text is the fallback
function aiRedraw() { LY.drawn = ""; try { lyrUpdate(); } catch (_) {} queueNp(); }
const aiNorm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
const aiMusic = /(musician|singer|band|disc jockey|\bdj\b|rapper|producer|composer|duo|songwriter|vocalist|group|ensemble)/i;
function aiPick(P, name) {   // the page must BE the artist: its title is the name, with at most a "(band)" / "(singer)" style tag, and it reads like a musician (a page that only mentions the name is skipped)
  const nm = aiNorm(name);
  return P.filter(x => { const t = String(x.title || ""), m = t.match(/\s*\(([^)]*)\)\s*$/), base = m ? t.slice(0, m.index) : t; return aiNorm(base) === nm && (!m || aiMusic.test(m[1])) && aiMusic.test(x.extract || ""); })[0];
}
function aiFacts(bio) {   // a short description and the year it started, read from the first lines of the Wikipedia text
  const first = String(bio || "").split(/(?<=[.!?])\s/)[0] || "", m = first.match(/\b(?:is|was|are|were)\s+(?:an?|the)\s+([^.,;(]{3,70}?)(?=\s+(?:from|based|formed|founded|that|who|in|of|best|known|consisting|comprising)\b|[,.;(]|$)/), y = String(bio || "").match(/\b(?:formed|founded|established|started|began|debuted|active)\b[^.]{0,50}?\b((?:19|20)\d{2})\b/i);
  return { kind: m && aiMusic.test(m[1]) ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : "", since: y ? y[1] : "" };
}
function aiDeezer(name) {   // optional: Deezer's artist photo and fan count (a script tag, because Deezer's API has no CORS); gives up quietly after 6 s
  return new Promise(res => {
    const cb = "aiDz" + Date.now() + Math.floor(Math.random() * 1e4), sc = document.createElement("script");
    const done = v => { clearTimeout(tm); try { delete window[cb]; } catch (_) { window[cb] = null; } sc.remove(); res(v); }, tm = setTimeout(() => done(null), 6000);
    window[cb] = d => { const a = d && d.data ? d.data.filter(x => aiNorm(x.name) === aiNorm(name))[0] : null; done(a ? { img: /^https:\/\//.test(a.picture_xl || a.picture_big || "") ? (a.picture_xl || a.picture_big) : "", fans: +a.nb_fan || 0, url: /^https:\/\//.test(a.link || "") ? a.link : "" } : null); };
    sc.onerror = () => done(null); sc.src = "https://api.deezer.com/search/artist?limit=5&output=jsonp&callback=" + cb + "&q=" + encodeURIComponent(name); document.head.appendChild(sc);
  });
}
async function aiFetch(name) {
  const ai = CONFIG.artistInfo || {}, lang = ai.lang || "en", q = o => Object.keys(o).map(k => k + "=" + encodeURIComponent(o[k])).join("&");
  const dz = ai.deezer === true ? aiDeezer(name) : Promise.resolve(null);
  let p = null, err = null;
  const props = { action: "query", format: "json", origin: "*", prop: "extracts|pageimages|info", inprop: "url", exintro: 1, explaintext: 1, exchars: 900, piprop: "thumbnail", pithumbsize: 640 };
  const pages = async o => { const r = await fetch("https://" + lang + ".wikipedia.org/w/api.php?" + q(Object.assign({}, props, o))); if (!r.ok) throw new Error("HTTP " + r.status); const d = await r.json(); return d && d.query && d.query.pages ? Object.keys(d.query.pages).map(k => d.query.pages[k]).sort((x, y) => (x.index || 99) - (y.index || 99)) : []; };
  try {
    p = aiPick(await pages({ titles: [name, name + " (band)", name + " (singer)", name + " (musician)", name + " (rapper)", name + " (DJ)", name + " (duo)"].join("|"), redirects: 1 }), name);   // the page with exactly this title first: a search can rank other pages (discography, awards) above a very famous artist
    if (!p) p = aiPick(await pages({ generator: "search", gsrsearch: '"' + name + '" (musician OR singer OR band OR "disc jockey" OR rapper OR producer OR duo OR songwriter)', gsrlimit: 8 }), name);
  } catch (x) { err = x; }
  const z = await dz;
  if (err && !z) throw err;
  if (!p && !z) return null;
  const bio = p ? String(p.extract || "").replace(/\n{2,}/g, "\n").trim() : "", f = aiFacts(bio);
  return { name: name, bio: bio, kind: f.kind, since: f.since, fans: z ? z.fans : 0, img: z && z.img ? z.img : p && p.thumbnail && /^https:\/\//.test(p.thumbnail.source || "") ? p.thumbnail.source : "", url: p && /^https:\/\//.test(p.fullurl || "") ? p.fullurl : "", dz: z && z.url || "" };
}
function aiGet(c) {   // { st: "load" | "ok" | "none" | "err", d }: cached for a month, a failed lookup is tried again after a minute
  const key = c[0].toLowerCase(), e = AI.cache[key], age = e ? Date.now() - e.t : 0;
  if (e && ((e.st === "ok" && age < 2592e6) || (e.st === "none" && age < 216e5))) return e;   // a found artist is kept for a month, "nothing found" only for 6 hours so a fixed lookup is not hidden by an old miss
  if (e && e.st === "err" && age < 60000) return e;
  if (!AI.busy[key]) {
    AI.busy[key] = 1;
    (async () => { for (const n of c) { const d = await aiFetch(n); if (d) return d; } return null; })()
      .then(d => { AI.cache[key] = { st: d ? "ok" : "none", d: d, t: Date.now() }; })
      .catch(x => { AI.cache[key] = { st: "err", d: null, t: Date.now(), m: String(x && x.message || x) }; })
      .then(() => { delete AI.busy[key]; aiSave(); aiRedraw(); });
  }
  return { st: "load", d: null };
}
const aiLink = artist => aiOn() && artist ? '<button class="ai-nm" data-ai="open" aria-label="Artist info: ' + esc(artist) + '">' + esc(artist) + mdi("chevron-right") + '</button>' : esc(artist || "");   // the artist's name on a player card opens the Artist tab / page
function aiHtml(ctl) {
  const s = states[ctl] || { attributes: {} }, a = s.attributes, full = a.media_artist || "", c = aiNames(full);
  if (!c.length) return '<div class="ar"><div class="sm">No artist is listed for this song.</div></div>';
  const e = aiGet(c), d = e.d, nm = d ? d.name : c[0], img = d && d.img;
  const tc = !img ? artColor(a.entity_picture) : null, tint = tc ? ' style="background-image:linear-gradient(135deg,rgb(' + tc + '),color-mix(in srgb,rgb(' + tc + ') 22%,var(--bg)))"' : "";
  const hero = '<div class="arh' + (img ? "" : " no") + '"' + (img ? ' style="background-image:url(&quot;' + esc(img) + '&quot;)"' : tint + ' data-i="' + esc(nm.charAt(0).toUpperCase()) + '"') + '><div class="arn"><small>ARTIST</small><b>' + esc(nm) + '</b>' + (d && d.kind ? '<span class="ars">' + esc(d.kind) + '</span>' : "") + '</div></div>';
  const chips = d && (d.since || d.fans) ? '<div class="arc">' + (d.since ? '<span>Since ' + esc(d.since) + '</span>' : "") + (d.fans ? '<span><b>' + esc(new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(d.fans)) + '</b> Deezer fans</span>' : "") + '</div>' : "";
  const acts = '<div class="ara"><a class="eb on" href="spotify:search:' + encodeURIComponent(nm) + '">' + mdi("spotify") + '<span>OPEN IN SPOTIFY</span></a>' + (d && d.url ? '<a class="eb" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + mdi("open-in-new") + '<span>WIKIPEDIA</span></a>' : "") + '</div>';
  const about = e.st === "ok" && !d.bio ? "" : e.st === "ok" ? '<div><div class="lbl">About</div><div class="arb' + (AI.more ? "" : " cl") + '">' + esc(d.bio) + '</div>' + (d.bio.length > 230 ? '<button class="arm" data-ai="more">' + (AI.more ? "SHOW LESS" : "READ MORE") + '</button>' : "") + '</div>'
    : e.st === "load" ? '<div class="sm">Looking for artist info…</div>' : e.st === "none" ? '<div class="sm">No artist info found for ' + esc(nm) + '.</div>' : '<div class="sm">Couldn’t reach Wikipedia (the device needs internet).</div><button class="eb" data-ai="retry">TRY AGAIN</button>';
  let on = ""; try { const g = mpGroups().filter(x => x.ctl === ctl)[0]; on = g ? g.mem.map(fname).join(" + ") : ""; } catch (_) {}
  const rows = [["Song", a.media_title], ["Performed by", full], ["Album", a.media_album_name], ["Playing on", on]].filter(r => r[1]);
  return '<div class="ar">' + hero + chips + acts + about + '<div><div class="lbl">This song</div>' + rows.map(r => '<div class="ark"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>').join("") + '</div></div>';
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
