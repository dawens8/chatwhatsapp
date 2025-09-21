const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

let users = {};       // { number: socket.id }
let reports = {};     // { number: count }
let blocked = {};     // { blocker: [blockedNumbers] }

// --- SOCKET.IO HANDLERS ---
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Join user
  socket.on("join", (number) => {
    users[number] = socket.id;
    socket.number = number;
    console.log(`${number} joined.`);
  });

  // Send text
  socket.on("message", (msg) => {
    if (blocked[msg.to]?.includes(socket.number)) {
      console.log("Message blocked by recipient.");
      return;
    }
    const target = users[msg.to];
    if (target) {
      io.to(target).emit("message", {
        from: socket.number,
        text: msg.text,
        time: new Date().toLocaleTimeString(),
      });
    }
  });

  // Send voice
  socket.on("voice", (msg) => {
    const target = users[msg.to];
    if (target) {
      io.to(target).emit("voice", {
        from: socket.number,
        audio: msg.audio,
      });
    }
  });

  // Call events
  socket.on("call", (data) => {
    const target = users[data.to];
    if (target) {
      io.to(target).emit("incomingCall", { from: socket.number });
    }
  });

  socket.on("answerCall", (data) => {
    const target = users[data.to];
    if (target) io.to(target).emit("callAnswered", { from: socket.number });
  });

  socket.on("declineCall", (data) => {
    const target = users[data.to];
    if (target) io.to(target).emit("callDeclined", { from: socket.number });
  });

  // Block / Unblock
  socket.on("block", (num) => {
    if (!blocked[socket.number]) blocked[socket.number] = [];
    if (!blocked[socket.number].includes(num)) {
      blocked[socket.number].push(num);
    }
    socket.emit("blockedList", blocked[socket.number]);
  });

  socket.on("unblock", (num) => {
    if (blocked[socket.number]) {
      blocked[socket.number] = blocked[socket.number].filter((n) => n !== num);
    }
    socket.emit("blockedList", blocked[socket.number]);
  });

  // Report system
  socket.on("report", (num) => {
    if (!reports[num]) reports[num] = 0;
    reports[num]++;

    if (reports[num] >= 7) {
      const target = users[num];
      if (target) {
        io.to(target).emit("banned", {
          reason: "Too many reports",
          duration: "24h",
        });
        io.sockets.sockets.get(target)?.disconnect();
      }
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`${socket.number} disconnected`);
    delete users[socket.number];
  });
});

// Render use process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
