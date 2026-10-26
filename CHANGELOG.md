# Changelog

All notable changes to Kinetic, newest first. The version is the number in the `VERSION` file, shown under the start-up logo and on the Theme page.

Versions are `MAJOR.MINOR.PATCH`. Bug fixes raise the patch number (1.0.0 to 1.0.1), new features raise the minor number (1.0.1 to 1.1.0), and big changes raise the major number (2.0.0). When a release is published, its notes are taken from the matching section below.

## 1.14.2 - 2026-10-27

### Fixed
- **Artist tab no longer shows the wrong artist.** The lookup took the first music-looking Wikipedia page that merely mentioned the name (an awards page for Elevation Worship). The page title must now be the artist itself, or the artist with a "(band)" / "(singer)" style tag. If nothing matches it says so instead of guessing. The page with exactly that title is asked for first, so very famous artists are found even when a search would rank other pages above them. "Nothing found" is only remembered for 6 hours (a found artist for a month), so an old miss can't hide a fixed lookup. Lookups saved by the old version are dropped.
- **Icons centred in round buttons.** The speaker mute buttons sat about 2.5 px low and the Lyrics button on the phone about 3 px high. An icon alone in a round button is now centred exactly, wherever the button is used.

### Changed
- **Artist tab looks more like a streaming app's artist page.** Under the name sits a short description taken from the Wikipedia text ("American Christian worship band") and a "Since 2006" chip when the text gives a start year. With no photo, the header is tinted from the album art colours instead of a plain grey letter.

### Added
- **Optional Deezer photo and fan count.** `artistInfo: { deezer: true }` also asks Deezer for the artist's photo (used before the Wikipedia one) and shows a "Deezer fans" chip. It is off by default; when on, the artist name is sent to Deezer as well as Wikipedia, and if Deezer can't be reached nothing changes. Spotify's own monthly listeners, top cities and verified badge are not available to outside apps, so they are not shown.

## 1.14.1 - 2026-10-27

### Fixed
- **Scroll arrows on sideways tab rows are level with the tabs.** The little left and right arrows that show while more tabs are off screen (Weather forecast tabs, a room's climate tabs, Scenes and Irrigation tabs, Notifications tabs) sat about 3 px too low, because those rows carry extra padding for their shadow. The arrows now follow the middle of the visible tabs, whatever the row.

## 1.14.0 - 2026-10-26

### Added
- **Seasonal themes:** eight seasons with their own colours (dark and light) and their own decorations, not reused presets: **Christmas** (1-26 Dec, string lights and snow), **New Year** (27 Dec-2 Jan, fireworks and confetti), **Halloween** (25-31 Oct, cobweb, spider, bats, mist), **Valentine's** (12-14 Feb, hearts), **Matariki** (3 days either side of the public holiday, the star cluster and drifting stars), **Easter** (Holy Week to Easter Monday, hanging eggs and petals), **Diwali** (2 days either side of the main day, diyas, fairy lights and rising sparks) and **Chinese New Year** (3 days before to 4 days after, lanterns, coins and sparkle). Matariki and Chinese New Year dates are built in to 2052 and 2036, Diwali to 2030, Easter is calculated for any year.
- **Theme page > Seasonal themes:** ON or OFF for that device (saved on the device, wins over config.js), with a chip for each season to preview it (tap again to stop). While a season is on, it replaces the colours and ends by itself; the normal theme comes back after.
- **Cameras are left alone:** on Home and Security (cameras always run there) only the still parts stay (cobweb and spider, lights, lanterns, eggs, the star cluster) and the falling, flying and floating bits are removed, the full-screen camera pages get nothing, the moving bits also stop while any camera is live, and none of it runs with reduced motion on. Decorations never take a tap.
- **Your logo gets a seasonal touch** (start-up screen and sign-in): a Santa hat, party hat, witch hat, hearts, the Matariki stars, a bunny, a diya or a lantern sits on the logo. It is placed by the logo's own size, so any logo works, and your logo file is not changed. It follows the same switch and ends with the season; on a cold start it appears a split second after the plain logo.
- **config.js:** `seasonal: true` turns it on for every device that has not chosen; `seasons: { christmas: ["12-05", "12-26"], matariki: false, diwali: { 2031: "11-14" } }` moves a season's dates, switches one off, or adds a date for a year past the built-in table.

### Changed
- **Energy page, reworked for real bills.** It now follows the grid only and matches a power company's bill:
  - **Real prices:** when Home Assistant's Energy settings have a cost for the grid (for example the statistics a power company's integration imports), the Electricity cost uses what you were actually charged, hour by hour. That cost already includes the daily charge, so the page shows the daily charge (days × `tariff.daily`) as its own line, as the bill does, and the rest as usage. The card names the statistic it reads and how many hours of data came back; hours without a price yet use the `tariff` and the card says how many were estimated. Without a cost statistic everything works as before.
  - **Gas and Total:** a Gas card shows usage (in the unit Home Assistant has for it) and cost, with a chart, and a Total energy cost card adds electricity, gas and GST. Home Assistant's gas cost does not include the daily charge, so the Gas card adds it (`tariff.gasDaily`, per day, for every day of the cycle that has passed) as its own line.
  - **GST:** `gst: 0.15` in config.js adds a GST line and the total including GST to the Total card; the cards above it are labelled excl. GST, as the power company's figures are.
  - **BILL tab follows your bill:** `billing` in config.js sets when each cycle starts (a day of the month, or exact dates when a meter reading moved it), separately for electricity and gas, so the BILL tab (it replaces MONTH) matches the bill instead of the calendar month. Gas and Total show their own dates.
  - **New layout:** one screen on a tablet (Total, Electricity and Gas side by side, four insight tiles below; between 760 and 1280 px wide Total goes on top and the other two sit side by side). On a phone it is one scrolling column: Total with a coloured split bar, an Electricity / Gas switch, and 2 x 2 insight tiles, instead of sliding cards. Long labels wrap instead of overlapping. New Average rate tile, and an average per day on longer periods.
  - **Smoother changes:** changing the date, period or tab keeps the old cards (dimmed) until the new figures are ready, then the new ones slide in like on the other pages. Tapping the date again before the first answer arrives no longer shows the first tap's figures.
  - **Devices removed:** the Consumption overview card and the per-device insights are gone. The grid is looked for in the whole of Home Assistant's grid source, and the Energy settings are read again on every load.
