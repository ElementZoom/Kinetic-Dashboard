# Changelog

All notable changes to Kinetic, newest first. The version is the number in the `VERSION` file, shown under the start-up logo and on the Theme page.

Versions are `MAJOR.MINOR.PATCH`. Bug fixes raise the patch number (1.0.0 to 1.0.1), new features raise the minor number (1.0.1 to 1.1.0), and big changes raise the major number (2.0.0). When a release is published, its notes are taken from the matching section below.

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
