const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", socket=>{
  socket.on("message", msg=>{
    socket.broadcast.emit("message", msg);
  });

  socket.on("offer", offer=>{
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", ans=>{
    socket.broadcast.emit("answer", ans);
  });

  socket.on("ice", cand=>{
    socket.broadcast.emit("ice", cand);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server running on "+PORT));
