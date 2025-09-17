const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname)); // serve index.html and dashboard.html
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload endpoint for dashboard (photo/video)
app.post('/upload', upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).send('No file uploaded');
  res.json({filePath:'/uploads/'+req.file.filename});
});

// Simple dashboard page
app.get('/dashboard', (req,res)=>{
  res.sendFile(__dirname+'/dashboard.html');
});

const messages = {}; // store messages per number
const calls = {};    // call state

io.on('connection', socket=>{
  console.log('User connected:', socket.id);

  socket.on('join', number=>{
    socket.number = number;
    socket.join(number);
    if(messages[number]) socket.emit('loadMessages', messages[number]);
  });

  socket.on('message', msg=>{
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const fullMsg = {...msg, from: socket.number, time};
    if(!messages[msg.to]) messages[msg.to] = [];
    messages[msg.to].push(fullMsg);
    if(!messages[socket.number]) messages[socket.number] = [];
    messages[socket.number].push(fullMsg);
    io.to(msg.to).emit('message', fullMsg);
    io.to(socket.number).emit('message', fullMsg);
  });

  socket.on('voice', msg=>{
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const fullMsg = {...msg, from: socket.number, time};
    if(!messages[msg.to]) messages[msg.to] = [];
    messages[msg.to].push(fullMsg);
    io.to(msg.to).emit('voice', fullMsg);
    io.to(socket.number).emit('voice', fullMsg);
  });

  socket.on('call', data=>{
    calls[data.to] = {from: socket.number, active:false};
    io.to(data.to).emit('incomingCall', {from: socket.number});
  });

  socket.on('answerCall', data=>{
    if(calls[socket.number] && calls[socket.number].from === data.to){
      calls[socket.number].active = true;
      io.to(data.to).emit('callAnswered', {from: socket.number});
    }
  });

  socket.on('declineCall', data=>{
    if(calls[socket.number] && calls[socket.number].from === data.to){
      io.to(data.to).emit('callDeclined', {from: socket.number});
      delete calls[socket.number];
    }
  });

  socket.on('disconnect', ()=>{
    console.log('User disconnected:', socket.id);
  });
});

http.listen(3000, ()=>console.log('Server running on http://localhost:3000'));
