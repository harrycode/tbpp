const https = require("https");
const http = require("http");
const fs = require("fs");
const mime = require("mime-types");

const handler = async (req, res) => {
  usr("S <" + (req.headers["x-real-ip"] || req.socket.localAddress).padStart(17), req.method + " " + req.url + (req.httpVersion == "0.9" ? "" : " HTTP/" + req.httpVersion));
  function printEnd() {
    usr("S >" + (req.headers["x-real-ip"] || req.socket.localAddress).padStart(17), "HTTP/" + req.httpVersion + " " + res.statusCode + " " + res.statusMessage);
  }
  if (req.url.startsWith("/../")) {
    res.writeHead(403, "Nope");
    res.end("Nice try, retard.\n");
    printEnd();
  } else if (req.url == "/inject.js") {
    res.writeHead(200, {"Content-Type": "application/javascript"});
    res.end(`/*
 * tbpp ${version} loader
 * written by 1024x2
 *
 * how to use:
 * 1. go to http://windows93.net/trollbox/
 * 2. open up devtools and go to the console
 * 3. paste this into the console
 * 4. hit enter
 */
socket.close();eval(document.getElementById("trollbox").children[5].innerHTML.replace("var socket = io('//www.windows93.net:8081');", "var socket = io('ws://${req.headers.host || "localhost:" + port}');"));`);
    printEnd();
  } else {
    var filename = __dirname + "/static" + (req.url == "/" ? "/index.html" : req.url);
    fs.readFile(filename, (err, data) => {
      if (err) {
        if (err.code == "ENOENT") {
          res.writeHead(404);
          res.end("not found lol");
        } else {
          res.writeHead(500);
          res.end("that wasn't supposed to happen\n\n" + err.stack);
        }
        return printEnd();
      }
      if (req.url == "/") {
        if (config.webclient.usehttps) {
          data = data.toString("utf-8")
            .replace(/{{{{{{PUTHOSTHEREPLSSSSS}}}}}}/, "wss://:" + port + "/");
        } else {
          data = data.toString("utf-8")
            .replace(/{{{{{{PUTHOSTHEREPLSSSSS}}}}}}/, "ws://:" + port + "/");
        }

      }
      var type = mime.contentType((req.url == "/" ? "/index.html" : req.url).slice(1)) || "application/octet-stream";
      res.writeHead(200, {"Content-Type": type});
      res.end(data);
      printEnd();
    });
  }
};

var app = {};

if (config.webclient.enabled) {
  if (config.webclient.usehttps) {
    const credentials = {
      key: fs.readFileSync(config.https.private_key, "utf8"),
      cert: fs.readFileSync(config.https.certificate, "utf8")
    };
    app = https.createServer(credentials, handler);
  } else {
    app = http.createServer(handler);
  }
}

module.exports = app;
