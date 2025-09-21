const socket = io();
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const audioCallBtn = document.getElementById("audioCallBtn");
const videoCallBtn = document.getElementById("videoCallBtn");

const callScreen = document.getElementById("callScreen");
const remoteVideo = document.getElementById("remoteVideo");
const localVideo = document.getElementById("localVideo");
const muteBtn = document.getElementById("muteBtn");
const videoBtn = document.getElementById("videoBtn");
const speakerBtn = document.getElementById("speakerBtn");
const endCallBtn = document.getElementById("endCallBtn");
const callTimer = document.getElementById("callTimer");

let localStream, peerConnection, callType="audio";
let callInterval, seconds=0;

function addMessage(text, sender="me") {
  const div = document.createElement("div");
  div.className = "bubble " + (sender==="me"?"sent":"rec");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.onclick = () => {
  const msg = messageInput.value;
  if(!msg) return;
  addMessage(msg, "me");
  socket.emit("chatMessage", msg);
  messageInput.value="";
};

socket.on("chatMessage", msg=>{
  addMessage(msg, "other");
});

// Call logic
async function startCall(type="audio") {
  callType=type;
  callScreen.style.display="flex";
  seconds=0;
  callInterval=setInterval(()=>{
    seconds++;
    let m=Math.floor(seconds/60).toString().padStart(2,"0");
    let s=(seconds%60).toString().padStart(2,"0");
    callTimer.textContent=`${m}:${s}`;
  },1000);

  localStream=await navigator.mediaDevices.getUserMedia({
    video: type==="video", audio:true
  });
  localVideo.srcObject=localStream;

  peerConnection=new RTCPeerConnection();
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = e=>{
    if(e.candidate) socket.emit("ice", e.candidate);
  };

  const offer=await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, type);
}

audioCallBtn.onclick = ()=> startCall("audio");
videoCallBtn.onclick = ()=> startCall("video");

endCallBtn.onclick = ()=>{
  callScreen.style.display="none";
  clearInterval(callInterval);
  peerConnection.close();
  localStream.getTracks().forEach(t=>t.stop());
  socket.emit("endCall");
};

muteBtn.onclick = ()=>{
  let enabled=localStream.getAudioTracks()[0].enabled;
  localStream.getAudioTracks()[0].enabled=!enabled;
  muteBtn.textContent=enabled?"🔈":"🎤";
};

videoBtn.onclick = ()=>{
  if(localStream.getVideoTracks()[0]){
    let enabled=localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled=!enabled;
    videoBtn.textContent=enabled?"📷":"🚫";
  }
};

speakerBtn.onclick = ()=>{
  remoteVideo.muted=!remoteVideo.muted;
};

// Signaling
socket.on("offer", async (offer, type)=>{
  callType=type;
  callScreen.style.display="flex";
  seconds=0;
  callInterval=setInterval(()=>{
    seconds++;
    let m=Math.floor(seconds/60).toString().padStart(2,"0");
    let s=(seconds%60).toString().padStart(2,"0");
    callTimer.textContent=`${m}:${s}`;
  },1000);

  localStream=await navigator.mediaDevices.getUserMedia({video:type==="video",audio:true});
  localVideo.srcObject=localStream;

  peerConnection=new RTCPeerConnection();
  localStream.getTracks().forEach(track=>peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = e=>{
    remoteVideo.srcObject=e.streams[0];
  };
  peerConnection.onicecandidate = e=>{
    if(e.candidate) socket.emit("ice", e.candidate);
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer=await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async answer=>{
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice", async candidate=>{
  try{ await peerConnection.addIceCandidate(candidate); }catch(e){console.error(e);}
});

socket.on("endCall", ()=>{
  callScreen.style.display="none";
  clearInterval(callInterval);
  if(peerConnection) peerConnection.close();
  if(localStream) localStream.getTracks().forEach(t=>t.stop());
});
