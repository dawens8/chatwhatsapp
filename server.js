const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files (HTML)
app.use(express.static(__dirname + '/public'));

// Store connected users and messages
const users = {}; // {socketId: number}
const allowedNumbers = ['13058962443', '18573917861'];
let messages = []; // {from, to, text, time}

// Socket.io
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Join with number
  socket.on('join', (number) => {
    if (!allowedNumbers.includes(number)) return;
    users[socket.id] = number;
    socket.emit('joined', {success:true, number});
    console.log(number, 'joined');
    // Send existing messages relevant to this user
    const myNumber = number;
    const relevant = messages.filter(m=> m.from===myNumber || m.to===myNumber);
    socket.emit('loadMessages', relevant);
  });

  // Receive message
  socket.on('message', (msg) => {
    const from = users[socket.id];
    if(!from) return; // must be joined first
    if(!allowedNumbers.includes(msg.to)) return; // only 2 numbers allowed
    msg.from = from;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);

    // send to recipient if connected
    for(const [id, num] of Object.entries(users)){
      if(num === msg.to){
        io.to(id).emit('message', msg);
      }
    }
    // send back to sender to update their chat
    socket.emit('message', msg);
  });

  socket.on('disconnect', ()=>{
    delete users[socket.id];
  });
});

server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
