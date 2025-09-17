const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const allowedNumbers = ['13058962443', '18573917861'];
const users = {}; // socketId: number
let messages = []; // {from,to,text,time}

// Serve static files
app.use(express.static(__dirname + '/public'));

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  // User joins with number
  socket.on('join', number => {
    if(!allowedNumbers.includes(number)) return;
    users[socket.id] = number;

    // Send past messages relevant to this user
    const relevant = messages.filter(m => m.from===number || m.to===number);
    socket.emit('loadMessages', relevant);
  });

  // Receive message
  socket.on('message', msg => {
    const from = users[socket.id];
    if(!from) return;
    if(!allowedNumbers.includes(msg.to)) return;

    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);

    // send to recipient
    for(const [id, num] of Object.entries(users)){
      if(num === msg.to){
        io.to(id).emit('message', msg);
      }
    }
    // send back to sender
    socket.emit('message', msg);
  });

  // Call events
  socket.on('call', () => {
    const from = users[socket.id];
    const to = allowedNumbers.find(n => n !== from);
    for(const [id, num] of Object.entries(users)){
      if(num === to){
        io.to(id).emit('incomingCall', {from});
      }
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
  });
});

server.listen(PORT, ()=>console.log('Server running on port', PORT));