- **Calendar: the end time follows the start time.** Picking a start time on a new event sets the end to 30 minutes later (rolling to the next day past midnight). When editing an event, moving the start moves the end with it and keeps the event's length.

### Fixed
- **Calendar: an event's colour belongs to that event, not to its title.** Two events with the same name can have different colours. Colours saved before still apply to every event with that title until you change one. A colour picked for a new event is attached to it as soon as the calendar lists it. Repeating events share one colour.
- **Calendar: changing only an event's colour now saves.** The colour is kept on the device (and in your Home Assistant user data), so a colour-only change no longer goes to the calendar, where it could fail or, on a calendar that cannot update in place, add a duplicate.

### Tests
- New checks for the calendar editor (`tests/event-editor.mjs`) and the Energy prices, gas and totals (`tests/energy-prices.mjs`).
- New checks for the dates of all eight seasons, the switch, config.js overrides, the palettes and decorations, the camera pages (`tests/seasons.mjs`).

## 1.13.0 - 2026-10-25

### Added
- **12- or 24-hour clock:** Theme page > Clock chooses DEVICE (follows the language of that phone or tablet), 12-HOUR or 24-HOUR, saved on that device. `clock: "12"` or `"24"` in config.js sets the default for every device. It applies to every time the dashboard shows: the header clock, event and forecast times, detections, recording times and the day strip in Playback, hazards, the long-press info and the Energy page's peak hour.

### Changed
- **The header clock follows the device's language when nothing is chosen.** It was always 24-hour (the rest of the times already followed the device), so on a phone or tablet set to a 12-hour language it now shows 12-hour. Pick 24-HOUR on the Theme page, or set `clock: "24"`, to keep the old look.
- **The Energy page's peak hour, Playback's recording times and the day strip's hour labels** are shown as `15:00–16:00`, `15:05:12` and `15:00` on a 24-hour clock; they were always 12-hour (`3pm–4pm`, `3:05:12 pm`, `3pm`).

### Tests
- New checks for the clock setting (`tests/clock-format.mjs`).

## 1.12.0 - 2026-10-25

This release rolls up the work since 1.11.0 (the small versions in between, 1.11.1 to 1.12.1.1, were never published on their own).

### Added
- **Boxes on a live camera (`detectLive: true`, needs `detectAI`):** a camera you tap to full screen, and a single camera on the camera page, gets the same boxes as a recording, for people, cars and animals. Only the camera you opened is looked at, and closing it stops the recogniser. Off by default. There is no lookahead on live (it cannot see the future), so a fast mover is boxed a little behind. A person standing still is kept boxed when the model is very sure. Two cameras side by side on the camera page are not marked (heavy, and laid out differently).

### Changed
- **Full screen no longer freezes the picture while the clear stream connects:** the light stream keeps playing until the clear one has its first picture, then it swaps over (and the same on the way back). It used to stop the light stream first and show a still picture for the few seconds the clear stream took. If the clear stream does not arrive within 8 seconds, the light one stays. The connection time itself is unchanged; for a shorter wait, a shorter keyframe interval on the camera's main stream and H.264 help.
- **Boxes trail a fast mover less:** a box keeps a small lead (it slides for a moment on its way, so it is aimed a little ahead), the speed of the last two looks counts more, the speed limit is higher (a child on a scooter, a quick runner), and the slide itself is shorter. With the recogniser answering as fast as a phone does, the box stays within about 5-10 px of a walker instead of 10-20 px behind; with `lookahead` on it sits right on the person.

### Fixed
- **Fast cars on recordings:** a car crossing the picture in a second or two was often not boxed. The model did see it, but whole-picture looks (the only ones that find cars) were crowded out by close-ups on the moving spot, and a car had to travel a fair distance (or be seen twice) before it showed. With Vehicle tagged, the whole picture is now looked at straight away and again every fraction of a second while something moves, and a car with movement under it that the model is 60% sure of is shown after one look.

### Tests
- New checks for live boxes, the camera page, the stream swap (`tests/cam-stream-swap.mjs`), a fast car, and how close the box stays to a walker.

