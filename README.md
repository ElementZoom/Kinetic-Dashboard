# Kinetic

![Kinetic on tablet and phone](docs/screenshots/hero.png)

**Kinetic** is a fast, fluid dashboard for [Home Assistant](https://www.home-assistant.io) on phones, tablets and wall displays. It is **one HTML file** (`dash.html`) plus **one config file** (`config.js`). No build step to install it, no custom card, no integration, no YAML.

> See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

> `config.example.js` contains invented sample data only. Copy it to `config.js` and replace the entity ids with your own.

## Install
1. Put `dash.html`, `config.js` (copied from `config.example.js`) and `brand-logo.js` in Home Assistant's `www/` folder (served as `/local/`).
2. Open `https://<your-ha>/local/dash.html` and sign in with your normal Home Assistant login. Leave `token` empty in `config.js`; never paste a long-lived token, because `www/` files can be read without a login.
3. After every edit, bump the `?v=` number on the `config.js` script line and hard-refresh (tablets and phones cache hard).
4. Optional: for the per-person Access panel, create one Text helper (Settings > Devices & services > Helpers, max length 255) and set `entities.access` in `config.js`.

## Screenshots
Mock-up screens with invented data and generated camera images.

### Phone
**Dark**
![Phone dark](docs/screenshots/strip-phone-dark.png)

**Light**
![Phone light](docs/screenshots/strip-phone-light.png)

### Tablet
![Tablet dark and light](docs/screenshots/grid-tablet.png)

| Dark | Light |
|---|---|
| ![](docs/screenshots/tablet-dark-rooms.png) | ![](docs/screenshots/tablet-light-rooms.png) |
| ![](docs/screenshots/tablet-dark-security.png) | ![](docs/screenshots/tablet-light-security.png) |
| ![](docs/screenshots/tablet-dark-media.png) | ![](docs/screenshots/tablet-light-media.png) |

All pages are in [`docs/screenshots`](docs/screenshots) for both devices and both themes.

### Four styles
Pick a style on the Theme page. Each one works in dark and light, with any colour preset.

| Style | What it is |
|---|---|
| **Kinetic** | The original look: tinted depth and fine outlines. |
| **Liquid Glass** | Apple-style: glass navigation and bars floating over clear cards. Light mode uses white cards and a white selected pill, like iOS. |
| **Material** | Google-style: tonal surfaces mixed from your colour, pill buttons and state layers. |
| **Minimal** | Flat, thin lines, no effects. |

![Styles on phone, Home page](docs/screenshots/styles-phone-home.png)

![Styles on tablet, Theme page, dark](docs/screenshots/styles-tablet-theme-dark.png)

![Styles on tablet, Theme page, light](docs/screenshots/styles-tablet-theme-light.png)

Switching styles on the Theme page:

| Tablet | Phone |
|---|---|
| ![](docs/animations/styles-tablet.gif) | ![](docs/animations/styles-phone.gif) |

All four styles for Home, Rooms and Theme are in [`docs/screenshots/styles`](docs/screenshots/styles).

### In motion
| Garage confirm | Irrigation | Rooms |
|---|---|---|
| ![](docs/animations/garage.gif) | ![](docs/animations/irrigation.gif) | ![](docs/animations/rooms.gif) |

## Highlights
**Look and feel**
- Dark, light, follow device, **follow sun** (`sun.sun`) or a **time schedule**; colour presets; four styles (**Kinetic**, **Liquid Glass**, **Material**, **Minimal**); four font choices.
- Smooth page, tab and filter transitions, floating bars and slide-up sheets on phones, respecting "reduce motion".
- Weather-aware greeting card with animated weather.

**Home and rooms**
- Home cards for status, cameras, rooms, heat pump and forecast, arranged per device.
- Rooms page with an **Occupied** tab driven by presence sensors; room pop-ups with lights, doors, windows, curtains, fans and automations.
- Whole-house shortcuts (all lights off, close curtains, doors and windows open).
- **Confirm tiles**: the garage door asks for a second tap, with an amber pulse and a 3-second countdown.

**Security**
- Live cameras on Home and Security. On phones a tap goes to real full screen, with a landscape button, sound and talk-back. A `#view/...` page opens a camera (or two side by side) full screen from a notification link.
- **Garage door alert**: a red frame and "GARAGE OPEN" band while the door is open, amber "OPENING" / "CLOSING" while it moves, without covering the buttons.
- **Playback** of recordings in grid or list view, with person, vehicle and animal filters and previews from Home Assistant's saved detection snapshots.
- **Recent detections** across all cameras, filterable by type, camera and time range.
- Alarm panel and siren controls; a two-camera view that follows what is happening.

**People and access**
- **Access panel** (admins only): choose per person which pages, rooms and Security features they see. Changes apply live.
- Fixed per-person rules can also go in `config.js` (`users`).
- This tidies the interface; it is not a lock. Use non-admin Home Assistant users as well.

**Notifications pop-up**
- One place for what needs attention: warnings, doors and windows open, low batteries, chores, camera snapshots, volcano and earthquake alerts, with an **Active** tab (everything that is on) and ALL OFF / CLOSE ALL shortcuts.
- Water taps show the same rolling water as the Irrigation page. Anything with a running timer (taps, towel rails, fans) shows a live countdown.

**More pages**
- Climate, Energy, Irrigation (floating zone bar, duration buttons 5 minutes to 2 hours with a countdown, soil sensors, rain-skip hint), Media (Sonos grouping, synced lyrics), Events, Vehicle, Hazards, Weather.

**Simple to run**
- One engine, one config. Averages and groups are calculated for you, so no template sensors are needed.
- Everything is optional: leave an entity out and its feature stays hidden. `pages` trims the menu.

## Notes
- Tested in a mock browser (Playwright with a fake Home Assistant) at phone and tablet sizes; always check on your own devices.
- Credits for icons, fonts and data sources are in [CREDITS.md](CREDITS.md).

## Licence
[MIT](LICENSE)

## For developers

`dash.html` is generated from the readable source in `src/` by `node build.mjs`. If you only want to use Kinetic, ignore `src/` and download `dash.html`. To change the code, see [DEVELOPING.md](DEVELOPING.md).
