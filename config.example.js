// =====================================================================================
//  config.js: SHOWCASE VERSION. Everything below is made-up sample data (names, entity ids,
//  camera sources). It shows the structure of a real install; replace each entity id with the
//  real one from Home Assistant (Developer tools > States) and delete what the house does not have.
//  dash.html (the engine) is the same for every install. After editing, bump the ?v= number on
//  the <script src="config.js?v=..."> line, or hard-refresh. NOTES.md explains every option.
// =====================================================================================
window.DASH_CONFIG = {
  url: location.origin,
  token: "",   // leave blank when the dashboard runs inside Home Assistant (it uses the signed-in user)
  brand: {
    name: "YOUR BRAND", tag: "SMART HOME",
    intro: true,   // short intro on a cold start only. false = logo while loading only
    introAfter: 30,   // minutes the page must have been closed before the intro plays again
    introMs: 3000,
    // placeholder logo: swap the paths for the client's mark. Keep the class names r1 / r2 / sw (the intro animates
    // them).
    mark: '<svg viewBox="0 0 440 140" role="img" aria-label="Your Brand"><defs>' +
      '<linearGradient id="ezb" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="240" y2="0">' +
        '<stop offset="0" stop-color="#9fb4cc"/><stop offset="1" stop-color="#6b4dff"/>' +
        '</linearGradient>' +
      '<linearGradient id="ezs" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset=".5" stop-color="#fff" stop-opacity=".6"/>' +
        '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="ezc"><path d="M60 120 150 30 240 120H210L150 62 90 120Z"/>' +
        '<path d="M180 120 270 30 360 120H330L270 62 210 120Z"/></clipPath></defs>' +
      '<path class="r1" d="M60 120 150 30 240 120H210L150 62 90 120Z" fill="url(#ezb)"/>' +
      '<path class="r2" d="M180 120 270 30 360 120H330L270 62 210 120Z" fill="url(#ezb)" opacity=".85"/>' +
      '<g clip-path="url(#ezc)">' +
        '<rect class="sw" x="40" y="20" width="70" height="110" fill="url(#ezs)" transform="skewX(-22)"/>' +
        '</g></svg>'
  },

  name: "Alex",   // greeting fallback, used when Home Assistant cannot tell us who is signed in
  noNameUsers: ["kiosk"],            // HA user names that get a plain "Evening!" with no name
  tariff: {   // electricity price (Energy page)
    symbol: "$",
    // electricity daily charge per day. Home Assistant's grid cost from a power company usually already includes
    // it; the page then shows it as its own line
    daily: 2.1,
    // gasDaily: 1.8, // gas daily charge per day (Gas card). Home Assistant's gas cost usually does not include it
    periods: [
      { from: 0, to: 7, rate: 0.18, name: "Off-peak (midnight – 7am)" },
      { from: 7, to: 21, rate: 0.34, name: "Day (7am – 9pm)" },
      { from: 21, to: 24, rate: 0.18, name: "Off-peak (9pm – midnight)" }
    ]
  },
  // gst: 0.15, // optional: adds GST to the Energy total (power company figures are excl. GST). NZ is 0.15
  // billing: { // optional: the Energy page BILL tab follows your bill instead of the calendar month
  // electricity: { day: 14, starts: ["2026-09-12"] }, // a cycle starts on this day of the month; starts = exact
  // first days for cycles a meter reading moved
  // gas: { day: 10 } // gas can have its own cycle
  // },
  hapticMs: 35,
  haptics: true,
  mobileLive: true,
  layout: {   // order of the Home cards. "schedule" (today's events, from `calendars`) goes after the cameras / greeting by itself; list it to put it elsewhere
    tablet: ["status", "cams", "rooms", "heatpump", "forecast"],
    mobile: ["status", "nowplaying", "heatpump", "forecast"]
  },
  frostBelow: 2,   // Weather page: show a Frost advisory when the hourly low is at or under this (°C)
  schedule: true,   // false = no "Today" strip / card on Home (it only shows while something is still to come today)
  icons: {   // per-entity icon overrides
    "switch.demo_kitchen_led": "hue-lightstrip",
    "switch.demo_table_light": "countertop"
  },
  vehicle: {   // sample car; prefix = the part after "sensor." in the integration's entity ids
    prefix: "demo_car", name: "Sample Estate 200", plate: "ABC123", tank: 0, lowFuelPct: 15,
    photo: "",   // blank = a simple drawing is shown
    color: "#16161a",
    lockText: { 0: "Unlocked", 1: "Locked", 2: "Locked", 3: "Partly unlocked" },
    ignitionText: { 0: "Off", 1: "Off", 2: "Accessory", 4: "Running" },
    windowText: { 0: "Partly open", 1: "Open", 2: "Closed", 3: "Vented", 4: "Partly open" },
    sunroofText: { 0: "Closed", 1: "Open", 2: "Lifted", 3: "Moving", 4: "Closed", 5: "Partly open" },
    batteryText: { 0: "Good", 1: "Fair", 2: "Low", 3: "Unavailable", 4: "Unavailable" }
  },
  settingsPath: "/config/dashboard",
  weatherFx: { speed: 0.5 },
  mobileNav: "drawer",               // phones: "drawer" | "tabs"
  tileStyle: "line",                 // "line" | "edge" | "dot" | "text"
  // times: "auto" (the device's language decides) | "12" | "24". Each device can change it on the Theme page
  clock: "auto",
  // true: Christmas, New Year, Halloween, Valentine's, Matariki, Easter, Diwali and Chinese New Year change the
  // colours and add a light decoration for their days (hidden on camera pages, still while a camera is live). Each
  // device can switch it on the Theme page
  seasonal: false,
  // seasons: { christmas: ["12-05", "12-26"], matariki: false, diwali: { 2031: "11-14" } }, // optional: change a
  // season's dates (MM-DD, MM-DD), turn one off with false, or give the day for a year past the built-in table
  calNames: { "calendar.alex": "Alex", "calendar.sam": "Sam" },
  outside: "",
  weather: "weather.home",
  calendars: ["calendar.alex", "calendar.sam", "calendar.household", "calendar.public_holidays"],

  cameras: [   // Home page
    { id: "camera.demo_driveway", name: "Driveway" },
    { id: "camera.demo_street", name: "Street" },
    { id: "camera.demo_garage", name: "Garage" },
    { id: "camera.demo_backyard", name: "Backyard" }
  ],
  detections: { snapshots: "media-source://media_source/local/detections" },
  security: [   // Security page
    { id: "camera.demo_driveway", name: "Driveway" },
    { id: "camera.demo_street", name: "Street" },
    { id: "camera.demo_side_gate", name: "Side gate" },
    { id: "camera.demo_patio", name: "Patio" },
    { id: "camera.demo_backyard", name: "Backyard" },
    { id: "camera.demo_garage", name: "Garage" }
  ],
  camControls: {   // tiles shown when a camera is tapped. confirm: true = needs a second tap (amber countdown)
    "camera.demo_driveway": [
      {
        entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact",
        name: "Garage door", confirm: true
      },
      { entity: "light.demo_driveway_lights", name: "Driveway lights" },
      { entity: "light.demo_entrance_lights", name: "Entrance lights" }
    ],
    "camera.demo_street": [{ entity: "light.demo_driveway_lights", name: "Driveway lights" }],
    "camera.demo_side_gate": [{ entity: "light.demo_side_lights", name: "Side lights" }],
    "camera.demo_patio": [
      { entity: "light.demo_patio_main", name: "Patio main" },
      { entity: "light.demo_patio_side", name: "Patio side" }
    ],
    "camera.demo_backyard": [{ entity: "light.demo_patio_main", name: "Patio main" }],
    "camera.demo_garage": [
      {
        entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact",
        name: "Garage door", confirm: true
      },
      { entity: "switch.demo_garage_light", name: "Garage light" }
    ]
  },
  // Garage door alert: while the door is open the camera card gets a red frame and a "GARAGE OPEN" band
  // (Home, Security, full screen and playback preview). While the door moves it turns amber ("OPENING" /
  // "CLOSING").
  // sensor = the door contact (on = open; add invert: true if yours is the other way round).
  // opener = optional: the switch / button / cover that moves the door. A door contact only says open or closed,
  // so opening/closing is worked out from the opener being pressed; travel = seconds the door takes to open.
  garageAlert: {
    "camera.demo_garage": {
      sensor: "binary_sensor.demo_garage_door_contact", opener: "switch.demo_garage_opener", travel: 15
    }
  },
  // Full-screen camera view: dash.html#view/auto, #view/driveway, #view/garage or #view/both
  view: {
    driveway: { id: "camera.demo_driveway", name: "Driveway", trig: ["binary_sensor.demo_outdoor_presence"] },
    garage: { id: "camera.demo_garage", name: "Garage", trig: ["binary_sensor.demo_garage_door_contact"] },
    detHold: 0,
    hold: 20,
    returnAfter: 0,
    popup: false
  },
  indoor: "sensor.house_average_temperature",   // calculated by the dashboard from derived.houseTemps
  derived: {
    houseTemps: [
      "sensor.demo_living_temperature", "sensor.demo_master_temperature", "sensor.demo_kids_temperature",
      "sensor.demo_office_temperature"
    ],
    soil: {
      driveway: {
        moisture: ["sensor.demo_soil_drw_1_moisture", "sensor.demo_soil_drw_2_moisture"],
        temp: ["sensor.demo_soil_drw_1_temperature", "sensor.demo_soil_drw_2_temperature"]
      },
      backyard: {
        moisture: ["sensor.demo_soil_bky_1_moisture", "sensor.demo_soil_bky_2_moisture"],
        temp: ["sensor.demo_soil_bky_1_temperature", "sensor.demo_soil_bky_2_temperature"]
      }
    },
    // Notifications > Batteries lists the Battery Notes "Battery+" sensors (sensor.<device>_battery_plus) below
    // this percentage, and the low-battery count uses the same list
    batteryBelow: 25,   // the Notifications "Batteries" tab lists devices under this %
    batteryAlertBelow: 20,   // the clock strip shows a "Low battery" chip for devices under this % (0 = never)
    groups: {   // whole-house groups the dashboard builds itself
      "group.all_fans": ["fan.demo_bathroom_fan", "fan.demo_laundry_fan"],
      "group.all_curtains": ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
      "group.all_light_switches": [
        "switch.demo_kitchen_led", "switch.demo_table_light", "switch.demo_garage_light",
        "switch.demo_bedside_left", "switch.demo_bedside_right"
      ],
      "group.all_water_taps": [
        "switch.demo_backyard_tap", "switch.demo_driveway_tap", "switch.demo_walkway_tap"
      ],
      "group.all_windows": [
        "binary_sensor.demo_living_window_1", "binary_sensor.demo_living_window_2",
        "binary_sensor.demo_master_window", "binary_sensor.demo_kids_window",
        "binary_sensor.demo_office_window"
      ],
      "group.external_doors": [
        "binary_sensor.demo_front_door_contact", "binary_sensor.demo_garage_door_contact",
        "binary_sensor.demo_patio_door_contact"
      ],
      "light.all_lights": [
        "light.demo_living_lights", "light.demo_kitchen_lights", "light.demo_master_lights",
        "light.demo_kids_lights", "light.demo_office_lights", "light.demo_driveway_lights",
        "light.demo_patio_main", "light.demo_patio_side"
      ]
    }
  },
  lyricsFrom: ["media_player.spotify_alex"],
  // Media: an Artist tab beside the lyrics, and an Artist page in the Now Playing sheet (bio and photo from
  // Wikipedia; the artist name is sent there). enabled: false hides it; lang = Wikipedia language ("en", "de", "mi"
  // ...). deezer: true also asks Deezer for a better photo and the fan count (the name is sent to Deezer too).
  artistInfo: { enabled: true, lang: "en", deezer: false },
  media: ["media_player.demo_living_speaker", "media_player.demo_master_speaker"],
  playback: {   // camera recordings (media sources from the camera integration)
    "camera.demo_driveway": "media-source://reolink/RES|DEMO0000000000000000000001|0|main",
    "camera.demo_street": "media-source://reolink/RES|DEMO0000000000000000000002|0|main",
    "camera.demo_side_gate": "media-source://reolink/RES|DEMO0000000000000000000003|0|main",
    "camera.demo_patio": "media-source://reolink/RES|DEMO0000000000000000000004|0|main",
    "camera.demo_backyard": "media-source://reolink/RES|DEMO0000000000000000000005|0|main",
    "camera.demo_garage": "media-source://reolink/RES|DEMO0000000000000000000006|0|main"
  },
  alarm: "alarm_control_panel.demo_alarm",
  alarmTiles: [
    {
      entity: "input_boolean.demo_siren_toggle", script: "demo_siren_toggle", siren: "toggle", name: "Siren",
      icon: "alarm-light"
    },
    {
      entity: "input_boolean.demo_siren_timed", script: "demo_siren_30_seconds", siren: "timed",
      name: "Siren · 30 s", icon: "timer-alert"
    }
  ],
  rainSkipMm: 2,
  // Irrigation zones. `zone` is the name your "start sprinkler" script expects (hyphens are sent as underscores).
  // `timer` = the Timer helper for that zone: its countdown shows on the Irrigation page and on the tap's tile in
  // the notifications pop-up.
  // Pollen (Google Pollen through Home Assistant's "pollenlevels" integration). Only risk is needed; alertFrom is the level where the
  // strip beside the clock and the Alerts list start to show it ("low" ... "very high", false = never).
  pollen: { risk: "sensor.demo_pollen_risk", top: "sensor.demo_pollen_top", plants: "sensor.demo_pollen_plants", grass: "sensor.demo_pollen_grass", alertFrom: "moderate" },
  waterRestrictionText: {   // wording shown on the Irrigation page for each water restriction level (0 = none).
    0: "Use water sensibly.",   // The level itself comes from input_select.water_restriction_level (options: No Water
    1: "Sprinklers 6-8am & 6-8pm only.",   // Restriction, Water Level 1 ... Water Level 4)
    2: "Alternate day. Sprinklers 6-8am & 6-8pm.",
    3: "Sprinklers banned. Hand watering only, alternate days 6-8am & 6-8pm.",
    4: "Total outdoor watering ban. Essential indoor use only."
  },
  irrigation: [
    {
      name: "Driveway", zone: "driveway", switch: "switch.demo_driveway_tap",
      flow: "sensor.demo_driveway_tap_flow", timer: "timer.demo_driveway_timer",
      moist: "sensor.average_driveway_soil_moisture", stemp: "sensor.average_driveway_soil_temperature"
    },
    {
      name: "Walkway", zone: "walkway", switch: "switch.demo_walkway_tap",
      flow: "sensor.demo_walkway_tap_flow", timer: "timer.demo_walkway_timer"
    },
    {
      name: "Backyard", zone: "backyard", switch: "switch.demo_backyard_tap",
      flow: "sensor.demo_backyard_tap_flow", timer: "timer.demo_backyard_timer",
      moist: "sensor.average_backyard_soil_moisture", stemp: "sensor.average_backyard_soil_temperature"
    }
  ],
  // Scenes page: not set up in this sample (it needs the client's own light scenes). Leave "scenes" out and remove
  // "scenes" from CONFIG.pages if you list pages.
  pages: [
    "home", "rooms", "climate", "security", "weather", "energy", "irrigation", "media", "events", "vehicle",
    "hazards", "theme"
  ],

  rooms: [   // Climate page. main:true = the heat pump (full modes); others are zones
    { id: "climate.demo_heat_pump", name: "Heat pump", icon: "heat-pump", main: true },
    { id: "climate.demo_living", name: "Living room", icon: "sofa" },
    { id: "climate.demo_master", name: "Master bedroom", icon: "bed-king" },
    { id: "climate.demo_kids", name: "Kids room", icon: "teddy-bear" },
    { id: "climate.demo_office", name: "Office", icon: "desktop-tower-monitor" }
  ],
  countIfNotOff: ["select.demo_rangehood_fan_speed"],
  roomsByPresence: true,   // Rooms page: "Occupied" tab first (rooms with a presence sensor)
  roomTabs: [
    ["Main", ["living", "master", "kids", "office"]],
    ["Utility", ["laundry", "garage"]],
    ["Outdoor", ["driveway", "patio"]]
  ],
  tiles: [   // Home page room tiles (tap = open that room)
    {
      name: "Living", icon: "sofa", room: "living", climate: "climate.demo_living",
      temp: "sensor.demo_living_temperature", hum: "sensor.demo_living_humidity"
    },
    {
      name: "Master", icon: "bed-king", room: "master", climate: "climate.demo_master",
      temp: "sensor.demo_master_temperature", hum: "sensor.demo_master_humidity"
    },
    {
      name: "Kids", icon: "teddy-bear", room: "kids", climate: "climate.demo_kids",
      temp: "sensor.demo_kids_temperature", hum: "sensor.demo_kids_humidity"
    },
    {
      name: "Office", icon: "desktop-tower-monitor", room: "office", climate: "climate.demo_office",
      temp: "sensor.demo_office_temperature", hum: "sensor.demo_office_humidity"
    },
    {
      name: "Garage", icon: "garage-variant", room: "garage", temp: "sensor.demo_garage_temperature",
      hum: "sensor.demo_garage_humidity"
    }
  ],
  // Rooms page. lights / windows / doors / covers / fans can be an entity or a group. "sections" = hand-picked
  // tiles.
  house: [
    {
      id: "living", name: "Living area", icon: "sofa", temp: "sensor.demo_living_temperature",
      hum: "sensor.demo_living_humidity", occ: ["binary_sensor.demo_living_presence"],
      lightSwitches: ["switch.demo_kitchen_led", "switch.demo_table_light"], climate: ["climate.demo_living"],
      lights: ["light.demo_living_lights", "light.demo_kitchen_lights"],
      windows: ["binary_sensor.demo_living_window_1", "binary_sensor.demo_living_window_2"],
      doors: ["binary_sensor.demo_patio_door_contact"],
      sections: [
        {
          name: "Living area",
          items: [
            "light.demo_living_lights", "light.demo_kitchen_lights", "switch.demo_kitchen_led",
            "switch.demo_table_light"
          ]
        },
        { name: "Kitchen", items: ["select.demo_rangehood_fan_speed"] },
        { name: "Controls", items: ["input_boolean.demo_movie_mode"] }
      ]
    },
    {
      id: "master", name: "Master bedroom", icon: "bed-king", temp: "sensor.demo_master_temperature",
      hum: "sensor.demo_master_humidity", occ: ["binary_sensor.demo_master_presence"],
      lightSwitches: ["switch.demo_bedside_left", "switch.demo_bedside_right"],
      climate: "climate.demo_master", lights: ["light.demo_master_lights"],
      windows: ["binary_sensor.demo_master_window"],
      covers: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
      sections: [
        {
          name: "Lights",
          items: [
            { entity: "light.demo_master_lights", name: "Room lights" },
            "switch.demo_bedside_left",
            "switch.demo_bedside_right"
          ]
        },
        { name: "Curtains", items: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"] }
      ]
    },
    {
      id: "kids", name: "Kids room", icon: "teddy-bear", temp: "sensor.demo_kids_temperature",
      hum: "sensor.demo_kids_humidity", occ: [], climate: "climate.demo_kids",
      lights: ["light.demo_kids_lights"], windows: ["binary_sensor.demo_kids_window"],
      doors: ["binary_sensor.demo_kids_door_contact"],
      sections: [
        {
          name: "Lights",
          items: [
            { entity: "light.demo_kids_lights", name: "Room lights" },
            { entity: "light.demo_kids_night_light", name: "Night light" }
          ]
        }
      ]
    },
    {
      id: "office", name: "Office", icon: "desktop-tower-monitor", temp: "sensor.demo_office_temperature",
      hum: "sensor.demo_office_humidity", occ: ["binary_sensor.demo_office_presence"],
      climate: "climate.demo_office", lights: ["light.demo_office_lights"],
      windows: ["binary_sensor.demo_office_window"],
      sections: [
        {
          name: "Lights",
          items: [
            { entity: "light.demo_office_lights", name: "Room lights" },
            { entity: "light.demo_desk_lamp", name: "Desk lamp" }
          ]
        }
      ]
    },
    {
      id: "laundry", name: "Laundry", icon: "washing-machine", temp: "sensor.demo_laundry_temperature",
      occ: ["binary_sensor.demo_laundry_motion"], fans: ["fan.demo_laundry_fan"],
      lights: ["light.demo_laundry_lights"], doors: ["binary_sensor.demo_laundry_door_contact"],
      sections: [{ name: "Lights", items: [{ entity: "light.demo_laundry_lights", name: "Room lights" }] }]
    },
    {
      id: "garage", name: "Garage", icon: "garage-variant", temp: "sensor.demo_garage_temperature",
      hum: "sensor.demo_garage_humidity", occ: ["binary_sensor.demo_garage_presence"],
      counts: { garage: "binary_sensor.demo_garage_door_contact" },
      lightSwitches: ["switch.demo_garage_light"], lights: ["switch.demo_garage_light"],
      doors: ["binary_sensor.demo_garage_door_contact"],
      sections: [
        {
          name: "Garage door",
          items: [
            {
              entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact",
              name: "Garage door", confirm: true
            }
          ]
        },
        { name: "Lights", items: [{ entity: "switch.demo_garage_light", name: "Garage light" }] }
      ]
    },
    {
      id: "driveway", name: "Driveway", icon: "car", temp: "sensor.demo_outdoor_temperature",
      hum: "weather.home#humidity", occ: ["binary_sensor.demo_outdoor_presence"],
      lights: ["light.demo_driveway_lights", "light.demo_entrance_lights"],
      doors: ["binary_sensor.demo_front_door_contact", "binary_sensor.demo_garage_door_contact"],
      sections: [{ name: "Lights", items: ["light.demo_driveway_lights", "light.demo_entrance_lights"] }]
    },
    {
      id: "patio", name: "Patio", icon: "grass", temp: "sensor.demo_outdoor_temperature",
      hum: "weather.home#humidity", occ: ["binary_sensor.demo_patio_presence"],
      lights: ["light.demo_patio_main", "light.demo_patio_side"],
      doors: ["binary_sensor.demo_patio_door_contact"],
      sections: [{ name: "Lights", items: ["light.demo_patio_main", "light.demo_patio_side"] }]
    }
  ],

  // ---- named helper entities the dashboard looks for (any can be left out: that feature then stays hidden) ----
  entities: {
    outdoorTemp: "sensor.demo_outdoor_temperature", rainDetected: "binary_sensor.demo_rain_detected",
    airQuality: "sensor.demo_air_quality_index", weatherWarnings: "sensor.demo_weather_warnings",
    earthquake: "binary_sensor.demo_earthquake_alert", laundryState: "sensor.demo_washer_state",
    laundryRemaining: "sensor.demo_washer_time_remaining", laundryDelay: "sensor.demo_washer_delay_time",
    mbrCurtains: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
    doorsGroup: "group.external_doors", lowBatteryCount: "sensor.demo_low_battery_count",
    tabletBattery: "sensor.demo_wall_tablet_battery",
    tabletPlugged: "binary_sensor.demo_wall_tablet_plugged_in",
    // helper (Text, max length 255) that stores who can see what: Theme > Access
    access: "input_text.dashboard_access"
  },
  volcanoes: [],                         // alert-level sensors, e.g. ["sensor.volcano_name"]
  hazards: { radius: 200, focusKm: 100, minMag: 4, volcanoMinLevel: 2 },   // volcanoMinLevel: GeoNet level (0-5) from which a volcano shows in Alerts / Notifications; 2 = Moderate to heightened unrest
  siren: { flag: "input_boolean.demo_siren_toggle", script30: "demo_siren_30_seconds" },
  // Notification pop-up rows: [entity, title, text, optional tag]. tag "driveway", "garage", or any camera name
  // from the Security list (e.g. "road") also shows that camera, live, while the alert is on
  // Extra pairings for the countdown on notification tiles: entity -> timer. Taps use their zone's timer, and
  // anything with a timer.<name> or timer.<name>_timer is found on its own, so this is only for the odd ones out.
  // a tile shows its timer's countdown and bar while the entity is on (rooms, Active list, Alerts)
  tileTimers: { "switch.demo_towel_rail": "timer.demo_towel_rails" },
  // look while on: "heat" = red with warm haze, "charge" = green with a charging battery, "air" = blue with a
  // turning fan and air streaks (fans get it automatically; "none" turns it off)
  tileFx: {
    "switch.demo_towel_rail": "heat", "switch.demo_vacuum_charger": "charge", "fan.demo_extractor": "air"
  },
  // appliances that get their own "Appliances" group in the Active tab while on
  activeAppliances: ["switch.demo_rice_cooker"],
  // notifTimers: ["timer.demo_oven"], // optional "Timers" card in Alerts for timers that belong to no tile. Leave
  // it out when every timer is in tileTimers.
  alerts: [
    ["binary_sensor.demo_front_door_contact", "Front door", "Open"],
    ["input_boolean.demo_rubbish_day", "Rubbish day", "Bring the bins out", "driveway"],
    ["switch.demo_backyard_tap", "Backyard tap", "Water is running"]
  ],
  // Bins card (Alerts tab, and "Bins out" in the header strip while a bin is due and not out yet). due = [switch that is on from the evening before pickup, name, icon];
  // out = a switch that turns on once the bins are at the kerb; camera = a camera name (as on the Security page) for a quick look on pickup day; eveningFrom = the hour from which pickup is "tomorrow".
  // bins: { due: [["input_boolean.demo_recycling_day", "Recycling", "recycle"], ["input_boolean.demo_rubbish_day", "Rubbish", "trash-can"], ["input_boolean.demo_garden_day", "Garden", "leaf"]], out: "input_boolean.demo_bins_out", camera: "road", eveningFrom: 16 },
  // Attention: things worth acting on, on the Notifications > ATTENTION tab (it replaces the Batteries tab) and a slim "NEEDS ATTENTION" card on Home that opens it.
  // It lists the bins that are due, dry soil, devices (lights, switches, covers, locks, climate, cameras, fans, sirens, alarm panels, vacuums) that have been offline for a while,
  // updates waiting in Home Assistant and low batteries. Alerts keeps the urgent things (leak, warnings, doors). All of it is on by default; attention: false hides the lot. It lives in Notifications; Home shows the Leaving card instead.
  // offlineMinutes = how long a device must be unavailable before it is listed. soilBelow / batteryBelow = the percentages under which soil and batteries are listed.
  // ignore = regular expressions for entities to leave out. watch = more entities (sensors, say) to list when they go offline.
  // attention: { offline: true, offlineMinutes: 10, updates: true, soil: true, soilBelow: 25, batteries: true, batteryBelow: 26, ignore: ["demo_hall_lamp"], watch: ["binary_sensor.demo_gate"] },
  // Leaving: the card on Home that lists what is still on or open (lights left on, the garage door, open doors, a disarmed alarm). Tap it for the list, with Lights off and Arm away.
  // It only shows while there is something to check. Lights come from the rooms on your Rooms page (house); lightEntities replaces that list, ignore = regular expressions for entities to leave out.
  // Each check can be switched off; leaving: false removes the card. Doors use doorsGroup and the garage uses the sensors in garageAlert.
  // leaving: { lights: true, garage: true, doors: true, alarm: true, lightEntities: [], ignore: ["demo_hall_lamp"] },
  // Weather alerts: a Weather card in Notifications > Alerts (wind now with a gauge, and rain in the next few hours), from the weather entity and its hourly forecast. On by default.
  // pageTransition: how a page appears when you switch tabs: "rise" (default), "slide", "fade", "zoom", "flip", "blur", "tilt" or "off". Each device can override it on the Theme page.
  // pageTransition: "rise",
  // pageTransitionSpeed: "normal",   // "fast", "normal" or "slow" (each device can change it on the Theme page)
  // eventsView: { tablet: "month", mobile: "agenda" },   // the Events page view a device starts on (tablet: month | week | list, phone: agenda | week | month); each device remembers what you pick
  // Wind tiers are km/h (Moderate / Strong / Severe), rain tiers are mm per hour (Light / Moderate / Heavy). stripWind / stripRain = the tier (1 to 3) from which the header strip shows a chip: Strong wind and Heavy rain by default.
  // weatherAlerts: false hides it. wind: false or rain: false hides one part. hours = how far ahead the forecast is checked.
  // weatherAlerts: { wind: true, rain: true, windTiers: [30, 62, 89], rainTiers: [0.5, 2, 5], hours: 6, stripWind: 2, stripRain: 3 },
  // Water leak sensors: while one is on it shows first under Warnings in the notifications pop-up and the strip by
  // the clock turns into a leak icon (top priority).
  // An id on its own, or [id, name, text]. Example: [["binary_sensor.demo_washing_machine_leak", "Washing machine",
  // "Water under the machine"]]
  leakSensors: [["binary_sensor.demo_washing_machine_leak", "Washing machine", "Water under the machine"]],
  // Notification pop-up "all on" shortcuts: [label, group entity, icon, optional "close" | 1]
  // camZoom: false, // Cameras: set false to turn off pinch to zoom / drag to move on a full-screen camera
  // camFullscreen: false, // Phones: set false to open a camera full-bleed without asking the browser for real full
  // screen (no system bars moving, so no blink on open / close)
  // detectMark: "brackets", // marks on recordings (Playback, Detections): "brackets" (default) | "box" | "glow" |
  // false (none). Boxes the camera's tagged things (Person, Vehicle, Animal)
  // detectAI: { // optional: recognise people / cars / animals in recordings so a bush or a shadow is not boxed.
  // Without it the boxes follow movement only
  // engine: "yolox", // YOLOX (Apache-2.0), runs in the browser with onnxruntime-web
  // model: "/local/yolox_tiny.onnx", // your copy of the model file (yolox_tiny.onnx, or yolox_s.onnx: more
  // accurate, about 4x slower)
  // size: 416, // picture size for yolox_tiny; a model file with its own size (yolox_s = 640) wins
  // gpu: true, // use the graphics chip where the phone / tablet has one (much faster); false = processor only
  // lookahead: 0.8, // recordings only: look this many seconds ahead with a hidden second copy so the box is ready
  // in time (second video decoder; off when left out)
  // maxMs: 1500, // switch the recogniser off if three looks in a row take longer than this (ms)
  // debug: false, // true shows a small chip with the version and the speed (or add ?mkdebug to the address once)
  // },
  // detectLive: true, // needs detectAI: a camera tapped to full screen gets the same boxes (people, cars, animals)
  // on its live picture; closing it stops them. Off when left out. Live has no lookahead, so boxes trail a fast
  // mover a little more than on recordings
  // roomFx: "waves", // room card animation: "waves" (slow rolling waves, default) | "glow" (soft corner glow) |
  // false (none). Warmer rooms move a little faster
  // notifRoomHeadings: false, // Notifications > Active: set false to drop the room headings inside each category
  quickAll: [
    ["Lights", "light.all_lights", "lightbulb-on"],
    ["Fans", "group.all_fans", "fan"],
    ["Light switches", "group.all_light_switches", "m3-switch"],
    ["Water taps", "group.all_water_taps", "m3-water-drop"],
    ["Curtains", "group.all_curtains", "m3-curtains", "close"],
    ["Windows", "group.all_windows", "m3-window-open", 1],
    ["Doors", "group.external_doors", "m3-door-open", 1]
  ],
  adminToggles: [   // [label, counter id, word, [[entity, name], ...]]
    [
      "Driveway security",
      "sensor.disabled_driveway_camera_count",
      "camera",
      [
        ["automation.demo_driveway_person_notification", "Person"],
        ["automation.demo_driveway_vehicle_notification", "Vehicle"]
      ]
    ]
  ],
  // climateGraph: ["climate.living", "climate.master"],   // rooms averaged in the Climate page 24-hour graph (default: every room except the heat pump)
  climateAuto: [   // a switch at the top of the Climate page that turns these automations on / off together (nothing else is needed in Home Assistant)
    "automation.demo_climate_control",
    "automation.demo_climate_off_time"
  ],   // or { name: "Auto climate", entities: [...] }
  climateTriggers: {   // house-wide: Heat below / Cool above steppers in the heat pump card, set these input_number helpers (the automations read them)
    heatBelow: "input_number.demo_climate_heat_below",
    coolAbove: "input_number.demo_climate_cool_above"
  },   // a room can have its own: add  heatBelow: "input_number.demo_master_heat_below", coolAbove: "input_number.demo_master_cool_above"  to its entry in rooms. A room can also have  autoClimate: "input_boolean.demo_master_auto_climate"  (a "Sleeping here tonight" switch; autoLabel: "..." renames it)
  roomControls: {   // extra tiles at the top of a room's AUTOMATIONS pop-up
    master: [{ entity: "input_boolean.demo_master_auto_climate", name: "Auto climate", icon: "thermometer" }],
    kids:   [{ entity: "input_boolean.demo_kids_auto_climate", name: "Auto climate", icon: "thermometer" }],
    office: [{ entity: "input_boolean.demo_office_auto_climate", name: "Auto climate", icon: "thermometer" }]
  },
  relevance: {   // extra regex added to the engine's "is this entity relevant to this page" filters
    weather: "sensor\\.demo_(weather|air|outdoor)|binary_sensor\\.demo_earthquake",
    // the engine already matches names containing water_tap / sprinkler / soil; add yours here if they differ
    irrigation: "demo_(driveway|walkway|backyard)_(tap|timer)",
    notif: "earthquake|rubbish|water_tap|demo_weather|demo_low_battery"
  }
  // ---- optional: fixed restrictions per signed-in person (Theme > Access does the same without editing this file) ----
  // users: { "guest": { pages: ["home", "rooms"], rooms: ["living"], security: { controls: false } } }
};
