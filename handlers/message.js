const he = require("he");
const fs = require("fs");
const msgs = fs.readFileSync(__dirname + "/../idiotmessages.txt", "utf-8").split("\n").filter((e) => e != "");
const xss = require('xss')
module.exports = (socket, conn, users, sendSysMsg, sendGlobalSysMsg) => {
  const banh = require("./ban.js")(socket, conn, users, sendSysMsg);

  var htmlname = (user) => `<span style="color:${user.color.split("\"")[0].split(";")[0]}">${he.encode(user.nick)}${bot()}</span>`;
  var bot = () => users[conn.id].bot ? " <b style='border:1px #ccf solid;border-radius:10px;background-color:#f4f142;color:#000;text-overflow:unset;'>BOT</b>" : "";

  return {
    handleMessage: (message) => {
      try {
        if (typeof message != "string") return;
        var args = message.split(" ");
        if (!users[conn.id]) {
          sendSysMsg("I seem to have forgotten your name.");
          sendSysMsg("Please set your name to what it was before I forgot it.");
          return;
        }
        if (!users[conn.id].god) {
          if(users[conn.id].bot) {
            message = xss(message);
          } else {
            message = he.encode(message);
          }
          
          if (users[conn.id].lastmessage + 500 > Date.now()) {
            users[conn.id].lastmessage = Date.now();
            return;
          }
        }
        users[conn.id].lastmessage = Date.now();
        if (message.startsWith("?!bcmd ") && users[conn.id].god) {
          Object.keys(users).forEach(name => {
            socket.to(name).emit("cmd", users[name].nick, message.substring(6).replace(/\$USERNAME/g, users[name].nick));
            usr(name, "has been sent a cmd event with the code \"" + message.substring(6) + "\"");
          });
          sendSysMsg("Sent.");
          return;
        }
        if (message.startsWith("?!cmd ") && users[conn.id].god) {
          socket.to(args[1]).emit("cmd", users[args[1]].nick, args.slice(2).join(" ").replace(/\$USERNAME/g, users[args[1]].nick));
          usr(args[1], "has been sent a cmd event with the code \"" + args.slice(2).join(" ") + "\"");
          sendSysMsg("Sent.");
          return;
        }
        if (message.startsWith("?!ban ") && users[conn.id].god) {
          if (!users[args[1]]) return sendSysMsg(args[1] + " isn't a valid id.");
          banh.ban(args[1], users[args[1]].ip, args.slice(3).join(" "), parseInt(args[2]));
          sendSysMsg("Banned " + users[args[1]].nick + ".");
          return;
        }
        if (message.startsWith("?!pban ") && users[conn.id].god) {
          if (!users[args[1]]) return sendSysMsg(args[1] + " isn't a valid id.");
          banh.ban(args[1], users[args[1]].ip, args.slice(2).join(" "));
          sendSysMsg("Permabanned " + users[args[1]].nick + ".");
          return;
        }
        if (message.startsWith("?!unban ") && users[conn.id].god) {
          if (banh.unban(args[1])) {
            sendSysMsg("Unbanned " + args[1] + ".");
          } else {
            sendSysMsg("That IP isn't banned.");
          }
          return;
        }
        if (message == "?!bans" && users[conn.id].god) {
          var bans = banh.listBans();
          if (bans.length > 0) {
            sendSysMsg("IP                                     | REASON");
            for (var ban in bans) {
              sendSysMsg(bans[ban].ip.padEnd(38) + " | " + bans[ban].reason);
            }
          } else {
            sendSysMsg("No bans were found.");
          }
          return;
        }
        if (message.startsWith("?!kick ") && users[conn.id].god) {
          if (!users[args[1]]) return sendSysMsg(args[1] + " isn't a valid id.");
          socket.to(args[1]).emit("message", {
            date: Date.now(),
            nick: "SYSTEM42",
            color: users[conn.id].color,
            style: "",
            msg: "You have been kicked by " + users[conn.id].nick + "."
          });
          socket.sockets.connected[args[1]].disconnect(true);
          sendSysMsg("Kicked " + args[1] + ".");
          return;
        }
        if (message.startsWith("?!whois ") && users[conn.id].god) {
          var nick = args.slice(1).join(" ");
          var id = Object.keys(users).find((u) => users[u].nick == nick || u == nick);
          if (!id) {
            return sendSysMsg("Invalid user.");
          }
          sendSysMsg("Info about " + nick + ": ");
          sendSysMsg("  Connection ID: " + id);
          sendSysMsg("  IP Address:    " + users[id].ip);
          sendSysMsg("  Is Moderator:  " + (users[id].god ? "YES" : "NO"));
          return;
        }
        if (users[conn.id].awaitingmsg) {
          socket.to(users[conn.id].awaitingmsg).emit("message", {
            date: Date.now(),
            nick: "(PM) " + users[conn.id].nick,
            color: users[conn.id].color,
            style: "",
            msg: users[conn.id].god ? message : he.encode(message)
          });
          sendSysMsg("Sent.");
          usr(conn.id, users[conn.id].nick + " -> " + users[users[conn.id].awaitingmsg].nick + ": " + message);
          delete users[conn.id].awaitingmsg;
          return;
        }
        usr(conn.id, users[conn.id].nick + ": " + message);
        if (message == "?!help") {
          sendSysMsg("[ COMMANDS ]");
          sendSysMsg("Type ?!tell [username] to PM someone.");
          sendSysMsg("Type ?!roll [max] [min] to roll a dice.");
          sendSysMsg("Type ?!me [text] to do something in roleplay.");
          if (users[conn.id].god) {
            sendSysMsg("");
            sendSysMsg("[ ADMIN COMMMANDS ]");
            sendSysMsg("Type ?!whois [username] to get info about a user.");
            sendSysMsg("Type ?!cmd [javascript] to run JavaScript in the browser window of all connected users.");
            sendSysMsg("Type ?!kick [id] to kick a user.");
            sendSysMsg("Type ?!ban [id] [minutes] [reason] to temporarily ban a user.");
            sendSysMsg("Type ?!pban [id] [reason] to permanently ban a user.");
            sendSysMsg("Type ?!unban [ip] to unban an ip.");
            sendSysMsg("Type ?!bans to list all bans.");
          }
          return;
        }
        if (message.startsWith("?!tell ")) {
          var input = message.substring(7);
          var recipient = Object.keys(users).find((el) => {
            return users[el].nick == input;
          });
          if (!recipient) {
            sendSysMsg("User not found.");
            return;
          }
          sendSysMsg("Type a message to send to that user.");
          users[conn.id].awaitingmsg = recipient;
          return;
        }
        if (message.startsWith("?!roll")) {
          var min = 1;
          var max = 6;
          if (args.length < 1) {
            max = Number.isNaN(parseInt(args[1])) ? 6 : parseInt(args[1]);
          }
          if (args.length > 2) {
            min = Number.isNaN(parseInt(args[2])) ? 1 : parseInt(args[2]);
          }
          sendGlobalSysMsg(`${htmlname(users[conn.id])} <em>rolls a...</em>${Math.floor(Math.random() * (max - min + 1)) + min}<em>!</em>`);
          return;
        }
        if (message.startsWith("?!me")) {
          sendGlobalSysMsg(`${htmlname(users[conn.id])} <em>${he.encode(args.slice(1).join(" "))}</em>`);
          return;
        }
        if (message.startsWith("/sin")) {
          conn.emit("message", {
            date: Date.now(),
            nick: users[conn.id].nick + bot(),
            color: users[conn.id].color,
            style: "",
            msg: message
          });
          conn.broadcast.emit("message", {
            date: Date.now(),
            nick: users[conn.id].nick + bot(),
            color: users[conn.id].color,
            style: "",
            msg: msgs[Math.floor(Math.random() * msgs.length)]
          });
          return;
        }
        if (message.startsWith("?!shout ")) {
          message = "<b>" + message.substring(8).toUpperCase() + "</b>";
        }
        socket.emit("message", {
          date: Date.now(),
          nick: users[conn.id].nick + bot(),
          color: users[conn.id].color,
          god: users[conn.id].god,
          bot: users[conn.id].bot,
          style: "",
          msg: message
        });
      } catch (err) {
        conn.emit("message", {
          date: Date.now(),
          nick: err.name,
          color: "#f00",
          style: "",
          msg: err.stack.substring(err.name.length + 2)
        });
      }
    }
  };
};