## 1.11.0 - 2026-10-25

This release rolls up the work since 1.6.8 (the small versions in between, 1.6.8.1 to 1.10.1, were never published on their own).

### Added
- **Marks on recordings** (Playback and Detections): the person, car or animal that moves is boxed. `detectMark: "brackets"` (default), `"box"`, `"glow"` or `false`; only clips the camera tagged Person / Vehicle / Animal are marked. Without any recogniser the boxes follow movement only (background model, tracks, a kind per box).
- **Recognising with `detectAI`** so a shadow, a bush or a light change is not boxed:
  - `engine: "yolox"` (Apache-2.0), with `model: "/local/yolox_tiny.onnx"` hosted by you in Home Assistant's www folder, and onnxruntime-web loaded from the internet. Falls back to movement boxes when it cannot load or is too slow (`maxMs`).
  - `size`: read from the model file, so the bigger, more accurate `yolox_s.onnx` (about 4x slower) runs at its own 640.
  - `gpu: true`: the phone's graphics chip (WebGPU) does the recognising, with the processor as the fall-back (about 25 MB more to load the first time).
  - `lookahead: 0.8` (recordings only, off by default): a hidden second copy of the recording plays a little ahead, so the box is ready before the picture reaches the person and no longer trails a walking person. A paused recording still looks at the exact picture shown. It needs a second video decoder and switches itself off if it cannot keep up.
  - `debug: true` (or `?mkdebug` in the address): a small chip with the version, the speed and the picture size, or why only movement boxes are used.
- **Day strip on Playback:** one coloured bar per clip showing where it sits in the day; tap one to play it.
- **Own recording-player controls** in Playback and Detections: pinching is easy, full screen keeps the zoom, and there is one play button.
- **`camFullscreen: false`** (config.js): on phones the full-screen camera fills the screen without asking the browser for real full screen, so there is no blink when it opens or closes and the system bars stay.

### Changed
- **Camera full-screen open / close animation:** a solid black card, and the picture dissolves into the waiting tile instead of jumping.
- **Fewer false boxes:** a person has to be upright and sure enough (more sure when standing still), a car has to be seen twice and travel, a "car" hardly bigger than the person standing in it is dropped, and an unconfirmed box goes after 0.9 s.
- **Boxes follow better:** each box moves on at the speed it had since the last two looks, and a new look is matched to where the person should be by now, so someone walking quickly no longer gets a second box.

### Fixed
- **Marks on a paused recording:** the box stays on the person; it no longer walks on and disappears.
- **Labels on the marks:** two people close together no longer wear their labels on top of each other, and a box at the edge puts its label below or inside it. Also when zoomed in.
- **Detections pop-up on a landscape phone:** the card shrinks to fit the screen (clear of the notch), so the close button and play bar are reachable.
- **Recordings screen on the camera page:** the Playback pill no longer sits on the "Recordings" heading, the close X is in the heading row (not on BACK), the live controls are hidden while recordings are open, and the panel is opaque. On a short landscape phone the list is on the left and the recording beside it.

### Tests
- New checks for the marks and recogniser (`tests/detection-marks.mjs`), the mobile layouts (`tests/layout-mobile.mjs`), and `camFullscreen: false` (`tests/cam-no-native.mjs`).

## 1.6.8 - 2026-10-24

### Fixed
- **The pop-up cameras show a picture straight away** while the live stream connects (and stay on the picture if a stream cannot start), instead of a black box.

## 1.6.7 - 2026-10-24

### New
- **Room cards have a livelier, slow animation.** Two translucent waves roll across the bottom of every room card in the room's temperature colours; warmer rooms move a little faster. Set `roomFx: "glow"` for the old soft corner glow, or `roomFx: false` for none.

## 1.6.6 - 2026-10-24

### New
- **The notifications pop-up shows live cameras, not snapshot pictures.** The Cameras section uses the same live streams as the Security page (the lighter stream, one connection per camera, started when the pop-up opens and stopped when it closes). Tap a camera to open its full view as before.
- **An alert's 4th value can name any camera.** `"driveway"` and `"garage"` still work; anything else is matched to a camera name on the Security list, so a rubbish or recycling alert can show the Road camera with `"road"`. The `alerts` comment in `config.example.js` says so.
- **Pinch to zoom and drag also work in the camera Playback player and the Detections player** (not over the video's own play bar). A new recording always starts unzoomed.

## 1.6.5 - 2026-10-24

### New
- **Pinch to zoom on a full-screen camera.** Two fingers (or the mouse wheel) zoom up to 6x, one finger moves the zoomed picture, and a tap puts it back (a tap on the unzoomed picture still closes the card). It works on the Home and Security cameras and on the `#view` page, also when the card is turned to landscape, and the buttons stay where they are. `camZoom: false` in `config.js` turns it off. New test: `tests/camera-zoom.mjs`.

## 1.6.4 - 2026-10-24

### Fixes
- **Opening and closing a camera full screen no longer blinks.** The card used to leave the page layout the moment it went full screen, so the cards behind it jumped up while it faded in; it now keeps its place. Closing used to leave the phone's real full screen before the fade, which blanked the whole screen for a moment; it now leaves after the fade. A large dark play ring (the browser's own video overlay) that flashed as the card opened is hidden. New test: `tests/camera-fullscreen-hold.mjs`.

