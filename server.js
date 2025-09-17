const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname + "/public"));

const allowedNumbers = ["13058962443", "18573917861"];
const users = {}; // socketId -> number
let messages = []; // store messages

io.on("connection", (socket) => {
  console.log("New socket:", socket.id);

  // Join
  socket.on("join", (number) => {
    if (!allowedNumbers.includes(number)) {
      socket.emit("joined", { success: false });
      return;
    }
    users[socket.id] = number;
    socket.emit("joined", { success: true, number });
    console.log(number, "joined");

    // Load history for this number
    const relevant = messages.filter(
      (m) => m.from === number || m.to === number
    );
    socket.emit("loadMessages", relevant);
  });

  // Message
  socket.on("message", (msg) => {
    const from = users[socket.id];
    if (!from) return;
    if (!allowedNumbers.includes(msg.to)) return;

    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);

    // send to recipient
    for (const [id, num] of Object.entries(users)) {
      if (num === msg.to) {
        io.to(id).emit("message", msg);
      }
    }
    // send back to sender too
    socket.emit("message", msg);
  });

  // Voice
  socket.on("voice", (msg) => {
    const from = users[socket.id];
    if (!from) return;
    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);

    for (const [id, num] of Object.entries(users)) {
      if (num === msg.to) {
        io.to(id).emit("voice", msg);
      }
    }
    socket.emit("voice", msg);
  });

  // Call simulation
  socket.on("call", (to) => {
    const from = users[socket.id];
    if (!from) return;
    for (const [id, num] of Object.entries(users)) {
      if (num === to) {
        io.to(id).emit("incomingCall", { from });
      }
    }
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
  });
});

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
