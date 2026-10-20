// Media page controls: every button sends the right service call, taps are not doubled,
// and the cards (and their glow) are not rebuilt when something unrelated changes.   Run:  node tests/media-controls.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let cfg;
const mk = () => `window.DASH_CONFIG = { url: location.origin, token: "", rooms: [{ id: "living", name: "Living", main: true }], media: ["media_player.a", "media_player.b"],
  view: { driveway: { id: "camera.d", name: "D", trig: [] }, garage: { id: "camera.g", name: "G", trig: [] } } };`;
cfg = mk();
const server = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/config.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(cfg); } if (u !== "/dash.html") { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": "text/html" }); r.end(fs.readFileSync(path.join(root, "dash.html"))); }).listen(0);
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/dash.html`;
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = []; let checks = 0;
const eq = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const errors = [];
async function open(w = 390, h = 800) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  p.on("pageerror", e => errors.push(String(e)));
  await p.goto(url); await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.documentElement.classList.remove("boot"); const l = document.getElementById("lg"); if (l) l.hidden = true;
    window.__st = (id, state, attributes) => { states[id] = { entity_id: id, state, attributes: attributes || {} }; };
    __st("media_player.a", "playing", { friendly_name: "Living Area", media_title: "Hold My Hand", media_artist: "Michael Jackson", media_album_name: "Michael", media_duration: 200, media_position: 10, media_position_updated_at: new Date().toISOString(), shuffle: false, repeat: "off", volume_level: 0.4, group_members: ["media_player.a"] });
    __st("media_player.b", "idle", { friendly_name: "Master Bedroom", volume_level: 0.2, group_members: ["media_player.b"] });
    window.__calls = []; window.call = (d, s, e, data) => { __calls.push([d + "." + s, e, data || null]); };
    window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    location.hash = "#media";
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { drawMedia(); }); await p.waitForTimeout(300);
  return p;
}
const last = (p, n = 1) => p.evaluate(n => __calls.slice(-n), n);
const clr = p => p.evaluate(() => { __calls.length = 0; });
let p = await open();
// 1) buttons
await p.click('#mp .mpc.pl [data-mp="pp"]'); await p.waitForTimeout(100);
eq("play/pause toggles the speaker", await last(p), [["media_player.media_play_pause", "media_player.a", null]]);
await p.click('#mp .mpc.pl [data-mp="pp"]'); await p.waitForTimeout(50);
eq("a second tap within a blink is ignored", await p.evaluate(() => __calls.length), 1);
await p.waitForTimeout(450); await p.click('#mp .mpc.pl [data-mp="pp"]'); await p.waitForTimeout(100);
eq("a later tap works again", await p.evaluate(() => __calls.length), 2);
await clr(p);
await p.click('#mp .mpc.pl [data-mp="next"]'); await p.click('#mp .mpc.pl [data-mp="prev"]'); await p.waitForTimeout(100);
eq("next and previous", await p.evaluate(() => __calls.map(c => c[0])), ["media_player.media_next_track", "media_player.media_previous_track"]);
await clr(p);
await p.click('#mp .mpc.pl [data-mp="shuffle"]'); await p.click('#mp .mpc.pl [data-mp="repeat"]'); await p.waitForTimeout(100);
eq("shuffle on, repeat all", await p.evaluate(() => __calls.map(c => [c[0], c[2]])), [["media_player.shuffle_set", { shuffle: true }], ["media_player.repeat_set", { repeat: "all" }]]);
await clr(p);
await p.evaluate(() => { __st("media_player.a", "playing", Object.assign({}, states["media_player.a"].attributes, { repeat: "all", shuffle: true })); drawMedia(); });
await p.click('#mp .mpc.pl [data-mp="repeat"]'); await p.click('#mp .mpc.pl [data-mp="shuffle"]'); await p.waitForTimeout(100);
eq("repeat one, shuffle off", await p.evaluate(() => __calls.map(c => c[2])), [{ repeat: "one" }, { shuffle: false }]);
await clr(p);
await p.click('#mp .mpc.pl [data-mp="mute"]'); await p.waitForTimeout(100);
eq("mute", await last(p), [["media_player.volume_mute", "media_player.a", { is_volume_muted: true }]]);
await p.evaluate(() => { const r = document.querySelector('#mp input[data-vol="media_player.a"]'); r.value = 65; r.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(100);
eq("volume slider", await last(p), [["media_player.volume_set", "media_player.a", { volume_level: 0.65 }]]);
// 2) grouping from the header
await clr(p);
eq("header shows Group Speakers", await p.evaluate(() => [document.querySelector("#mpgrp").hidden, document.querySelector("#mpgrp span").textContent]), [false, "GROUP SPEAKERS"]);
await p.click("#mpgrp"); await p.waitForTimeout(100);
eq("group: the playing speaker leads", await last(p), [["media_player.join", "media_player.a", { group_members: ["media_player.b"] }]]);
await p.evaluate(() => { __st("media_player.a", "playing", Object.assign({}, states["media_player.a"].attributes, { group_members: ["media_player.a", "media_player.b"] })); __st("media_player.b", "playing", Object.assign({}, states["media_player.b"].attributes, { group_members: ["media_player.a", "media_player.b"], media_title: "Hold My Hand" })); drawMedia(); });
await clr(p);
eq("grouped: button says Ungroup", await p.evaluate(() => document.querySelector("#mpgrp span").textContent), "UNGROUP");
await p.click("#mpgrp"); await p.waitForTimeout(100);
eq("ungroup every speaker", await p.evaluate(() => __calls.map(c => [c[0], c[1]])), [["media_player.unjoin", "media_player.a"], ["media_player.unjoin", "media_player.b"]]);
await p.close();
p = await open();
// 4) cards are not rebuilt by unrelated updates; the glow keeps running
const probe = () => p.evaluate(() => { const c = document.querySelector("#mp .mpc.pl"), an = document.getAnimations().find(a => a.animationName === "mpg"); window.__c = c; window.__an = an; return [!!an, an ? Math.round(an.currentTime) : -1]; });
const [hasGlow, t0] = await probe(); eq("playing card has its glow animation", hasGlow, true);
await p.waitForTimeout(600);
await p.evaluate(() => { __st("sensor.unrelated", String(Math.random()), {}); queuePg(); drawMedia(); });
await p.waitForTimeout(100);
eq("an unrelated update keeps the same card and the same running glow", await p.evaluate(() => [document.querySelector("#mp .mpc.pl") === window.__c, document.getAnimations().find(a => a.animationName === "mpg") === window.__an, Math.round(window.__an.currentTime)]).then(r => [r[0], r[1], r[2] > t0]), [true, true, true]);
await p.evaluate(() => { for (let i = 0; i < 40; i++) { __st("sensor.u" + i, String(i), {}); drawMedia(); } });
eq("many updates in a row: still the same card", await p.evaluate(() => document.querySelector("#mp .mpc.pl") === window.__c), true);
const pos0 = await p.evaluate(() => document.querySelector("#mp .mpc.pl .mpb").dataset.pos);
await p.evaluate(() => { __st("media_player.a", "playing", Object.assign({}, states["media_player.a"].attributes, { media_position: 77, media_position_updated_at: new Date().toISOString() })); drawMedia(); });
eq("a new playback position refreshes the progress bar without rebuilding the card", await p.evaluate(p0 => [document.querySelector("#mp .mpc.pl") === window.__c, +document.querySelector("#mp .mpc.pl .mpb").dataset.pos > +p0 + 50], pos0), [true, true]);
await p.evaluate(() => { __st("media_player.a", "playing", Object.assign({}, states["media_player.a"].attributes, { media_title: "Next Song" })); drawMedia(); });
eq("a new song changes the text but keeps the same card (so the glow keeps running)", await p.evaluate(() => [document.querySelector("#mp .mpc.pl") === window.__c, document.querySelector("#mp .mpc.pl b").textContent]), [true, "Next Song"]);
await p.evaluate(() => { __st("media_player.a", "playing", Object.assign({}, states["media_player.a"].attributes, { media_title: "Volume Test" })); drawMedia(); window.__c.querySelector(".mpa").dataset.keep = "1"; });
await p.evaluate(() => { const a = states["media_player.a"].attributes; __st("media_player.a", "playing", Object.assign({}, a, { volume_level: 0.77 })); drawMedia(); });
eq("a volume change moves the slider in place: same card, same contents, new value", await p.evaluate(() => [document.querySelector("#mp .mpc.pl") === window.__c, document.querySelector("#mp .mpc.pl .mpa").dataset.keep, document.querySelector('#mp .mpc.pl input[data-vol="media_player.a"]').value]), [true, "1", "77"]);
eq("a new track waits for its artwork: the old title stays for a moment", await p.evaluate(() => { const a = states["media_player.a"].attributes; __st("media_player.a", "playing", Object.assign({}, a, { media_title: "Art Test", entity_picture: "/nope/new-cover.jpg" })); drawMedia(); return document.querySelector("#mp .mpc.pl b").textContent; }), "Volume Test");
await p.waitForTimeout(500);
eq("once the artwork has loaded (or failed) the card changes, still the same card", await p.evaluate(() => [document.querySelector("#mp .mpc.pl b").textContent, document.querySelector("#mp .mpc.pl") === window.__c]), ["Art Test", true]);
await p.evaluate(() => { __st("media_player.a", "paused", Object.assign({}, states["media_player.a"].attributes)); drawMedia(); });
eq("paused: no glow, card says paused", await p.evaluate(() => [document.querySelectorAll("#mp .mpc.pl").length, /paused/i.test(document.querySelector("#mp .mpc:not(.idle) .lbl").textContent)]), [0, true]);
await p.close();
// 5) lyrics sheet: its play button uses the same path
p = await open();
await p.evaluate(() => { window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ syncedLyrics: "[00:01.00] One\n[00:05.00] Two" }) }); for (const k in LY.cache) delete LY.cache[k]; LY.busy = ""; LY.key = ""; lyrUpdate(); }); await p.waitForTimeout(500);
await p.click("#mp .mly"); await p.waitForTimeout(500); await clr(p);
await p.click('#lyr .lyf [data-mp="pp"]'); await p.waitForTimeout(100);
eq("lyrics sheet play/pause", await last(p), [["media_player.media_play_pause", "media_player.a", null]]);
await clr(p);
await p.waitForTimeout(800); await p.click("#lyr .ly >> nth=1"); await p.waitForTimeout(100);
eq("tapping a lyric line seeks", await p.evaluate(() => __calls.map(c => [c[0], c[1], c[2] && c[2].seek_position])), [["media_player.media_seek", "media_player.a", 5]]);
await p.close();
// 6) tablet: same buttons
p = await open(1200, 800);
await p.click('#mp .mpc.pl [data-mp="pp"]'); await p.waitForTimeout(100);
eq("wide screen: play/pause works too", (await last(p))[0][0], "media_player.media_play_pause");
await p.close();
await browser.close(); server.close();
if (errors.length) problems.push("JavaScript errors: " + errors.join(" | "));
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`media controls ok: ${checks} checks`);
