const io = require("socket.io");
const http = require("http");
const https = require("https");
const readline = require("readline");
const fs = require("fs");
var users = [];
var nopehandler = (req, res) => {
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("no");
};

module.exports = (app) => {
  var socket;

  if (config.webclient.port == "same" && config.webclient.enabled) {
    socket = io(app);
  } else {
    var noapp;
    if (config.webclient.usehttps) {
      const credentials = {
        key: fs.readFileSync(config.https.private_key, "utf8"),
        cert: fs.readFileSync(config.https.certificate, "utf8")
      };
      noapp = https.createServer(credentials, nopehandler);
    } else {
      noapp = http.createServer(nopehandler);
    }
    noapp.listen(port);
    socket = io(noapp);
  }

  function sendGlobalSysMsg(text) {
    socket.emit("message", {
      date: Date.now(),
      nick: "SYSTEM42",
      color: "#0f0",
      style: "",
      msg: text
    });
  }

  function sendSysMsgTo(id, text) {
    socket.to(id).emit("message", {
      date: Date.now(),
      nick: "SYSTEM42",
      color: "#0f0",
      style: "",
      msg: text
    });
  }

  socket.on("connection", (conn) => {
    function sendSysMsg(text) {
      conn.emit("message", {
        date: Date.now(),
        nick: "SYSTEM42",
        color: "#0f0",
        style: "",
        msg: text
      });
    }

    function loadHandler(name) {
      return require("./handlers/" + name + ".js")(socket, conn, users, sendSysMsg, sendGlobalSysMsg);
    }

    var usrh = loadHandler("user");
    var msgh = loadHandler("message");

    usrh.cleanUpDeadConnections();
    usrh.handleConnection();

    conn.on("message", (message) => {
      msgh.handleMessage(message);
    });

    conn.on("user joined", (nick, color, style, password) => {
      usrh.handleJoin(nick, color, style, password);
    });

    conn.on("disconnect", () => {
      usr(conn.id, "disconnected.");
      usrh.cleanUpDeadConnections();
    });

    conn.on("error", (err) => {
      conn.emit("message", {
        date: Date.now(),
        nick: err.name,
        color: "#f00",
        style: "",
        msg: err.stack.substring(err.name.length + 2)
      });
    });
  });

  var rl = global.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "tbpp$ ",
    completer: (line) => {
      if (line.split(" ").length < 2) {
        var cmds = "help users whois kick ban pban unban bans announce notify stop".split(" ");
        var results = cmds.filter(c => c.startsWith(line));

        return [results.length ? results : cmds, line];
      } else {
        var result = [];
        var argv = line.split(" ");
        switch (argv[0]) {
        case "whois":
          result = Object.keys(users).filter(c => c.startsWith(argv[1]));
          break;
        case "kick":
          result = Object.keys(users).filter(c => c.startsWith(argv[1]));
          break;
        case "notify":
          result = Object.keys(users).filter(c => c.startsWith(argv[1]));
          break;
        case "ban":
          if (argv.length == 2) result = Object.keys(users).filter(c => c.startsWith(argv[1]));
          break;
        case "pban":
          if (argv.length == 2) result = Object.keys(users).filter(c => c.startsWith(argv[1]));
          break;
        case "unban":
          require("./handlers/ban.js")(socket, {}).listBans().forEach(ban => {
            if (ban.ip.startsWith(argv[1])) {
              result.push(ban.ip);
            }
          });
          break;
        }
        return [result, argv[1]];
      }
    }
  });

  rl.on("line", (line) => {
    var argv = line.trim().split(" ");
    var banh;

    switch (argv[0]) {
    case "help":
      console.log("users                          List connected users.");
      console.log("whois [id]                     Get information about a user.");
      console.log("kick [id]                      Kick a user.");
      console.log("ban [id] [minutes] [reason]    Ban a user.");
      console.log("pban [id] [reason]             Permamently ban a user.");
      console.log("pban [ip]                      Unban an IP.");
      console.log("bans                           List bans.");
      console.log("announce                       Send an announcement.");
      console.log("notify [id]                    Send a message to a user.");
      console.log("stop                           Stop the server.");
      break;
    case "users":
      for (var user in users) {
        console.log(user + ": " + users[user].nick);
      }
      break;
    case "whois":
      var id = argv[1];
      if (!users[id]) {
        console.log("Invalid user.");
        break;
      }
      console.log("Info about " + users[id].nick + ": ");
      console.log("  Connection ID: " + id);
      console.log("  IP Address:    " + users[id].ip);
      console.log("  Is Moderator:  " + (users[id].god ? "YES" : "NO"));
      break;
    case "kick":
      if (users[argv[1]]) {
        sendSysMsgTo(argv[1], "You have been kicked by CONSOLE.");
        socket.sockets.connected[argv[1]].disconnect(true);
        console.log("Kicked " + argv[1] + ".");
      } else {
        console.log(argv[1] + " isn't a valid id.");
      }
      break;
    case "ban":
      if (!users[argv[1]]) {
        console.log(argv[1] + " isn't a valid id.");
        break;
      }
      banh = require("./handlers/ban.js")(socket, socket.sockets.connected[argv[1]]);
      banh.ban(argv[1], users[argv[1]].ip, argv.slice(3).join(" "), parseInt(argv[2]));
      console.log("Banned " + users[argv[1]].nick + ".");
      break;
    case "pban":
      if (!users[argv[1]]) {
        console.log(argv[1] + " isn't a valid id.");
        break;
      }
      banh = require("./handlers/ban.js")(socket, socket.sockets.connected[argv[1]]);
      banh.ban(argv[1], users[argv[1]].ip, argv.slice(2).join(" "));
      console.log("Permabanned " + users[argv[1]].nick + ".");
      break;
    case "unban":
      banh = require("./handlers/ban.js")(socket, socket.sockets.connected[argv[1]]);
      if (banh.unban(argv[1])) {
        console.log("Unbanned " + argv[1] + ".");
      } else {
        console.log("That IP isn't banned.");
      }
      break;
    case "bans":
      banh = require("./handlers/ban.js")(socket, socket.sockets.connected[argv[1]]);
      var bans = banh.listBans();
      if (bans.length > 0) {
        console.log("IP                                     | REASON");
        for (var ban in bans) {
          console.log(bans[ban].ip.padEnd(38) + " | " + bans[ban].reason);
        }
      } else {
        console.log("No bans were found.");
      }
      break;
    case "announce":
      sendGlobalSysMsg("ANNOUNCEMENT: " + line.substring(9));
      break;
    case "notify":
      if (users[argv[1]]) {
        rl.question("What message should be sent? ", (msg) => {
          sendSysMsgTo(argv[1], msg);
          rl.prompt();
        });
        return;
      } else {
        console.log("User not found.");
        break;
      }
    case "stop":
      stop();
      break;
    default:
      if (argv[0] != "") console.log(argv[0] + ": invalid command");
    }
    rl.prompt();
  }).on("close", () => stop());

  rl.prompt();

  return socket;
};
