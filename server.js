const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let users = {}; // {number: {socketId, videoStreamId}}
let messages = {}; // {number: [{from, text, time, type}]}

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/dashboard', (req, res) => res.sendFile(__dirname + '/public/dashboard.html'));

io.on('connection', socket => {
  console.log('New connection', socket.id);

  socket.on('join', number => {
    users[number] = {socketId: socket.id};
    socket.number = number;
    io.emit('statusUpdate', users);
  });

  socket.on('message', data => {
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const msg = {from: socket.number, to: data.to, text: data.text, time, type: data.type || 'text'};
    if(!messages[data.to]) messages[data.to]=[];
    messages[data.to].push(msg);
    if(users[data.to]) io.to(users[data.to].socketId).emit('message', msg);
    io.to(socket.id).emit('message', msg);
  });

  socket.on('voice', data => {
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const msg = {from: socket.number, to: data.to, audio: data.audio, time, type:'voice'};
    if(!messages[data.to]) messages[data.to]=[];
    messages[data.to].push(msg);
    if(users[data.to]) io.to(users[data.to].socketId).emit('voice', msg);
    io.to(socket.id).emit('voice', msg);
  });

  // WebRTC signaling for video
  socket.on('webrtc-offer', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-offer', {from: socket.number, sdp: data.sdp});
  });
  socket.on('webrtc-answer', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-answer', {from: socket.number, sdp: data.sdp});
  });
  socket.on('webrtc-candidate', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-candidate', {from: socket.number, candidate: data.candidate});
  });

  socket.on('call', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('incomingCall', {from: socket.number});
  });
  socket.on('answerCall', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('callAnswered', {from: socket.number});
  });
  socket.on('declineCall', data => {
    if(users[data.to]) io.to(users[data.to].socketId).emit('callDeclined', {from: socket.number});
  });

  socket.on('disconnect', () => {
    if(socket.number) delete users[socket.number];
    io.emit('statusUpdate', users);
  });
});

http.listen(3000, ()=> console.log("Server running on http://localhost:3000"));
