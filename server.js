const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public')); // put your index.html in 'public' folder

const allowedNumbers = ['13058962443','18573917861'];
let messages = {}; // store messages per number
let voiceMessages = {};

io.on('connection', socket => {
    let currentNumber = null;

    socket.on('join', number => {
        if(!allowedNumbers.includes(number)) return;
        currentNumber = number;
        if(!messages[number]) messages[number] = [];
        if(!voiceMessages[number]) voiceMessages[number] = [];
        socket.emit('loadMessages', messages[number]);
        voiceMessages[number].forEach(v => socket.emit('voice', v));
    });

    socket.on('message', msg => {
        const time = new Date().toLocaleTimeString();
        const fullMsg = {from: currentNumber, text: msg.text, time};
        messages[msg.to].push(fullMsg);
        socket.to(msg.to).emit('message', fullMsg);
    });

    socket.on('voice', msg => {
        const fullMsg = {from: currentNumber, audio: msg.audio};
        voiceMessages[msg.to].push(fullMsg);
        socket.to(msg.to).emit('voice', fullMsg);
    });

    socket.on('call', data => {
        socket.to(data.to).emit('incomingCall', {from: currentNumber});
    });

    socket.on('answerCall', data => {
        socket.to(data.to).emit('callAnswered', {from: currentNumber});
    });

    socket.on('declineCall', data => {
        socket.to(data.to).emit('callDeclined', {from: currentNumber});
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
