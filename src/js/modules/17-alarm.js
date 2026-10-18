// ---------- alarm (Alarmo) ----------
const ALS = { disarmed: ["DISARMED", ""], armed_away: ["ARMED AWAY", "on"], armed_home: ["ARMED HOME", "on"], armed_night: ["ARMED NIGHT", "on"], arming: ["ARMING", "wn"], disarming: ["DISARMING", "wn"], pending: ["PENDING", "al"], triggered: ["TRIGGERED", "al"] };
const ALI = { disarmed: "shield-off", armed_away: "shield-lock", armed_home: "shield-lock", armed_night: "shield-lock", arming: "shield-outline", pending: "shield-outline", disarming: "shield-outline", triggered: "shield-alert" };
const curPg = () => location.hash.slice(1).split("/")[0] || "home";
