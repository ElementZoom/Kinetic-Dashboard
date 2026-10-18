// =====================================================================================
//  config.js: SHOWCASE VERSION. Everything below is made-up sample data (names, entity ids,
//  camera sources). It shows the structure of a real install; replace each entity id with the
//  real one from Home Assistant (Developer tools > States) and delete what the house does not have.
//  dash.html (the engine) is the same for every install. After editing, bump the ?v= number on
//  the <script src="config.js?v=..."> line, or hard-refresh. NOTES.md explains every option.
// =====================================================================================
window.DASH_CONFIG = {
  url: location.origin,
  token: "",                         // leave blank when the dashboard runs inside Home Assistant (it uses the signed-in user)
  brand: {
    name: "YOUR BRAND",
    tag: "SMART HOME",
    intro: true,                     // short intro on a cold start only. false = logo while loading only
    introAfter: 30,                  // minutes the page must have been closed before the intro plays again
    introMs: 3000,
    // placeholder logo: swap the paths for the client's mark. Keep the class names r1 / r2 / sw (the intro animates them).
    mark: '<svg viewBox="0 0 440 140" role="img" aria-label="Your Brand"><defs>' +
      '<linearGradient id="ezb" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="240" y2="0"><stop offset="0" stop-color="#9fb4cc"/><stop offset="1" stop-color="#6b4dff"/></linearGradient>' +
      '<linearGradient id="ezs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="ezc"><path d="M60 120 150 30 240 120H210L150 62 90 120Z"/><path d="M180 120 270 30 360 120H330L270 62 210 120Z"/></clipPath></defs>' +
      '<path class="r1" d="M60 120 150 30 240 120H210L150 62 90 120Z" fill="url(#ezb)"/>' +
      '<path class="r2" d="M180 120 270 30 360 120H330L270 62 210 120Z" fill="url(#ezb)" opacity=".85"/>' +
      '<g clip-path="url(#ezc)"><rect class="sw" x="40" y="20" width="70" height="110" fill="url(#ezs)" transform="skewX(-22)"/></g></svg>',
  },

  name: "Alex",                      // greeting fallback, used when Home Assistant cannot tell us who is signed in
  noNameUsers: ["kiosk"],            // HA user names that get a plain "Evening!" with no name
  tariff: {                          // electricity price (Energy page)
    symbol: "$", daily: 2.1,
    periods: [
      { from: 0, to: 7, rate: 0.18, name: "Off-peak (midnight – 7am)" },
      { from: 7, to: 21, rate: 0.34, name: "Day (7am – 9pm)" },
      { from: 21, to: 24, rate: 0.18, name: "Off-peak (9pm – midnight)" }
    ]
  },
  hapticMs: 35,
  haptics: true,
  mobileLive: true,
  layout: {
    tablet: ["status", "cams", "rooms", "heatpump", "forecast"],
    mobile: ["status", "nowplaying", "heatpump", "forecast"]
  },
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
    "camera.demo_driveway": [{ entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact", name: "Garage door", confirm: true }, { entity: "light.demo_driveway_lights", name: "Driveway lights" }, { entity: "light.demo_entrance_lights", name: "Entrance lights" }],
    "camera.demo_street": [{ entity: "light.demo_driveway_lights", name: "Driveway lights" }],
    "camera.demo_side_gate": [{ entity: "light.demo_side_lights", name: "Side lights" }],
    "camera.demo_patio": [{ entity: "light.demo_patio_main", name: "Patio main" }, { entity: "light.demo_patio_side", name: "Patio side" }],
    "camera.demo_backyard": [{ entity: "light.demo_patio_main", name: "Patio main" }],
    "camera.demo_garage": [
      { entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact", name: "Garage door", confirm: true },
      { entity: "switch.demo_garage_light", name: "Garage light" }]
  },
  // Garage door alert: while the door is open the camera card gets a red frame and a "GARAGE OPEN" band
  // (Home, Security, full screen and playback preview). While the door moves it turns amber ("OPENING" / "CLOSING").
  // sensor = the door contact (on = open; add invert: true if yours is the other way round).
  // opener = optional: the switch / button / cover that moves the door. A door contact only says open or closed,
  // so opening/closing is worked out from the opener being pressed; travel = seconds the door takes to open.
  garageAlert: {
    "camera.demo_garage": { sensor: "binary_sensor.demo_garage_door_contact", opener: "switch.demo_garage_opener", travel: 15 }
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
    houseTemps: ["sensor.demo_living_temperature", "sensor.demo_master_temperature", "sensor.demo_kids_temperature", "sensor.demo_office_temperature"],
    soil: {
      driveway: { moisture: ["sensor.demo_soil_drw_1_moisture", "sensor.demo_soil_drw_2_moisture"], temp: ["sensor.demo_soil_drw_1_temperature", "sensor.demo_soil_drw_2_temperature"] },
      backyard: { moisture: ["sensor.demo_soil_bky_1_moisture", "sensor.demo_soil_bky_2_moisture"], temp: ["sensor.demo_soil_bky_1_temperature", "sensor.demo_soil_bky_2_temperature"] }
    },
    batteryBelow: 25,
    groups: {   // whole-house groups the dashboard builds itself
      "group.all_fans": ["fan.demo_bathroom_fan", "fan.demo_laundry_fan"],
      "group.all_curtains": ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
      "group.all_light_switches": ["switch.demo_kitchen_led", "switch.demo_table_light", "switch.demo_garage_light", "switch.demo_bedside_left", "switch.demo_bedside_right"],
      "group.all_water_taps": ["switch.demo_backyard_tap", "switch.demo_driveway_tap", "switch.demo_walkway_tap"],
      "group.all_windows": ["binary_sensor.demo_living_window_1", "binary_sensor.demo_living_window_2", "binary_sensor.demo_master_window", "binary_sensor.demo_kids_window", "binary_sensor.demo_office_window"],
      "group.external_doors": ["binary_sensor.demo_front_door_contact", "binary_sensor.demo_garage_door_contact", "binary_sensor.demo_patio_door_contact"],
      "light.all_lights": ["light.demo_living_lights", "light.demo_kitchen_lights", "light.demo_master_lights", "light.demo_kids_lights", "light.demo_office_lights", "light.demo_driveway_lights", "light.demo_patio_main", "light.demo_patio_side"]
    }
  },
  lyricsFrom: ["media_player.spotify_alex"],
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
    { entity: "input_boolean.demo_siren_toggle", script: "demo_siren_toggle", siren: "toggle", name: "Siren", icon: "alarm-light" },
    { entity: "input_boolean.demo_siren_timed", script: "demo_siren_30_seconds", siren: "timed", name: "Siren · 30 s", icon: "timer-alert" }
  ],
  rainSkipMm: 2,
  // Irrigation zones. `zone` is the name your "start sprinkler" script expects (hyphens are sent as underscores).
  // `timer` = the Timer helper for that zone: its countdown shows on the Irrigation page and on the tap's tile in the notifications pop-up.
  irrigation: [
    { name: "Driveway", zone: "driveway", switch: "switch.demo_driveway_tap", flow: "sensor.demo_driveway_tap_flow", timer: "timer.demo_driveway_timer", moist: "sensor.average_driveway_soil_moisture", stemp: "sensor.average_driveway_soil_temperature" },
    { name: "Walkway", zone: "walkway", switch: "switch.demo_walkway_tap", flow: "sensor.demo_walkway_tap_flow", timer: "timer.demo_walkway_timer" },
    { name: "Backyard", zone: "backyard", switch: "switch.demo_backyard_tap", flow: "sensor.demo_backyard_tap_flow", timer: "timer.demo_backyard_timer", moist: "sensor.average_backyard_soil_moisture", stemp: "sensor.average_backyard_soil_temperature" }
  ],
  // Scenes page: not set up in this sample (it needs the client's own light scenes). Leave "scenes" out and remove "scenes" from CONFIG.pages if you list pages.
  pages: ["home", "rooms", "climate", "security", "weather", "energy", "irrigation", "media", "events", "vehicle", "hazards", "theme"],

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
    { name: "Living", icon: "sofa", room: "living", climate: "climate.demo_living", temp: "sensor.demo_living_temperature", hum: "sensor.demo_living_humidity" },
    { name: "Master", icon: "bed-king", room: "master", climate: "climate.demo_master", temp: "sensor.demo_master_temperature", hum: "sensor.demo_master_humidity" },
    { name: "Kids", icon: "teddy-bear", room: "kids", climate: "climate.demo_kids", temp: "sensor.demo_kids_temperature", hum: "sensor.demo_kids_humidity" },
    { name: "Office", icon: "desktop-tower-monitor", room: "office", climate: "climate.demo_office", temp: "sensor.demo_office_temperature", hum: "sensor.demo_office_humidity" },
    { name: "Garage", icon: "garage-variant", room: "garage", temp: "sensor.demo_garage_temperature", hum: "sensor.demo_garage_humidity" }
  ],
  // Rooms page. lights / windows / doors / covers / fans can be an entity or a group. "sections" = hand-picked tiles.
  house: [
    { id: "living", name: "Living area", icon: "sofa", temp: "sensor.demo_living_temperature", hum: "sensor.demo_living_humidity", occ: ["binary_sensor.demo_living_presence"],
      lightSwitches: ["switch.demo_kitchen_led", "switch.demo_table_light"], climate: ["climate.demo_living"],
      lights: ["light.demo_living_lights", "light.demo_kitchen_lights"],
      windows: ["binary_sensor.demo_living_window_1", "binary_sensor.demo_living_window_2"], doors: ["binary_sensor.demo_patio_door_contact"],
      sections: [
        { name: "Living area", items: ["light.demo_living_lights", "light.demo_kitchen_lights", "switch.demo_kitchen_led", "switch.demo_table_light"] },
        { name: "Kitchen", items: ["select.demo_rangehood_fan_speed"] },
        { name: "Controls", items: ["input_boolean.demo_movie_mode"] }
      ] },
    { id: "master", name: "Master bedroom", icon: "bed-king", temp: "sensor.demo_master_temperature", hum: "sensor.demo_master_humidity", occ: ["binary_sensor.demo_master_presence"],
      lightSwitches: ["switch.demo_bedside_left", "switch.demo_bedside_right"], climate: "climate.demo_master",
      lights: ["light.demo_master_lights"], windows: ["binary_sensor.demo_master_window"], covers: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
      sections: [
        { name: "Lights", items: [{ entity: "light.demo_master_lights", name: "Room lights" }, "switch.demo_bedside_left", "switch.demo_bedside_right"] },
        { name: "Curtains", items: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"] }
      ] },
    { id: "kids", name: "Kids room", icon: "teddy-bear", temp: "sensor.demo_kids_temperature", hum: "sensor.demo_kids_humidity", occ: [],
      climate: "climate.demo_kids", lights: ["light.demo_kids_lights"], windows: ["binary_sensor.demo_kids_window"], doors: ["binary_sensor.demo_kids_door_contact"],
      sections: [{ name: "Lights", items: [{ entity: "light.demo_kids_lights", name: "Room lights" }, { entity: "light.demo_kids_night_light", name: "Night light" }] }] },
    { id: "office", name: "Office", icon: "desktop-tower-monitor", temp: "sensor.demo_office_temperature", hum: "sensor.demo_office_humidity", occ: ["binary_sensor.demo_office_presence"],
      climate: "climate.demo_office", lights: ["light.demo_office_lights"], windows: ["binary_sensor.demo_office_window"],
      sections: [{ name: "Lights", items: [{ entity: "light.demo_office_lights", name: "Room lights" }, { entity: "light.demo_desk_lamp", name: "Desk lamp" }] }] },
    { id: "laundry", name: "Laundry", icon: "washing-machine", temp: "sensor.demo_laundry_temperature", occ: ["binary_sensor.demo_laundry_motion"], fans: ["fan.demo_laundry_fan"],
      lights: ["light.demo_laundry_lights"], doors: ["binary_sensor.demo_laundry_door_contact"],
      sections: [{ name: "Lights", items: [{ entity: "light.demo_laundry_lights", name: "Room lights" }] }] },
    { id: "garage", name: "Garage", icon: "garage-variant", temp: "sensor.demo_garage_temperature", hum: "sensor.demo_garage_humidity", occ: ["binary_sensor.demo_garage_presence"],
      counts: { garage: "binary_sensor.demo_garage_door_contact" }, lightSwitches: ["switch.demo_garage_light"], lights: ["switch.demo_garage_light"],
      doors: ["binary_sensor.demo_garage_door_contact"],
      sections: [
        { name: "Garage door", items: [{ entity: "switch.demo_garage_opener", sensor: "binary_sensor.demo_garage_door_contact", name: "Garage door", confirm: true }] },
        { name: "Lights", items: [{ entity: "switch.demo_garage_light", name: "Garage light" }] }
      ] },
    { id: "driveway", name: "Driveway", icon: "car", temp: "sensor.demo_outdoor_temperature", hum: "weather.home#humidity", occ: ["binary_sensor.demo_outdoor_presence"],
      lights: ["light.demo_driveway_lights", "light.demo_entrance_lights"], doors: ["binary_sensor.demo_front_door_contact", "binary_sensor.demo_garage_door_contact"],
      sections: [{ name: "Lights", items: ["light.demo_driveway_lights", "light.demo_entrance_lights"] }] },
    { id: "patio", name: "Patio", icon: "grass", temp: "sensor.demo_outdoor_temperature", hum: "weather.home#humidity", occ: ["binary_sensor.demo_patio_presence"],
      lights: ["light.demo_patio_main", "light.demo_patio_side"], doors: ["binary_sensor.demo_patio_door_contact"],
      sections: [{ name: "Lights", items: ["light.demo_patio_main", "light.demo_patio_side"] }] }
  ],

  // ---- named helper entities the dashboard looks for (any can be left out: that feature then stays hidden) ----
  entities: {
    outdoorTemp: "sensor.demo_outdoor_temperature",
    rainDetected: "binary_sensor.demo_rain_detected",
    airQuality: "sensor.demo_air_quality_index",
    weatherWarnings: "sensor.demo_weather_warnings",
    earthquake: "binary_sensor.demo_earthquake_alert",
    laundryState: "sensor.demo_washer_state", laundryRemaining: "sensor.demo_washer_time_remaining", laundryDelay: "sensor.demo_washer_delay_time",
    mbrCurtains: ["cover.demo_master_curtain_left", "cover.demo_master_curtain_right"],
    doorsGroup: "group.external_doors",
    lowBatteryCount: "sensor.demo_low_battery_count",
    tabletBattery: "sensor.demo_wall_tablet_battery",
    tabletPlugged: "binary_sensor.demo_wall_tablet_plugged_in",
    access: "input_text.dashboard_access"   // helper (Text, max length 255) that stores who can see what: Theme > Access
  },
  volcanoes: [],                         // alert-level sensors, e.g. ["sensor.volcano_name"]
  hazards: { radius: 200, focusKm: 100, minMag: 4 },
  siren: { flag: "input_boolean.demo_siren_toggle", script30: "demo_siren_30_seconds" },
  // Notification pop-up rows: [entity, title, text, optional tag]. tag "driveway" also shows the driveway camera
  // Extra pairings for the countdown on notification tiles: entity -> timer. Taps use their zone's timer, and
  // anything with a timer.<name> or timer.<name>_timer is found on its own, so this is only for the odd ones out.
  tileTimers: { "switch.demo_towel_rail": "timer.demo_towel_rails" },
  alerts: [["binary_sensor.demo_front_door_contact", "Front door", "Open"], ["input_boolean.demo_rubbish_day", "Rubbish day", "Bring the bins out", "driveway"], ["switch.demo_backyard_tap", "Backyard tap", "Water is running"]],
  // Notification pop-up "all on" shortcuts: [label, group entity, icon, optional "close" | 1]
  quickAll: [["Lights", "light.all_lights", "lightbulb-on"], ["Fans", "group.all_fans", "fan"], ["Light switches", "group.all_light_switches", "m3-switch"], ["Water taps", "group.all_water_taps", "m3-water-drop"], ["Curtains", "group.all_curtains", "m3-curtains", "close"], ["Windows", "group.all_windows", "m3-window-open", 1], ["Doors", "group.external_doors", "m3-door-open", 1]],
  adminToggles: [   // [label, counter id, word, [[entity, name], ...]]
    ["Driveway security", "sensor.disabled_driveway_camera_count", "camera", [["automation.demo_driveway_person_notification", "Person"], ["automation.demo_driveway_vehicle_notification", "Vehicle"]]]
  ],
  roomControls: {   // extra tiles at the top of a room's AUTOMATIONS pop-up
    master: [{ entity: "input_boolean.demo_master_auto_climate", name: "Auto climate", icon: "thermometer" }],
    kids:   [{ entity: "input_boolean.demo_kids_auto_climate", name: "Auto climate", icon: "thermometer" }],
    office: [{ entity: "input_boolean.demo_office_auto_climate", name: "Auto climate", icon: "thermometer" }]
  },
  relevance: {   // extra regex added to the engine's "is this entity relevant to this page" filters
    weather: "sensor\\.demo_(weather|air|outdoor)|binary_sensor\\.demo_earthquake",
    irrigation: "demo_(driveway|walkway|backyard)_(tap|timer)",   // the engine already matches names containing water_tap / sprinkler / soil; add yours here if they differ
    notif: "earthquake|rubbish|water_tap|demo_weather|demo_low_battery"
  }
  // ---- optional: fixed restrictions per signed-in person (Theme > Access does the same without editing this file) ----
  // users: { "guest": { pages: ["home", "rooms"], rooms: ["living"], security: { controls: false } } }
};
