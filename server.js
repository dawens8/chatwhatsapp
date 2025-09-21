const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket=>{
  console.log("User connected");

  socket.on("chatMessage", msg=>{
    socket.broadcast.emit("chatMessage", msg);
  });

  socket.on("offer", (offer, type)=>{
    socket.broadcast.emit("offer", offer, type);
  });

  socket.on("answer", answer=>{
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice", candidate=>{
    socket.broadcast.emit("ice", candidate);
  });

  socket.on("endCall", ()=>{
    socket.broadcast.emit("endCall");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server running on port "+PORT));
