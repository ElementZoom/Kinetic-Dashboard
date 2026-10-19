# Changelog

All notable changes to Kinetic, newest first. The version is the number in the `VERSION` file, shown under the start-up logo and on the Theme page.

Versions are `MAJOR.MINOR.PATCH`. Bug fixes raise the patch number (1.0.0 to 1.0.1), new features raise the minor number (1.0.1 to 1.1.0), and big changes raise the major number (2.0.0). When a release is published, its notes are taken from the matching section below.

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
