const fs = require("fs");
const ini = require("ini");
const colors = require("colors"); // eslint-disable-line no-unused-vars
const config = global.config =  ini.parse(fs.readFileSync(__dirname + "/config.ini", "utf-8"));
const port = global.port = config.tbpp.port;
const version = global.version = "v" + require("./package.json").version;

var usr = global.usr = (user, text) => {
  process.stdout.write("\x1b[2K\r");
  user = user.substring(0, 20);
  console.log(("[" + user.padStart(20) + "]").green + " " + text);
  if (global.rl) rl._refreshLine();
};

var log = global.log = (text) => {
  usr("     = SERVER =     ", text);
};

var stop = global.stop = () => {
  process.stdout.write("\r");
  log("Stopping server...");
  socket.emit("message", {
    date: Date.now(),
    nick: "SYSTEM42",
    color: "#0f0",
    style: "",
    msg: "The server is stopping!"
  });
  socket.close();
  log("Stopped server.");
  process.stdout.write("\x1b[2K\r");
  process.exit(0);
};

log(`Starting tbpp ${version}...`);
const app = require("./http.js");
const socket = require("./socket.js")(app);

process.on("uncaughtException", (err) => {
  log("==== FATAL ERROR! ====");
  log("tbpp has encountered a fatal error and must shut down.");
  log("Here are some error details:");
  err.stack.split("\n").forEach((e) => fs.writeSync(1, e));
  log("Exiting...");
  process.exit(1);
});

process.on("SIGINT", () => {
  stop();
});

if (config.webclient.enabled) {
  var webport = config.webclient.port == "same" || !config.webclient.enabled ? config.tbpp.port : config.webclient.port;

  app.listen(webport, () => {
    log(`Listening on port ${port} (${config.webclient.usehttps ? "https" : "http"}://localhost:${webport}/)`);
  });
} else {
  log(`Listening on port ${port} (webclient is disabled)`);
}
