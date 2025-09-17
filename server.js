const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files (HTML + assets)
app.use(express.static(__dirname + '/public'));

const allowedNumbers = ['13058962443', '18573917861'];
const users = {}; // {socketId: number}
let messages = [];

// Socket.io
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', (number) => {
    if (!allowedNumbers.includes(number)) {
      socket.emit('joined', { success: false });
      return;
    }
    users[socket.id] = number;
    socket.emit('joined', { success: true, number });
    console.log(number, 'joined');

    // Send chat history
    const relevant = messages.filter(
      (m) => m.from === number || m.to === number
    );
    socket.emit('loadMessages', relevant);
  });

  socket.on('message', (msg) => {
    const from = users[socket.id];
    if (!from) return;
    if (!allowedNumbers.includes(msg.to)) return;

    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);

    // Send to recipient
    for (const [id, num] of Object.entries(users)) {
      if (num === msg.to) {
        io.to(id).emit('message', msg);
      }
    }

    // Send back to sender
    socket.emit('message', msg);
  });

  // Voice message
  socket.on('voice', (msg) => {
    const from = users[socket.id];
    if (!from) return;
    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    for (const [id, num] of Object.entries(users)) {
      if (num === msg.to) {
        io.to(id).emit('voice', msg);
      }
    }
    socket.emit('voice', msg);
  });

  // Call simulation
  socket.on('call', (data) => {
    const from = users[socket.id];
    if (!from) return;
    for (const [id, num] of Object.entries(users)) {
      if (num === data.to) {
        io.to(id).emit('incomingCall', { from });
      }
    }
  });

  socket.on('answerCall', (data) => {
    const from = users[socket.id];
    for (const [id, num] of Object.entries(users)) {
      if (num === data.to) {
        io.to(id).emit('callAnswered', { from });
      }
    }
  });

  socket.on('declineCall', (data) => {
    const from = users[socket.id];
    for (const [id, num] of Object.entries(users)) {
      if (num === data.to) {
        io.to(id).emit('callDeclined', { from });
      }
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
