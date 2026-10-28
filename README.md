# Kinetic

![Kinetic on tablet and phone](docs/screenshots/hero.png)

**Kinetic** is a fast, fluid dashboard for [Home Assistant](https://www.home-assistant.io) on phones, tablets and wall displays. It is **one HTML file** (`dash.html`) plus **one config file** (`config.js`). No build step to install it, no custom card, no integration, no YAML.

**[Try the live demo](https://elementzoom.co.nz/demo/)**: the real dashboard running on a pretend house, guided tour or free play. Nothing in it controls a real home.

> See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

> `config.example.js` contains invented sample data only. Copy it to `config.js` and replace the entity ids with your own.

## Install
1. Put `dash.html`, `config.js` (copied from `config.example.js`) and `brand-logo.js` in Home Assistant's `www/` folder (served as `/local/`).
2. Open `https://<your-ha>/local/dash.html` and sign in with your normal Home Assistant login. Leave `token` empty in `config.js`; never paste a long-lived token, because `www/` files can be read without a login.
3. Add [script](https://github.com/ElementZoom/Kinetic-Dashboard/tree/main/scripts) folder to your root HA folder.
4. Open `config.yaml` and add the contents into your config.yaml for the automation and the lyric script to work
5. After every edit, bump the `?v=` number on the `config.js` script line and hard-refresh (tablets and phones cache hard).
6. Optional: for the per-person Access panel, create one Text helper (Settings > Devices & services > Helpers, max length 255) and set `entities.access` in `config.js`.

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

### Energy
Rebuilt around real power bills: Total, Electricity and Gas side by side on a tablet, one scrolling column on a phone. Real prices from Home Assistant's Energy settings when you have them, a daily-charge line, GST, and a **BILL** tab that follows your billing cycle instead of the calendar month.

| Tablet, dark | Tablet, light |
|---|---|
| ![](docs/screenshots/tablet-dark-energy.png) | ![](docs/screenshots/tablet-light-energy.png) |

| Phone, dark | Phone, light | Switching Electricity, Gas and periods |
|---|---|---|
| ![](docs/screenshots/phone-dark-energy.png) | ![](docs/screenshots/phone-light-energy.png) | ![](docs/animations/energy.gif) |

### Media and artist info
Synced lyrics and an **Artist** tab beside the player. The artist page has a photo header, a short description, a start year, links to Spotify and Wikipedia, and a bio (from Wikipedia, matched by exact title so you get the right artist). `artistInfo: { deezer: true }` adds a Deezer photo and fan count. On a phone Artist is a swipe page in the Now Playing sheet.

| Tablet | Phone | In the Now Playing sheet |
|---|---|---|
| ![](docs/screenshots/tablet-dark-artist.png) | ![](docs/screenshots/phone-dark-artist.png) | ![](docs/animations/artist.gif) |

Light: [tablet](docs/screenshots/tablet-light-artist.png), [phone](docs/screenshots/phone-light-artist.png).

### Seasonal themes
Eight seasons with their own colours and decorations: Christmas, New Year, Halloween, Valentine's, Matariki, Easter, Diwali and Chinese New Year. Switch them on per device on the Theme page (or `seasonal: true` in `config.js`) and they start and stop by themselves on the right dates. Cameras are left alone.

![The eight seasons on the tablet Home page](docs/screenshots/seasons-tablet.png)

![Christmas, Halloween, Matariki and Diwali](docs/animations/seasons.gif)

Each season at full size is in [`docs/screenshots/seasons`](docs/screenshots/seasons).

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

| Energy | Artist info | Weather forecast tabs |
|---|---|---|
| ![](docs/animations/energy.gif) | ![](docs/animations/artist.gif) | ![](docs/animations/weather.gif) |

## Highlights
**Look and feel**
- Dark, light, follow device, **follow sun** (`sun.sun`) or a **time schedule**; colour presets; four styles (**Kinetic**, **Liquid Glass**, **Material**, **Minimal**); four font choices.
- Smooth page, tab and filter transitions, floating bars and slide-up sheets on phones, respecting "reduce motion".
- Weather-aware greeting card with animated weather.
- **Seasonal themes** for eight festivals, with a seasonal touch on your logo; 12- or 24-hour clock on each device.

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
- **Marks on recordings and live cameras**: the person, car or animal that moves is boxed (optional on-device recognition keeps shadows and bushes out).
- Pinch to zoom on full-screen cameras and recordings.
- Alarm panel and siren controls with buttons that glow by state; a two-camera view that follows what is happening.

**People and access**
- **Access panel** (admins only): choose per person which pages, rooms and Security features they see. Changes apply live.
- Fixed per-person rules can also go in `config.js` (`users`).
- This tidies the interface; it is not a lock. Use non-admin Home Assistant users as well.

**Notifications pop-up**
- One place for what needs attention: warnings, doors and windows open, low batteries, chores, camera snapshots, volcano and earthquake alerts, with an **Active** tab (everything that is on) and ALL OFF / CLOSE ALL shortcuts.
- Water taps show the same rolling water as the Irrigation page. Anything with a running timer (taps, towel rails, fans) shows a live countdown.

**More pages**
- Climate, Irrigation (floating zone bar, duration buttons 5 minutes to 2 hours with a countdown, soil sensors, rain-skip hint), Scenes (original artwork for every light scene), Events (calendar with colours per event), Vehicle, Hazards, Weather.
- **Energy** that matches a power bill: real prices, gas, GST, daily charges and a billing-cycle tab.
- **Media**: Sonos grouping, synced lyrics, and artist info (Wikipedia, optional Deezer photo and fans).

**Simple to run**
- One engine, one config. Averages and groups are calculated for you, so no template sensors are needed.
- Everything is optional: leave an entity out and its feature stays hidden. `pages` trims the menu.

## Links for automations

Every page and pop-up has a link, so a Home Assistant notification, button or automation can open it. Add the link after the dashboard's address, for example `…/dash.html#camera/driveway`. Names in `<angle brackets>` come from your own `config.js`; the examples use the sample config.

| Link | Opens |
|---|---|
| `#home` `#rooms` `#climate` `#security` `#weather` `#energy` `#irrigation` `#scenes` `#media` `#events` `#vehicle` `#hazards` `#theme` | That page. Only pages in `pages` (and allowed for that user) open; others go to Home. |
| `#view/auto` | A camera full screen, picked the same way the motion pop-up picks it |
| `#view/driveway` `#view/garage` `#view/both` | The driveway camera, the garage camera, or both side by side, full screen |
| `#camera/<name>` or `#view/<name>` | Any camera in `security`, full screen. `<name>` is the camera name in lowercase with dashes: `#camera/side-gate`, `#camera/patio`, `#camera/backyard` |
| `#security/detections` | The Detections tab of Security |
| `#rooms/<room id>` | One room, using the `id` from `house:` (`living`, `master`, `kids`, `office`, `laundry`, `garage`, `driveway`, `patio`) |
| `#rooms/<room id>/doors` | That room, scrolled to its doors and windows (on a phone, its Doors & windows tab) |
| `#weather/temp` `#weather/wind` `#weather/rain` `#weather/uv` | Weather page on that forecast tab, scrolled to it; on a phone the Forecast tab opens (`#weather/cloud` is the same tab as `uv`) |
| `#weather/pollen` | Weather page at the Pollen card (on a phone, the Pollen tab) |
| `#hazards/earthquakes` `#hazards/volcanoes` | Hazards page on that tab (`#hazards` opens the map) |
| `#notifications` `#active` `#batteries` | The Notifications pop-up on its Alerts, Active or Batteries tab |
| `#active/<section>` | Notifications on Active, scrolled to a section: `lights`, `fans`, `light-switches`, `water-taps`, `curtains`, `windows`, `doors`, `appliances`, `laundry`, `towel-heating` |
| `#arm/home` `#arm/away` `#arm/night` `#disarm` | Sends that command to the alarm panel, then returns to Home |

## Notes
- Tested in a mock browser (Playwright with a fake Home Assistant) at phone and tablet sizes; always check on your own devices.
- All screenshots and animations on this page come from the [live demo](https://elementzoom.co.nz/demo/)'s pretend house: invented names, entities and cameras.
- Credits for icons, fonts and data sources are in [CREDITS.md](CREDITS.md).

## Licence
[MIT](LICENSE)

## For developers

`dash.html` is generated from the readable source in `src/` by `node build.mjs`. If you only want to use Kinetic, ignore `src/` and download `dash.html`. To change the code, see [DEVELOPING.md](DEVELOPING.md).
