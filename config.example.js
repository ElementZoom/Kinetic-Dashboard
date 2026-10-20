// Kinetic Dashboard real-HA example for Hichiro6. Tokens are intentionally blank/placeholders.
// Copy to the deployed dashboard as config.js and set token privately if required.
window.DASH_CONFIG = {
  url: location.origin, token: "PASTE_TOKEN_HERE",
  brand: { name: "HOME", tag: "SMART HOME", intro: true, introAfter: 30, introMs: 3000 },
  name: "Jordan", noNameUsers: [],
  tariff: { symbol: "€", daily: 0, periods: [{ from: 0, to: 24, rate: 0.30, name: "Flat rate (VERIFY)" }] },
  hapticMs: 35, haptics: true, mobileLive: true,
  layout: { tablet: ["status", "cams", "rooms", "forecast"], mobile: ["status", "nowplaying", "forecast"] },
  settingsPath: "/config/dashboard", weatherFx: { speed: 0.5 }, mobileNav: "drawer", tileStyle: "line",
  outside: "", weather: "", calendars: [], calNames: {}, cameras: [{id:"camera.entrance_camera",name:"Entrance"},{id:"camera.living_room_camera",name:"Living"},{id:"camera.garage_camera",name:"Garage"}],
  security: [{id:"camera.entrance_camera",name:"Entrance"},{id:"camera.living_room_camera",name:"Living"},{id:"camera.garage_camera",name:"Garage"}],
  camControls: { "camera.entrance_camera":[{entity:"lock.front_door_lock",name:"Front door",confirm:true},{entity:"light.wall_lights_entryway_z2m_group",name:"Entrance lights"}], "camera.living_room_camera":[{entity:"light.ceiling_living_room_lights_z2m_group",name:"Living lights"},{entity:"light.dining_table_lights_z2m_group",name:"Dining lights"}], "camera.garage_camera":[{entity:"cover.garage_door_garage_door",name:"Garage door",confirm:true},{entity:"light.garage_door_garage_door_light",name:"Garage light"}] },
  garageAlert: { "camera.garage_camera": { sensor:"cover.garage_door_garage_door", travel:15 } },
  view: { garage:{id:"camera.garage_camera",name:"Garage",trig:[]}, detHold:0, hold:20, returnAfter:0, popup:false },
  alarm: "alarm_control_panel.alarmo", alarmTiles:[{entity:"siren.nighthall_heat_alarm",script:"alarmo_sound_alarm",siren:"toggle",name:"Siren",icon:"alarm-light"}], siren:{flag:"siren.nighthall_heat_alarm"},
  rooms: [{id:"climate.master_radiator_thermostat_z2m",name:"Master room",icon:"bed-king"},{id:"climate.adeline_radiator_thermostat_z2m",name:"Adeline room",icon:"bee"},{id:"climate.noemie_radiator_thermostat",name:"Noemie room",icon:"teddy-bear"},{id:"climate.friend_radiator_thermostat",name:"Guest room",icon:"bed-empty"}], indoor:"",
  tiles: [{name:"Living",icon:"sofa",room:"living",temp:"sensor.thermostat_living_room_temperature",hum:"sensor.thermostat_living_room_humidity"},{name:"Master",icon:"bed-king",room:"master",climate:"climate.master_radiator_thermostat_z2m",temp:"sensor.master_bedroom_combined_temperature",hum:"sensor.thermostat_master_humidity"},{name:"Adeline",icon:"bee",room:"adeline",climate:"climate.adeline_radiator_thermostat_z2m",temp:"sensor.adeline_bedroom_combined_temperature",hum:"sensor.thermostat_adeline_humidity"},{name:"Noemie",icon:"teddy-bear",room:"noemie",climate:"climate.noemie_radiator_thermostat",temp:"sensor.noemie_bedroom_combined_temperature",hum:"sensor.thermostat_noemie_humidity"},{name:"Office",icon:"desk",room:"office",temp:"sensor.study_combined_temperature",hum:"sensor.thermostat_study_humidity"},{name:"Garage",icon:"garage-variant",room:"garage",temp:"sensor.garage_combined_temperature",hum:"sensor.thermostat_garage_humidity"}],
  roomsByPresence:false, roomTabs:[["Main",["living","master","adeline","noemie","office"]],["Others",["garage"]]],
  house: [], entities:{outdoorTemp:"sensor.home_current_temperature",doorsGroup:"",tabletBattery:"",tabletPlugged:""},
  volcanoes:[], hazards:{radius:200,focusKm:100,minMag:4}, alerts:[], leakSensors:[], quickAll:[["Lights","light.home_all_lights","lightbulb-on"]],
  icons:{}, detections:{}, derived:{soil:{}}, houseAvg:{}, batteryDisplay:{}, mediaArt:{}, lyricsFrom:[], media:[{id:"media_player.spotify",name:"Spotify"}], playback:{}, scenes:[], irrigation:[], vehicle:{}, notifTimers:{}, tileTimers:{}, tileFx:{}, countIfNotOff:[], activeAppliances:[], adminToggles:[], roomControls:{}, users:{}, relevance:{}, pages:["home","rooms","climate","security","weather","energy","irrigation","media","events","vehicle","hazards","theme"], rainSkipMm:2
};