## 1.6.3 - 2026-10-24

### Fixes
- **Camera playback previews look right on every device.** On a phone each preview was stretched to screen height by the full-screen camera styles (a zoomed strip of the top of the frame in portrait, an empty box in landscape); they are now always fitted to their 16:9 box. HA's detection snapshot now wins over a video frame saved earlier on that device, the camera's own thumbnail is never shown while detection snapshots are set up, and a picture that will not load falls back to a frame from the clip instead of a broken-image icon. New test: `tests/playback-thumbs.mjs`.

### Changes
- **The start-up logo and the Theme page say "Kinetic" with the version** instead of "Dashboard".

## 1.6.2 - 2026-10-24

### Fixes
- **Charging and heated cards are deep green and deep orange in every style.** The Dyson charger (tileFx `charge`) was yellow with pale text in the light and Material styles, and the rice cooker (tileFx `heat`) was washed out and hard to see. Both are now a solid, saturated card with light text, in light and dark mode: charging is forest green, heated is burnt orange, with a matching countdown bar and battery.
- **The Artist tab matches the mockup.** Lyrics and Artist are one pill switch in the card header (no separate label above it), and picking a tab opens the card if it was collapsed.

## 1.6.1 - 2026-10-24

### Fixes
- **Active list: room headings are back.** This was built earlier as 1.5.19 on a separate branch (`feat/active-room-headings`) that was never merged into `main`, so the 1.5.19 to 1.5.22 builds did not have it. Under Lights, Windows, Fans and the other Active groups, the tiles are split by room, each with a small heading (Kitchen, Master bedroom...). Rooms come in the order of your house list, and anything the house list does not contain goes last under "Other". A group with no room information looks as it did before. Set `notifRoomHeadings: false` in `config.js` to turn the headings off. Test: `tests/active-rooms.mjs`.

## 1.6.0 - 2026-10-24

### Changes
- **Artist info on the Media page.** The lyrics card now has Lyrics and Artist tabs. The Artist tab shows the artist's photo and name, a short bio, an OPEN IN SPOTIFY button (a Spotify search for the artist), a WIKIPEDIA link, and a "This song" list (song, performed by, album, which speakers). The artist's name on the player card is now a button that opens it. With several artists on a song, the first one is looked up. The bio and photo come from Wikipedia (no key needed); the artist's name is sent there from the device, the same way lyrics are looked up on lrclib.net. Results are kept on the device for a month.
- **Phone: Artist is a swipe page in the Now Playing sheet.** The sheet pages are Now playing, Lyrics (when the song has synced lyrics) and Artist, with a dot for each and the page names under the dots. Tapping the artist's name jumps straight to the Artist page. On the Media page the lyrics sheet gets the same Lyrics / Artist tabs, and the artist's name opens it on the Artist tab.
- New option `artistInfo: { enabled: true, lang: "en" }` in `config.js` (see `config.example.js`). `enabled: false` hides the tabs, the page and the name buttons; `lang` is the Wikipedia language.
- New `tests/artist-info.mjs` (22 checks) covers the tab, the name button, the bio and links, an artist with no match, no internet, the option switched off, the phone lyrics sheet and the Now Playing sheet pages.

## 1.5.22 - 2026-10-24

### Changes
- **Scene swatches are bigger and in the top right.** The five colour dots on every scene picture moved from the bottom-right corner (where the scene name sits) to the top-right and are twice the size, so they are easy to read on the small thumbnails. Colours are unchanged and exact.

## 1.5.21 - 2026-10-24

### Fixes
- **Scene pictures now match the real light colours.** The 1.5.19 artwork used guessed colours, so the swatches in the corner did not match what the lights actually show. Every picture is now redrawn from the original five swatch colours of its scene (read from the previous images), and the dots are exact, so the art, the swatches and the lights agree. Same file names and size.

## 1.5.20 - 2026-10-24

### Changes
- **Alarm buttons glow by state, like a wall alarm panel.** On the Security page ARM AWAY / HOME / NIGHT glow green while the house is disarmed and ready, DISARM glows red while armed, pulses amber while arming or pending, and flashes red when the alarm is triggered. The button label still says what the tap does; the colour says the state. Light and dark themes have their own shades, and reduced-motion turns the pulse off.

## 1.5.19 - 2026-10-24

### Changes
- **Scenes page pictures are now original artwork.** All 80 images in `hue/` (60 in `raw/`, 20 in `multi_color/`) were redrawn from scratch for Kinetic in a similar style, so nothing third-party is shipped. File names, size (904x512) and the five colour dots are unchanged, so no config change is needed, and the folder is now about 0.9 MB instead of 2.4 MB. Credits updated.
- **Docs:** `Detection Snapshot Save Automation` now uses sample entity ids (`demo_*`) in place of real ones; README and DEVELOPING list every `#` link.

## 1.5.18 - 2026-10-23

