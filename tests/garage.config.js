// Invented data only.
window.DASH_CONFIG = {
  url: location.origin,
  token: "",
  rooms: [{ id: "living", name: "Living", main: true }],
  cameras: [{ id: "camera.garage_test", name: "Garage" }, { id: "camera.front_test", name: "Front" }],
  security: [{ id: "camera.garage_test", name: "Garage" }],
  camControls: { "camera.garage_test": [{ entity: "switch.garage_opener_test", sensor: "binary_sensor.garage_contact_test", name: "Garage door", confirm: true }, { entity: "switch.garage_light_test", name: "Garage light" }] },
  view: { driveway: { id: "camera.front_test", name: "Driveway", trig: [] }, garage: { id: "camera.garage_test", name: "Garage", trig: [] } },
  garageAlert: { "camera.garage_test": { sensor: "binary_sensor.garage_contact_test", opener: "switch.garage_opener_test", travel: 15 } },
};
