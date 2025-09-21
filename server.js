const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{ origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// In-memory stores (for demo). You may persist to DB.
let users = {};            // number -> socket.id
let blocked = {};          // number -> [blockedNumbers]
let reports = {};          // number -> {count,last}
let callHistories = {};    // number -> [ {with,type,start,end,durationMs} ]

io.on('connection', socket=>{
  console.log('conn', socket.id);

  socket.on('join', (number)=>{
    socket.number = number;
    users[number] = socket.id;
    console.log(`${number} joined as ${socket.id}`);
  });

  socket.on('message', (msg)=>{
    const targetId = users[msg.to];
    if(targetId){
      // check block
      if(blocked[msg.to] && blocked[msg.to].includes(socket.number)) {
        return; // recipient blocked sender
      }
      io.to(targetId).emit('message', { from: socket.number, text: msg.text, time: msg.time });
    }
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data)=>{
    const toId = users[data.to];
    if(toId) io.to(toId).emit('webrtc-offer', { from: socket.number, offer: data.offer });
  });
  socket.on('webrtc-answer', (data)=>{
    const toId = users[data.to];
    if(toId) io.to(toId).emit('webrtc-answer', { from: socket.number, answer: data.answer });
  });
  socket.on('webrtc-ice', (data)=>{
    const toId = users[data.to];
    if(toId) io.to(toId).emit('webrtc-ice', { from: socket.number, candidate: data.candidate });
  });

  // end call notify
  socket.on('endCall', (data)=>{
    const toId = users[data.to];
    if(toId) io.to(toId).emit('endCall', { from: socket.number });
  });

  // called by client to persist call record
  socket.on('callEndedRecord', (rec)=>{
    // save for both participants
    const recObj = { with: rec.with, type: rec.type, start: rec.start, end: rec.end, durationMs: rec.end - rec.start };
    if(!callHistories[socket.number]) callHistories[socket.number] = [];
    callHistories[socket.number].push(Object.assign({peer: rec.with}, recObj));
    // also save for the other side if present
    if(!callHistories[rec.with]) callHistories[rec.with] = [];
    callHistories[rec.with].push(Object.assign({peer: socket.number}, recObj));
    io.to(socket.id).emit('callEndedRecordAck');
  });

  // block/unblock/report endpoints via socket if needed (not used in this demo)
  socket.on('block', (num)=>{
    if(!blocked[socket.number]) blocked[socket.number] = [];
    if(!blocked[socket.number].includes(num)) blocked[socket.number].push(num);
    socket.emit('blockedList', blocked[socket.number]);
  });
  socket.on('report', (num)=>{
    if(!reports[num]) reports[num] = {count:0,last:0};
    reports[num].count++;
    reports[num].last = Date.now();
    if(reports[num].count >= 7){
      const sid = users[num];
      if(sid) io.to(sid).emit('banned', { reason: 'Too many reports', duration: '24h' });
      // optionally disconnect
      if(users[num]) io.sockets.sockets.get(users[num])?.disconnect();
    }
  });

  socket.on('disconnect', ()=>{
    if(socket.number && users[socket.number] === socket.id) delete users[socket.number];
    console.log('disconnect', socket.number);
  });
});

// expose a simple endpoint to inspect call histories (DEV only)
app.get('/debug/callhist/:number', (req,res)=>{
  const num = req.params.number;
  res.json({ number: num, calls: callHistories[num] || [] });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));
