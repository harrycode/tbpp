const moment = require("moment");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("bans.json");
const db = low(adapter);

module.exports = (socket, conn) => {
  function banKick(id, baninfo) {
    function msg(text) {
      socket.to(id).emit("message", {
        date: Date.now(),
        nick: "SYSTEM42",
        color: "#0f0",
        style: "",
        msg: text
      });
    }
    usr(conn.id, conn.handshake.address + " is banned, kicking...");
    msg("You have been banned!");
    msg("bruh moment");
    msg("");
    msg("Reason: " + baninfo.reason);
    msg("");
    if (baninfo.expires) {
      msg("This ban will expire on " + moment(baninfo.expires).format("MMMM Do YYYY, hh:mm:ss a"));
    } else {
      msg("This ban is permament.");
    }
    socket.sockets.connected[id].disconnect(true);
  }

  function getBan(ip) {
    return db.get("bans")
      .find({ip: ip})
      .value();
  }

  function listBans() {
    return db.get("bans")
      .value();
  }

  function ban(id, ip, reason, expires) {
    if (getBan(ip)) return false;
    db.get("bans")
      .push({ip: ip, reason: reason, expires: expires ? Date.now() + (expires * 1000) : false})
      .write();
    checkForBanne(id, ip);
  }

  function unban(ip) {
    if (!getBan(ip)) return false;
    db.get("bans")
      .remove({ip: ip})
      .write();
    return true;
  }

  function checkForBanne(id, ip) {
    var isbanne = db.get("bans")
      .find({ip: ip})
      .value();
    if (isbanne) {
      if (isbanne.expires && Date.now() > isbanne.expires) {

        return false;
      }
      banKick(id, isbanne);
      return true;
    }
    return false;
  }

  db.defaults({bans: []}).write();

  return {
    banKick: banKick,
    getBan: getBan,
    listBans: listBans,
    ban: ban,
    unban: unban,
    checkForBanne: checkForBanne,
  };
};
