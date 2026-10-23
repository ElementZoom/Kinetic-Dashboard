# Changelog

All notable changes to Kinetic, newest first. The version is the number in the `VERSION` file, shown under the start-up logo and on the Theme page.

Versions are `MAJOR.MINOR.PATCH`. Bug fixes raise the patch number (1.0.0 to 1.0.1), new features raise the minor number (1.0.1 to 1.1.0), and big changes raise the major number (2.0.0). When a release is published, its notes are taken from the matching section below.

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
