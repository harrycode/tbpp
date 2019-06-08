const fs = require("fs");
const motd = fs.readFileSync(__dirname + "/../motd.txt", "utf-8").split("\n");
const he = require("he");
const generate = require("string-to-color");
const isColor = require("is-color");

module.exports = (socket, conn, users, sendSysMsg) => {
  var banh = require("./ban.js")(socket, conn, users, sendSysMsg);

  function updateUsers() {
    var cleanedUsers = {};
    var mods = Object.keys(users).filter(e => users[e].god && !users[e].bot);
    var bots = Object.keys(users).filter(e => users[e].bot);
    var notmods = Object.keys(users).filter(e => !users[e].god && !users[e].bot);
    cleanedUsers["!!!!00_SYSTEM42"] = {nick: "Clyde", color: "#0f0"};
    if (mods.length > 0) {
      cleanedUsers["!!!!01_FILLER"] = {nick: "<b></b>", color: "#000"};
      cleanedUsers["!!!!02_MODTAG"] = {nick: "<i style=\"opacity: 0.7;\">ADMINS - " + mods.length + "</i>", color: "#fff"};
      for (var mod in mods) {
        cleanedUsers["!!!" + mods[mod]] = {nick: users[mods[mod]].nick, color: users[mods[mod]].color};
      }
    }
    if (bots.length > 0) {
      cleanedUsers["!!!00_FILLER"] = {nick: "<b></b>", color: "#000"};
      cleanedUsers["!!!01_USRTAG"] = {nick: "<i style=\"opacity: 0.7;\">BOTS - " + bots.length + "</i>", color: "#fff"};
      for (var bot in bots) {
        var botto = users[bots[bot]];
        cleanedUsers["!!" + bots[bot]] = {
          nick: botto.nick + " <b style='border:1px #ccf solid;border-radius:10px;background-color:#ccf;color:#000;text-overflow:unset;'>BOT</b>",
          color: botto.color
        };
      }
    }
    if (notmods.length > 0) {
      cleanedUsers["!00_FILLER2"] = {nick: "<b></b>", color: "#000"};
      cleanedUsers["!01_USRTAG"] = {nick: "<i style=\"opacity: 0.7;\">ONLINE - " + notmods.length + "</i>", color: "#fff"};
      for (var user in notmods) {
        cleanedUsers[notmods[user]] = {nick: users[notmods[user]].nick, color: users[notmods[user]].color};
      }
    }
    socket.emit("update users", cleanedUsers);
  }

  function cleanUpDeadConnections() {
    socket.clients((err, clients) => {
      for (var user in users) {
        if (!clients.includes(user)) {
          socket.emit("user left", {nick: users[user].nick, color: users[user].color});
          delete users[user];
        }
      }
      updateUsers();
    });
  }

  return {
    cleanUpDeadConnections,
    updateUsers,
    handleConnection: () => {
      if (conn.handshake.headers["x-real-ip"] && config.proxy.trustedonly && !((config.proxy.trusted || []).includes(conn.handshake.address))) {
        usr(conn.id, conn.handshake.address + " tried to connect as " + conn.handshake.headers["x-real-ip"] + ", but isn't trusted.");
        sendSysMsg("This proxy server is not a trusted proxy server. If you are using a proxy, please disable it.");
        return conn.disconnect();
      } else if (conn.handshake.headers["x-real-ip"] && !config.proxy.trustedonly) {
        usr(conn.id, conn.handshake.address + " is connecting as " + conn.handshake.headers["x-real-ip"] + ". (Proxy trust ignored, this may be ban evasion!!!)");
      } else if (conn.handshake.headers["x-real-ip"] && config.proxy.trustedonly) {
        usr(conn.id, conn.handshake.address + " is connecting as " + conn.handshake.headers["x-real-ip"] + ". (Proxy is trusted.)");
      }
      if (banh.checkForBanne(conn.id, conn.handshake.headers["x-real-ip"] || conn.handshake.address)) return;
      usr(conn.id, conn.handshake.address + " connected.");
      conn.emit("_connected");
      motd.forEach(el => {
        sendSysMsg(
          el.replace(/{{{{{GIBEHOSTPLS}}}}}/g,   "ws" + (config.tbpp.https ? "s" : "") + "://" + (conn.handshake.headers.host || "localhost:" + port) + "/")
            .replace(/{{{{{GIBEINJECTPLS}}}}}/g, "http" + (config.tbpp.https ? "s" : "") + "://" + (conn.handshake.headers.host || "localhost:" + port) + "/inject.js")
        );
      });
    },
    handleJoin: (nick, color, style, password) => {
      if (typeof nick != "string") nick = "anonymous";
      nick = (nick == "SYSTEM42" ? "gay retard" : he.encode(nick));
      usr(conn.id, (users[conn.id] ? users[conn.id].nick + " " : "") + "is now " + nick);
      if (users[conn.id]) {
        socket.emit("user change nick", {nick: users[conn.id].nick, color: users[conn.id].color}, {nick: nick, color: isColor(color) ? color : generate(nick)});
      } else {
        socket.emit("user joined", {nick: nick, color: isColor(color) ? color : generate(nick)});
      }
      users[conn.id] = {
        nick: nick,
        color: isColor(color) ? color : generate(nick),
        bot: style == "beepboop",
        ip: conn.handshake.headers["x-real-ip"] || conn.handshake.address,
        god: password == config.tbpp.adminpass
      };
      if (password == config.tbpp.adminpass) {
        usr(conn.id, "DEGREELESSNESS MODE ON");
        sendSysMsg("DEGREELESSNESS MODE ON");
      }
      cleanUpDeadConnections();
    }
  };
};
