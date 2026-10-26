// Artist info: the Artist tab beside the lyrics (tablet), the lyrics sheet tab and the Artist page in the Now Playing sheet (phone).   Run:  node tests/artist-info.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], media: ["media_player.a", "media_player.b"],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
const BIO = "Demo Artist is an invented musician and producer from nowhere in particular, used only in this test. ".repeat(4);
async function open(w, h, mode) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  p.on("pageerror", e => errors.push(String(e.stack || e).slice(0, 400)));
  await p.addInitScript(() => { window.__wiki = []; });
  await p.goto(url); await p.waitForTimeout(700);
  await p.evaluate(mode => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    const st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
    st("media_player.a", "playing", { friendly_name: "Living Area", media_title: "Demo Song", media_artist: "Demo Artist, Guest Singer", media_album_name: "Demo Album", media_duration: 200, media_position: 10, media_position_updated_at: new Date().toISOString() });
    st("media_player.b", "idle", { friendly_name: "Master Bedroom" });
    window.fetch = u => {
      if (/wikipedia\.org/.test(u)) {
        window.__wiki.push(u);
        if (mode === "fail") return Promise.reject(new Error("offline"));
        const hit = mode !== "none" && /Demo%20Artist/.test(u) && !/Guest%20Singer/.test(u);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(hit ? { query: { pages: { 7: { index: 1, title: "Demo Artist", extract: window.__bio, fullurl: "https://en.wikipedia.org/wiki/Demo_Artist", thumbnail: { source: "https://upload.wikimedia.org/demo.jpg" } } } } } : {}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ syncedLyrics: "[00:01.00] Line one\n[00:05.00] Line two\n[00:09.00] Line three" }) });
    };
    location.hash = "#media";
  }, mode || "ok");
  await p.evaluate(b => { window.__bio = b; }, BIO);
  await p.evaluate(() => { try { localStorage.removeItem("dashArtist"); localStorage.removeItem("dashLyTab"); } catch (_) {} AI.cache = {}; AI.tab = "lyrics"; });
  await p.waitForTimeout(400);
  await p.evaluate(() => { drawMedia(); lyrUpdate(); }); await p.waitForTimeout(500);
  return p;
}
// ---- wide screen: tabs beside the player
let p = await open(1200, 800);
eq("wide: Lyrics and Artist tabs, lyrics first", await p.evaluate(() => [...document.querySelectorAll("#lyr .aitabs .chip")].map(c => c.textContent + (c.classList.contains("on") ? "*" : ""))), ["Lyrics*", "Artist"]);
eq("wide: the artist name on the player card is a button", await p.evaluate(() => { const b = document.querySelector("#mp .mpc.pl .ai-nm"); return b ? b.textContent : null; }), "Demo Artist, Guest Singer");
await p.click("#lyr .aitabs .chip[data-t=artist]"); await p.waitForTimeout(600);
eq("wide: Artist tab shows the bio, photo and name", await p.evaluate(() => [document.querySelector("#lyr .arn b").textContent, document.querySelector("#lyr .arh").style.backgroundImage.includes("upload.wikimedia.org"), document.querySelector("#lyr .arb").textContent.startsWith("Demo Artist is an invented"), document.querySelector("#lyr .lyh").textContent.includes("Artist")]), ["Demo Artist", true, true, true]);
eq("wide: only the first artist is looked up", await p.evaluate(() => [window.__wiki.length, /Demo%20Artist/.test(window.__wiki[0]), /Guest/.test(window.__wiki[0])]), [1, true, false]);
eq("wide: Spotify search link and Wikipedia link", await p.evaluate(() => [...document.querySelectorAll("#lyr .ara a")].map(a => a.getAttribute("href"))), ["spotify:search:Demo%20Artist", "https://en.wikipedia.org/wiki/Demo_Artist"]);
eq("wide: this-song rows", await p.evaluate(() => [...document.querySelectorAll("#lyr .ark")].map(r => r.firstChild.textContent + "=" + r.lastChild.textContent)), ["Song=Demo Song", "Performed by=Demo Artist, Guest Singer", "Album=Demo Album", "Playing on=Living Area"]);
eq("wide: the bio is clamped until READ MORE", await p.evaluate(() => [document.querySelector("#lyr .arb").classList.contains("cl"), document.querySelector("#lyr .arm").textContent]), [true, "READ MORE"]);
await p.click("#lyr .arm"); await p.waitForTimeout(300);
eq("wide: READ MORE opens the whole bio", await p.evaluate(() => [document.querySelector("#lyr .arb").classList.contains("cl"), document.querySelector("#lyr .arm").textContent]), [false, "SHOW LESS"]);
eq("wide: lyrics are not drawn while the Artist tab is open", await p.evaluate(() => document.querySelectorAll("#lyr .ly").length), 0);
await p.click("#lyr .aitabs .chip[data-t=lyrics]"); await p.waitForTimeout(400);
eq("wide: back to Lyrics", await p.evaluate(() => [document.querySelectorAll("#lyr .ly").length, document.querySelectorAll("#lyr .arh").length]), [3, 0]);
await p.click("#mp .mpc.pl .ai-nm"); await p.waitForTimeout(500);
eq("wide: tapping the artist name opens the Artist tab", await p.evaluate(() => [AI.tab, document.querySelectorAll("#lyr .arh").length, document.body.classList.contains("ly-open")]), ["artist", 1, false]);
eq("wide: the lookup is cached (no second request)", await p.evaluate(() => window.__wiki.length), 1);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + "_wide.png" });
await p.close();
// ---- nothing found / offline
p = await open(1200, 800, "none");
await p.evaluate(() => { AI.tab = "artist"; LY.drawn = ""; lyrUpdate(); }); await p.waitForTimeout(500);
eq("no match: says so, still shows the name and the Spotify link", await p.evaluate(() => [document.querySelector("#lyr .sm").textContent, document.querySelector("#lyr .arn b").textContent, document.querySelectorAll("#lyr .ara a").length, window.__wiki.length]), ["No artist info found for Demo Artist.", "Demo Artist", 1, 4]);   // the first name, then the whole text as a fallback
await p.close();
p = await open(1200, 800, "fail");
await p.evaluate(() => { AI.tab = "artist"; LY.drawn = ""; lyrUpdate(); }); await p.waitForTimeout(500);
eq("offline: message and TRY AGAIN", await p.evaluate(() => [document.querySelector("#lyr .sm").textContent.includes("Couldn’t reach Wikipedia"), !!document.querySelector("#lyr [data-ai=retry]")]), [true, true]);
await p.close();
// ---- config: switched off
p = await open(1200, 800);
await p.evaluate(() => { CONFIG.artistInfo = { enabled: false }; drawMedia(); LY.drawn = ""; lyrUpdate(); }); await p.waitForTimeout(400);
eq("disabled: no tabs, no artist button", await p.evaluate(() => [document.querySelectorAll("#lyr .aitabs").length, document.querySelectorAll("#mp .ai-nm").length]), [0, 0]);
await p.close();
// ---- phone: the lyrics sheet gets the same tabs
p = await open(390, 800);
eq("phone: artist name button on the card", await p.evaluate(() => !!document.querySelector("#mp .mpc.pl .ai-nm")), true);
await p.click("#mp .mpc.pl .ai-nm"); await p.waitForTimeout(700);
eq("phone: tapping the artist name opens the sheet on the Artist tab", await p.evaluate(() => [document.body.classList.contains("ly-open"), AI.tab, document.querySelectorAll("#lyr .arh").length]), [true, "artist", 1]);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + "_phone_sheet.png" });
await p.click("#lyr .lyx"); await p.waitForTimeout(300);
await p.close();
// ---- phone: Now Playing sheet, third swipe page
p = await open(390, 800);
await p.evaluate(() => { AI.tab = "lyrics"; location.hash = "#rooms"; }); await p.waitForTimeout(500);
await p.evaluate(() => { npRender(); }); await p.waitForTimeout(300);
await p.click("#npmini .npi"); await p.waitForTimeout(800);
await p.evaluate(() => { npRender(); }); await p.waitForTimeout(500);
eq("sheet: pages and labels", await p.evaluate(() => [document.querySelector("#npbody .nps").dataset.pn, document.querySelectorAll("#npbody .npdt i").length, [...document.querySelectorAll("#npbody .npdl span")].map(s => s.textContent)]), ["Now playing|Lyrics|Artist", 3, ["Now playing", "Lyrics", "Artist"]]);
await p.click("#npbody .npa .ai-nm"); await p.waitForTimeout(900);
eq("sheet: the artist name jumps to the Artist page", await p.evaluate(() => [document.querySelector("#npbody .nptx").textContent, document.querySelector("#npbody .npdt i:nth-child(3)").classList.contains("on"), npsName]), ["Artist", true, "Artist"]);
eq("sheet: the Artist page shows the bio", await p.evaluate(() => (document.querySelector("#npbody .ar .arb") || { textContent: "" }).textContent.startsWith("Demo Artist is an invented")), true);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + "_phone_np.png" });
await p.evaluate(() => { npRender(); }); await p.waitForTimeout(400);
eq("sheet: a redraw keeps you on the Artist page", await p.evaluate(() => document.querySelector("#npbody .nptx").textContent), "Artist");
await p.click("#npbody .npdl span:first-child"); await p.waitForTimeout(900);
eq("sheet: the labels page back to the player", await p.evaluate(() => document.querySelector("#npbody .nptx").textContent), "Now playing");
await p.close();
// ---- matching, facts and the optional Deezer lookup
p = await open(1200, 800);
eq("match: a page that only mentions the name is rejected", await p.evaluate(() => aiPick([{ title: "52nd Annual GMA Dove Awards", extract: "The ceremony honoured the band Elevation Worship and other musicians." }], "Elevation Worship")), undefined);
eq("match: the artist's own page, or its (band) page, is taken", await p.evaluate(() => [aiPick([{ title: "Elevation Worship", extract: "Elevation Worship is a worship band." }], "Elevation Worship").title, aiPick([{ title: "Genesis (band)", extract: "Genesis were an English rock band." }, { title: "Genesis", extract: "Genesis is a book." }], "Genesis").title, aiPick([{ title: "Beyonce", extract: "Beyonce is a singer." }], "Beyoncé").title]), ["Elevation Worship", "Genesis (band)", "Beyonce"]);
eq("match: another kind of page with the same name is rejected", await p.evaluate(() => aiPick([{ title: "Genesis (film)", extract: "A film about a band." }], "Genesis")), undefined);
eq("facts: description and start year", await p.evaluate(() => aiFacts("Elevation Worship is an American Christian worship band from Charlotte, North Carolina. The band formed in 2006 as the music ministry of a church.")), { kind: "American Christian worship band", since: "2006" });
await p.route("https://api.deezer.com/**", r => r.fulfill({ contentType: "text/javascript", body: new URL(r.request().url()).searchParams.get("callback") + '({"data":[{"name":"Someone Else","nb_fan":5,"picture_xl":"https://x.test/a.jpg"},{"name":"Demo Artist","nb_fan":1234567,"picture_xl":"https://cdn.test/dz.jpg","link":"https://www.deezer.com/artist/1"}]})' }));
eq("deezer: the exact name is picked, with photo and fans", await p.evaluate(() => aiDeezer("Demo Artist")), { img: "https://cdn.test/dz.jpg", fans: 1234567, url: "https://www.deezer.com/artist/1" });
eq("deezer: nothing is returned for a name that is not listed", await p.evaluate(() => aiDeezer("Nobody Here")), null);
eq("deezer: off by default (no script tag added)", await p.evaluate(async () => { const n = document.querySelectorAll("script[src*=deezer]").length; await aiFetch("Demo Artist"); return document.querySelectorAll("script[src*=deezer]").length === n; }), true);
await p.evaluate(() => { CONFIG.artistInfo = { enabled: true, deezer: true }; });
eq("deezer: on, the photo and fans are added to the bio", await p.evaluate(async () => { const d = await aiFetch("Demo Artist"); return [!!d.bio, d.img, d.fans]; }), [true, "https://cdn.test/dz.jpg", 1234567]);
eq("lookup: the exact-title page wins when a search would rank other pages first", await p.evaluate(async () => {
  const bio = "Justin Drew Bieber is a Canadian singer and songwriter.";
  window.fetch = u => { const j = x => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (/titles=/.test(u)) return j({ query: { pages: { 5: { title: "Justin Bieber", extract: bio, fullurl: "https://en.wikipedia.org/wiki/Justin_Bieber" }, "-1": { title: "Justin Bieber (band)", missing: "" } } } });
    return j({ query: { pages: { 1: { index: 1, title: "Justin Bieber albums discography", extract: "This is the discography of the singer." } } } }); };
  const d = await aiFetch("Justin Bieber"); return d && d.bio === bio;
}), true);
eq("lookup: falls back to the search when no page has that title", await p.evaluate(async () => {
  window.fetch = u => { const j = x => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (/titles=/.test(u)) return j({ query: { pages: { "-1": { title: "Lowkey Duo", missing: "" } } } });
    return j({ query: { pages: { 3: { index: 1, title: "Lowkey Duo", extract: "Lowkey Duo are a duo of musicians." } } } }); };
  const d = await aiFetch("Lowkey Duo"); return d && /duo of musicians/.test(d.bio);
}), true);
eq("cache: an old 'nothing found' is looked up again, a recent one is not", await p.evaluate(() => { AI.cache = { "old one": { st: "none", d: null, t: Date.now() - 7 * 36e5 }, "new one": { st: "none", d: null, t: Date.now() - 36e5 } }; return [aiGet(["Old One"]).st, aiGet(["New One"]).st]; }), ["load", "none"]);
await p.close();
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`artist info ok: ${checks} checks`);
