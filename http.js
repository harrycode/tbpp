const fs = require("fs");
const motd = fs.readFileSync(__dirname + "/motd.txt", "utf-8");

function handler(req, res) {
  res.writeHead(400);
  res.send("<h1>You are connecting to a Trollbox++ server over HTTP(S)!</h1>Here is this server's MOTD:\n<pre>" +
    motd.replace(/{{{{{GIBEHOSTPLS}}}}}/g,   "ws" + (config.webclient.usehttps ? "s" : "") + "://" + (conn.handshake.headers.host || "localhost:" + port) + "/") +
    "\n</pre>");
}

if (config.tbpp.usehttps) {
  module.exports = https.createServer({
    key: fs.readFileSync(config.https.private_key, "utf8"),
    cert: fs.readFileSync(config.https.certificate, "utf8")
  }, handler);
} else {
  module.exports = http.createServer(handler);
}
dasfdsdfs