### Changes
- **Room Automations pop-up is a side panel on tablets and bigger screens.** The small centred card was too tiny for a wall tablet. On screens wider than a phone it now slides in from the right edge at full height, with larger rows (the same round glowing ticks as on the phone), and ALL ON / ALL OFF for the open tab. The room stays visible and usable on the left, and the panel closes with DONE or when you leave the room. It is the same for every room. Phones keep the centred card exactly as before.

## 1.5.17 - 2026-10-23

### Changes
- **The fan card is always blue while on, in light and dark mode.** Under the Material style (and any style) the fan tile took the warm "on" colour with white text, which was unreadable in light mode. It is now a blue card in every style: a blue-to-navy gradient with light text in dark mode, a soft sky-blue card with dark navy text in light mode. The countdown bar follows the same blue.
- **New fan animation: breeze waves.** Soft wavy lines drift across the tile while the fan icon spins (the old horizontal air streaks are gone). It stays still for people who have reduced motion turned on.

## 1.5.16 - 2026-10-23

### Fixes
- **Auto view: the two control rows now match.** With both cameras side by side, the Driveway and Garage control rows (door, lights and so on) could come out at different heights, so the tiles didn't line up. The two rows now start at the same height and are the same height, whichever camera's row is taller, and the tiles fill them.

## 1.5.15 - 2026-10-22

### Fixes
- **Curtain sliders no longer flicker while you drag them.** The label under a curtain slider switched between your dragged value and the positions Home Assistant reported while the curtain was still moving (for example 49 %, 61 %, 28 % while you were dragging to 12 %). The label now stays on the dragged value while a finger is on the slider and for 1.5 seconds after, then follows the curtain again. The slider itself was already held still.

## 1.5.14 - 2026-10-22

### Changes
- **Tap the album art to open Media.** On the phone, tapping the artwork in the floating music bar, or in the Now Playing sheet, goes straight to the Media page (and closes the sheet). Tapping anywhere else on the bar still opens the sheet.

### Fixes
- **Rooms no longer errors when no rooms are configured.** Hiding the empty Occupied tab in 1.5.12 left the Rooms page with no tab at all in that case.

## 1.5.13 - 2026-10-22

### Fixes
- **Phone calendar lands cleanly on today.** The list used to stop with the previous day's events peeking out under the header; today's date now sits clear of it.
- **Today stands out.** On the phone calendar, today's date and its events sit on a soft gradient block.
- **Add event is a floating button on the phone.** A round + button floats above the bottom bar, and above the mini music player while music is playing. The list has room at the bottom so it never covers the last event.

## 1.5.12 - 2026-10-22

### Changes
- **Rooms: the Occupied tab only shows when a room is occupied.** With nothing occupied the tab is hidden instead of showing an empty "No rooms are occupied" page.
- **Rooms opens on the first tab.** Coming to Rooms from anywhere else starts on Occupied (when it is there) instead of the last tab you used. Switching tabs while you stay on the page still sticks.
- **Phone calendar opens at today.** The month list scrolls to today, or the next day with an event, instead of the first of the month. Earlier days stay above, so scroll up to see events that have already passed. Changing month or tapping Today does the same.

## 1.5.11 - 2026-10-22

### Fixes
- **The low-battery limit now comes from your config.** The Notifications > Batteries list always used 61 %, whatever `derived.batteryBelow` said; only the count used the setting. Both now use `derived.batteryBelow` (61 if it is not set), so setting it to 80 lists every battery under 80 %.
- **The Batteries count and list agree.** Both are the Battery Notes "Battery+" sensors (`sensor.<device>_battery_plus`). The count used to include any sensor with "battery" in its name (a phone, a tablet), so it could show more than the list did.

### Tests
- `tests/notifications.mjs` checks the limit follows `derived.batteryBelow`, and that a non-Battery-Notes battery sensor is ignored.

## 1.5.10 - 2026-10-21

### Fixes
- **Phone: the floating bars no longer touch the tab bar.** The Scenes, Irrigation, Theme and Now Playing bars were placed a fixed 86 px from the bottom, which only cleared the tab bar in some themes (with the Material style they sat 1 px above it). They now sit just above the tab bar's real height, measured at start-up, so the gap is the same in every theme and font size. The "More" menu sheet follows the same rule.
- **Irrigation (phone): both cards fit above the floating bar, so the swipe dots are always visible.** The Rain and Soil moisture cards are now the same height, and that height is worked out on your phone from the space between the cards and the floating bar, so it adapts to your screen and text size. If the cards are taller than that, the soil chart shrinks (down to a minimum) until the dots show without scrolling; if there is spare room the rain bars grow to fill the card. On a very short screen the page can still scroll, with room under the cards. The soil card is also more compact (smaller heading, tiles and legend).
- **Scenes sheet: room buttons are grey until the room is on.** Dining, Sofa, Kitchen and the rest used to show their colour all the time. The colour (and the scene name) now appears only while the room's scene switch is on; off shows grey with OFF.

### Tests
- New `tests/phone-pills.mjs` checks the gap above the tab bar in the Material style, that the Rain card is compact and the dots stay clear of the floating bar on both cards, and that an off room button is not coloured.

## 1.5.9 - 2026-10-21

