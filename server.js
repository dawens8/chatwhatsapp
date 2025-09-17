const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at root
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public','index.html'));
});

const messages = [];
let callState = {};

io.on('connection', socket=>{
  console.log('a user connected');

  socket.on('join', number=>{
    socket.number = number;
    console.log(number,'joined');
  });

  socket.on('message', msg=>{
    msg.from = socket.number;
    msg.time = new Date().toLocaleTimeString();
    messages.push(msg);
    io.emit('message', msg);
  });

  socket.on('voice', msg=>{
    msg.from = socket.number;
    io.emit('voice', msg);
  });

  socket.on('call', data=>{
    const to = data.to;
    callState[to] = {incomingFrom: socket.number, isInCall:false};
    io.emit('incomingCall', {from: socket.number, to});
  });

  socket.on('answerCall', data=>{
    const to = data.to;
    callState[socket.number].isInCall = true;
    io.emit('callAnswered', {from: socket.number, to});
  });

  socket.on('declineCall', data=>{
    const to = data.to;
    io.emit('callDeclined', {from: socket.number, to});
  });

  socket.on('disconnect', ()=>{
    console.log(socket.number,'disconnected');
  });
});

http.listen(3000, ()=>console.log('Server running on http://localhost:3000'));
