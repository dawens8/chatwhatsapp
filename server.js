const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname,'uploads')));

let users = {}; // {number: {socketId, photo, videoStatus}}
let messages = {}; // {number: [{from,text,time,type}]}

app.get('/', (req,res)=>res.sendFile(__dirname+'/public/index.html'));
app.get('/dashboard', (req,res)=>res.sendFile(__dirname+'/public/dashboard.html'));

// Upload photo or video status
app.post('/upload', upload.single('file'), (req,res)=>{
  const number = req.body.number;
  const type = req.body.type; // photo or video
  if(!users[number]) return res.status(400).send("User not found");
  const filename = '/uploads/'+req.file.filename;
  if(type==='photo') users[number].photo = filename;
  if(type==='video') users[number].videoStatus = filename;
  io.emit('statusUpdate', users);
  res.json({success:true,url:filename});
});

io.on('connection', socket=>{
  console.log("New socket:", socket.id);

  socket.on('join', number=>{
    if(!users[number]) users[number]={socketId: socket.id, photo:"", videoStatus:""};
    users[number].socketId = socket.id;
    socket.number = number;
    io.emit('statusUpdate', users);
  });

  socket.on('message', data=>{
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const msg = {from: socket.number, to: data.to, text: data.text, time, type:'text'};
    if(!messages[data.to]) messages[data.to]=[];
    messages[data.to].push(msg);
    if(users[data.to]) io.to(users[data.to].socketId).emit('message', msg);
    io.to(socket.id).emit('message', msg);
  });

  socket.on('voice', data=>{
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const msg = {from: socket.number, to:data.to, audio:data.audio, time, type:'voice'};
    if(!messages[data.to]) messages[data.to]=[];
    messages[data.to].push(msg);
    if(users[data.to]) io.to(users[data.to].socketId).emit('voice', msg);
    io.to(socket.id).emit('voice', msg);
  });

  // WebRTC signaling for live video
  socket.on('webrtc-offer', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-offer',{from: socket.number, sdp: data.sdp}); });
  socket.on('webrtc-answer', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-answer',{from: socket.number, sdp: data.sdp}); });
  socket.on('webrtc-candidate', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('webrtc-candidate',{from: socket.number, candidate: data.candidate}); });

  // Calls
  socket.on('call', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('incomingCall',{from: socket.number}); });
  socket.on('answerCall', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('callAnswered',{from: socket.number}); });
  socket.on('declineCall', data=>{ if(users[data.to]) io.to(users[data.to].socketId).emit('callDeclined',{from: socket.number}); });

  socket.on('disconnect', ()=>{
    if(socket.number) delete users[socket.number];
    io.emit('statusUpdate', users);
  });
});

http.listen(3000, ()=>console.log("Server running on http://localhost:3000"));