### Fixes
- **Opening the dashboard from a notification link no longer leaves the pop-up empty.** A link such as `#active/doors` (or `#batteries`, `#notifications`) on a cold start tried to draw the notifications pop-up before the garage-door code further down the page had loaded, which stopped the page script with "Cannot access 'galCfg' before initialization". The pop-up stayed empty and the dashboard never connected. Start-up now runs last, after everything is defined.
- **The pop-up scrolls to the right section even when Home Assistant is slow.** `#active/doors` used to try twice (80 ms and 1.5 s after opening) and give up if the doors had not loaded yet. It now waits for the section to appear (up to 20 s) and then scrolls to it, and does not fight you if you have already started scrolling.
- **No more misleading "Nothing is on or open" / "All clear" while loading.** Until the first states arrive the pop-up says "Loading…", and it redraws as soon as they do.

### Changes
- **Batteries tab has a heading like the Active tab.** A "Batteries · 4" heading with a battery icon (the count of low batteries, no button) now sits above the list.

### Tests
- New `tests/notification-link.mjs` opens `#active/doors` on a cold start with Home Assistant answering quickly and slowly, and checks the pop-up fills, scrolls to Doors, and the page raises no JavaScript errors. `tests/notifications.mjs` also checks the Batteries heading and that it has no button.

## 1.5.8 - 2026-10-20

### Docs
- New "Links for automations" table in the README and DEVELOPING.md: every `#` link (pages, cameras, rooms, weather tabs, notification tabs, alarm).

### Fixes
- **Media page: the album-colour glow no longer glitches.** Changing the volume (or anything else small) now only moves the slider; before, the whole card was rebuilt, which restarted the glow. A new song keeps the same card, waits for its artwork to load (up to 1.5 s) so there is no blank cover, then swaps the text and fades the glow smoothly from the old album's colour to the new one.

## 1.5.7 - 2026-10-19

### New
- **Laundry moved from Alerts to Active, with an animated washing-machine tile.** While the washer runs the tile is blue with a wave moving inside the drum, a soft glow and the time remaining; a delayed start shows as a plain "Delayed start" tile. The minute ticking over only changes the time, so the animation is not restarted.
- **Laundry running and towel heating now join the clock-strip icon.** Priority is now water leak, weather warning, garage open, door open, water on, laundry running, then towel heating, and the "+n" badge counts every other condition that is active. The laundry icon is the same animated drum.

## 1.5.6 - 2026-10-19

### Fixes
- **The glowing bar by the clock now comes back** after the last icon condition clears (door closed, water off and so on). The icon's leftover marker was hiding the bar.

### Changes
- **Heated towel rails moved from Alerts to Active.** They now appear in the Active tab as "Towel heating" with their timers and an ALL OFF button, and no longer add to the Alerts count.

## 1.5.5 - 2026-10-19

### New
- **Open door icon by the clock.** When any door in your external-doors group (`entities.doorsGroup`) is open, the strip beside the clock turns into a glowing yellow open-door icon. The garage door is left out because it has its own icon. It joins the other conditions: priority is water leak, weather warning, garage open, door open, then water on, and the small "+n" badge counts every other one that is active. No new config option.

## 1.5.4 - 2026-10-19

### Docs
- README screenshots for Notifications, Rooms, Security, Weather and Irrigation (phone and tablet, dark and light) and the tablet grid were retaken with the current look. All data in them is invented.

