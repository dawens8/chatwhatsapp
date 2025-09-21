const socket = io();
let localStream, peerConnection, remoteStream;
let callTimer, seconds = 0;

const servers = { iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] };

const callScreen = document.getElementById("callScreen");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const audioCallBtn = document.getElementById("audioCallBtn");
const videoCallBtn = document.getElementById("videoCallBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callStatus = document.getElementById("callStatus");
const callTimerEl = document.getElementById("callTimer");
const endCallBtn = document.getElementById("endCall");
const toggleMic = document.getElementById("toggleMic");
const toggleCam = document.getElementById("toggleCam");

// Send message
sendBtn.onclick = ()=>{
  const msg = messageInput.value;
  if(!msg) return;
  socket.emit("message", { text: msg });
  addMessage("You", msg);
  messageInput.value="";
};

socket.on("message", msg=>{
  addMessage("Friend", msg.text);
});

function addMessage(sender, text){
  const div=document.createElement("div");
  div.textContent=`${sender}: ${text}`;
  chatBox.appendChild(div);
}

// Audio call
audioCallBtn.onclick = ()=> startCall(false);
videoCallBtn.onclick = ()=> startCall(true);

async function startCall(isVideo){
  callScreen.classList.remove("hidden");
  localStream = await navigator.mediaDevices.getUserMedia({ video:isVideo, audio:true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e=> e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);

  peerConnection.onicecandidate = e=>{
    if(e.candidate) socket.emit("ice", e.candidate);
  };

  startTimer();
}

socket.on("offer", async offer=>{
  callScreen.classList.remove("hidden");
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = e=> e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t));

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);

  peerConnection.onicecandidate = e=>{
    if(e.candidate) socket.emit("ice", e.candidate);
  };

  startTimer();
});

socket.on("answer", ans=>{
  peerConnection.setRemoteDescription(new RTCSessionDescription(ans));
});

socket.on("ice", cand=>{
  peerConnection.addIceCandidate(new RTCIceCandidate(cand));
});

// End call
endCallBtn.onclick = endCall;
function endCall(){
  if(peerConnection) peerConnection.close();
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
  callScreen.classList.add("hidden");
  stopTimer();
}

function startTimer(){
  seconds=0;
  callTimer=setInterval(()=>{
    seconds++;
    let m=Math.floor(seconds/60).toString().padStart(2,"0");
    let s=(seconds%60).toString().padStart(2,"0");
    callTimerEl.textContent=`${m}:${s}`;
  },1000);
}
function stopTimer(){ clearInterval(callTimer); }
