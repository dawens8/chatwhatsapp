// server.js (direct routing by phone number)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static('public'));

// map phone -> socket.id
const clients = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('join', (number) => {
    socket.number = number;
    clients.set(number, socket.id);
    console.log('Joined', number, '->', socket.id);
  });

  socket.on('message', (msg) => {
    // Expect msg = {from, to, text, type, data, time}
    const to = msg.to;
    const from = socket.number || msg.from;
    console.log(`Message from ${from} to ${to}:`, msg.text||'[image]');

    // send to recipient only if we know them; also echo to sender for confirmation
    const recipientSocketId = clients.get(to);
    const payload = { from, to, text: msg.text, type: msg.type, data: msg.data, time: new Date().toLocaleTimeString() };

    // send to recipient
    if(recipientSocketId){
      io.to(recipientSocketId).emit('message', payload);
    } else {
      // optional: store undelivered or broadcast (here we choose to still broadcast so dev can test)
      socket.broadcast.emit('message', payload);
    }

    // echo to sender (so sender sees message status locally)
    socket.emit('message', payload);
  });

  socket.on('disconnect', () => {
    console.log('Disconnect', socket.number, socket.id);
    if(socket.number) clients.delete(socket.number);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, ()=> console.log('Server running on', PORT));