### Fixes
- **Camera view (#view) header, all sizes.** The Person tag no longer sits on top of the sound and mic buttons, LIVE is in the corner where it belongs, and the controls no longer overlap in the dual driveway + garage view.
  - Phones (upright, and the narrow dual cards in landscape): two rows. Row 1 is the name, Person tag and LIVE; row 2 is sound, mic, Playback, full screen and Close.
  - Tablets and wide views: one row. The name and Person tag are on the left; LIVE, Playback and Close on the right; sound and mic sit under it.
  - Dual view: each card has its own header, and the Close button is on one card only (the top card upright, the right-hand card in landscape). The separate round Close that floated above the cards is gone.
- A new test (`tests/view-header.mjs`) checks every combination (phone and tablet, both orientations, driveway, garage, both, other cameras) for overlaps.
- The Security page's full-screen camera is unchanged. On phones its buttons are within a few pixels of the #view ones, as before.

## 1.5.3 - 2026-10-19

### Fixes
- **No more flashing on Now Playing, Weather, GeoNet, Energy and the Rooms list.** These pages were redrawn on every related sensor update, even when nothing visible had changed, which made them flash and replayed their animations. They now keep what is on screen when the content is the same. On Now Playing the progress bar and ring keep running smoothly, and the GeoNet detail panel keeps its scroll position. The Media page's group button no longer redraws its icon each time.
- A new test (`tests/no-flicker.mjs`) re-runs each page's redraw and fails if anything is rebuilt without a change.

## 1.5.2 - 2026-10-19

### Fixes
- **Irrigation page no longer flickers while a tap is running.** Every sensor update (the taps send many) rebuilt the whole page, which replayed the pop-up animation and restarted the water wave and the soil chart, so it looked like the page was reloading. Now only the part that actually changed is redrawn; the pop-up, its tabs and the chart stay put, and the wave keeps flowing.

## 1.5.1 - 2026-10-19

### Fixes
- **Soil moisture card: the three tiles no longer lose their shadow** at the edges and have clear room above the chart.
- **Scenes and zone pop-ups: the tab row and the list below it are spaced correctly on desktop widths**, as they already were on phones.
- **Active navigation buttons look the same everywhere.** On the light glass theme the selected capsule is now near-solid white (the DAY look) instead of showing the page colour through it, so LIVE and the other tabs no longer look peach.

## 1.5.0 - 2026-10-19

### New
- **Animated scroll arrows on the forecast charts and the soil moisture chart.** The hourly chart on Temp, Wind, Rain and UV, and the 72-hour soil chart, fade at the edge that has more and show the same animated arrow as the tab rows. On touch screens the thin scrollbar is hidden, since the arrows replace it; with a mouse it stays.

### Fixes
- **The selected tab button no longer looks cut off.** Scrolling tab rows clipped the soft shadow of the selected capsule on its left and bottom. The rows now leave room for it, and the capsule has one even bright rim and a soft shadow like the other cards. This covers every tab row (weather, rooms, energy, zones, scenes, security, lyrics, notifications, room Automations, GeoNet), the Detections filters, the Controls chips in Notifications, the Access page chips and the speaker chips on Now Playing.
- **Soil moisture chart has a gap before the first point and after the last one,** so the lines no longer touch the axis and the latest dot is no longer cut off at the edge.

## 1.4.1 - 2026-10-19

### Fixes
- **Notifications pop-up no longer blinks.** The header and tabs stay in place and the lists are only redrawn when what they show really changes, so the tab buttons and the Active tiles (water taps, lights) no longer flash while timers, batteries or lights update, and the tab row keeps its scroll position.

## 1.4.0 - 2026-10-19

### Changed
- **Notifications, Batteries tab restyled.** Each battery is a soft row like the Automations rows, with a battery icon that shows the level and a coloured percentage pill (red at 15% or less, amber under 40%, green above). The "Battery+" ending is dropped from the names.

## 1.3.1 - 2026-10-19

### Fixes
- **Notifications pop-up has the same card background as the other pop-ups** (solid, no see-through glass), in every visual style, so it matches Automations.

## 1.3.0 - 2026-10-19

### Changed
- **Notifications pop-up matches the other pop-up cards.** Same header as the Automations pop-up (small label, title, DONE pill instead of the round close button), the same chip tabs (Alerts, Active, Batteries), and soft rows for Controls, Chores and Timers instead of white cards. It is still the side panel on tablets and computers and full screen on phones.
- **The Notifications tabs show the animated scroll arrow** when they do not fit (narrow phones, long counts), the same as the other scrollable tab rows.

## 1.2.1 - 2026-10-19

### Fixes
- **Automations pop-up: no yellow tint on ticked rows.** A switched-on row (for example Presence sensor) keeps the normal row colour and border; the green check and its glow are the only on-signal.

## 1.2.0 - 2026-10-19

### New
- **Phone Media page: lyrics icon and a compact player.** The player card is about half the height, so the next speaker stays in view, and the lyrics open from an icon on the card as a sheet that slides up (with a small play/pause row). The sideways pager is gone on phones, which also makes the page scroll in one normal swipe. Tablets and computers keep the lyrics beside the player.
- **Security tabs slide like the Rooms tabs.** Switching between Live and Detections slides and staggers the content the same way.
- **Notifications has a Batteries tab.** Low batteries moved out of Alerts into their own tab (Alerts, Active, Batteries), with a count; the header glow still counts them.

### Changed
- **The garage door is no longer listed under Doors** in Notifications (it has its own alert).
- **Media page header: Open Spotify and Group Speakers buttons have icons**, and show icons only on phones. Group Speakers turns into Ungroup while speakers are grouped.

### Fixes
- **Now Playing glow no longer flickers.** The Media page only redraws a player card when something you can see changes, so the album-art glow keeps running smoothly instead of restarting on every update from Home Assistant.
- **Play/pause ignores an accidental double tap.** A second tap within about a third of a second is ignored, so a double fire can no longer pause and resume at once.
- **Selected buttons in the light Liquid Glass theme** (tabs, chips, toggles) are a brighter translucent glass capsule with a bright rim and a soft shadow, and the label takes the accent colour, instead of a plain white blob.
- **Room card chips are coloured again.** Open doors are red, windows amber, curtains purple, fans blue, lights warm and the garage red when open, in light and dark mode.

## 1.1.0 - 2026-10-19

### New
- **The notification strip shows what needs attention.** Next to the clock, the glowing bar turns into an icon: a drop with an exclamation mark for a water leak, a cloud with an alert for a weather warning (shown while the warnings sensor is not `unknown`), an open garage door for a garage door that is open (from the `garageAlert` sensors), and a water drop while any water tap or irrigation zone is on. When more than one is true the most urgent shows (leak, then weather warning, then garage, then water) with a small "+1", "+2" or "+3" for the rest; the tooltip lists them all. With none of them, the bar behaves as before.
- **Water leak sensors.** New `leakSensors` option in `config.js`. While one is on, it shows first under Warnings in the notifications pop-up as a red card, and it is the top priority for the strip.
- **Timers inside the tiles.** With `tileTimers` in `config.js`, any tile (rooms, the Active list, Alerts) shows its timer's countdown and bar while the entity is on and the timer runs, and drops it when the timer ends. A device switched on by hand, without its timer, simply shows ON. Room pages update the moment the timer starts or stops.

- **Heated and charging looks for tiles.** New `tileFx` option: a tile set to `"heat"` turns red while it is on, with warm haze rising and an orange countdown bar (heated towel rails, rice cooker); `"charge"` turns it green with a battery whose cells light up one after another (Dyson charger); `"air"` turns it blue with a turning fan icon and air streaks (extractor fans).
- **Appliances in the Active tab.** New `activeAppliances` option: appliances listed there get their own "Appliances" group in the Active tab while they are on (rice cooker, Dyson charger), with their countdown.

### Changed
- **Automations toggles are round checks.** The switches in the Automations card became a round check button on the left that glows when ticked.
- **Room Automations button (phone)** is a pill instead of a circle, with the count beside the icon.
- **Room Automations card** floats in the middle of the screen, in the same style as the option pop-ups (for example the rangehood level), instead of rising from the bottom. The Occupancy / Adaptive lighting / Others tabs are kept, and the tabs row fades at an edge with a nudging chevron (right or left) while more tabs are hidden past it.
- **Sideways rows show there is more.** The Automations tabs, the Irrigation zone tabs, the Scenes pictures and room tabs, and the Weather tabs fade at an edge with a nudging chevron (right or left) while more is hidden past it.
- **The Timers card in Alerts is now optional.** It only lists the timers named in the new `notifTimers` option (none by default). Before, it always listed four fixed timers (exhaust fans, rice cooker, Dyson charger, heated towel rails). If you want the old card back, put those timers in `notifTimers`.

### Fixes
- **Now Playing is centred.** The home card and the floating mini player no longer leave an empty strip under the row when the stream has no length; the content sits in the middle.
- **Fan tiles always get the airflow look.** A fan missing from `tileFx` showed as a plain tile; every `fan.*` tile now turns blue with a spinning icon while on (set it to `"none"` to turn that off).

## 1.0.1 - 2026-10-18

### Fixes
- **#view cameras on phones now match full-screen Security cameras.** Same button row (sound, talk-back, PLAYBACK, landscape, close), the close X is on the card, the LIVE badge shows upright and in landscape, the picture fills the screen the same way, and the control tiles use the same width and scrolling. The tablet layout is unchanged.

## 1.0.0 - 2026-10-18

First numbered release. Everything below is in it.

### Pages
- **Home**: weather and forecast, room tiles, heat pump, camera cards, now playing, notification bell.
- **Rooms**: lights (dimming and colour sheet), curtains with OPEN ALL / CLOSE ALL and OPENING / CLOSING, doors and windows, climate, fans, room automations and per-room occupancy, links such as `#rooms/<room>/doors`.
- **Climate**: heat pump modes, setpoints, per-room zones.
- **Security**: live cameras, recent detections, full-screen playback, alarm panel and siren.
- **Weather**: forecast, rain next 12 hours, weather warnings.
- **Energy**: usage, tariff periods, cost and insights.
- **Irrigation**: one card per zone with live flow, soil moisture and temperature, rain check, timers and duration buttons.
- **Scenes**, **Media** (speaker control, grouping, synced lyrics), **Events** (calendar with colours, repeat, delete confirmation), **Vehicle**, **Hazards** (New Zealand map with GeoNet earthquakes and volcano levels), **Theme**.

### Cameras
- Live streams with talk-back, snapshot until the stream connects, playback by day with previews, filters (person, vehicle, animal, motion) and a grid or list view.
- Real full screen on phones, with a landscape button that turns the screen or, if the device refuses, the card, using a short fade.
- The `#view` page (for notification links) fills a phone screen and shows one or both feeds.
- **Garage door alert**: a red frame and "GARAGE OPEN" band while the door is open, amber "OPENING" / "CLOSING" while it moves, on every garage camera view.

### Notifications
- Alerts (volcano and earthquake cards, doors, warnings, low batteries, chores, running timers) and an Active tab with "all off" shortcuts.
- Tap warnings and the Active tab show the same rolling water as the Irrigation flow tile, and any tile whose entity has a running timer shows the countdown.

### Look and feel
- Four styles: **Kinetic** (the original look), **Liquid Glass** (glass on the navigation layer, standard cards, light and dark), **Material** (tonal surfaces from your palette, state layers) and **Minimal**.
- 23 colour presets, six font choices, dark, light, follow device, follow sun and schedule modes.
- Phone layout with floating bars and sheets; tablet layout with sidebar.

### Access and setup
- Sign in with the normal Home Assistant login (no token in `config.js`).
- Per-person Access panel: choose pages, rooms and Security features each person sees. This tidies the dashboard; it is not a security lock.
- Everything specific to a house lives in `config.js`; `config.example.js` is a complete example with invented data.

### Project
- Source in `src/`, built into the single deployable `dash.html` with `node build.mjs`. A GitHub Actions workflow checks the build, syntax, and runs browser tests for start-up, the garage alert, full screen and landscape, irrigation, and the view page. Pushing a `vMAJOR.MINOR.PATCH` tag publishes a release.
