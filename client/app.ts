const lobby = document.getElementById("lobby") as HTMLDivElement;
const booth = document.getElementById("booth") as HTMLDivElement;
const createBtn = document.getElementById("create-btn") as HTMLButtonElement;
const joinBtn = document.getElementById("join-btn") as HTMLButtonElement;
const roomInput = document.getElementById("room-input") as HTMLInputElement;
const roomCodeDisplay = document.getElementById("room-code") as HTMLParagraphElement;
const localVideo = document.getElementById("local-video") as HTMLVideoElement;
const remoteVideo = document.getElementById("remote-video") as HTMLVideoElement;
const photoBtn = document.getElementById("photo-btn") as HTMLButtonElement;
const photosDiv = document.getElementById("photos") as HTMLDivElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
const mirrorBtn = document.getElementById("mirror-btn") as HTMLButtonElement;

let ws: WebSocket;
let mirrored = true;
let pc: RTCPeerConnection;
let localStream: MediaStream;

const config: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function send(msg: object) {
  ws.send(JSON.stringify(msg));
}

async function startCamera() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  localVideo.srcObject = localStream;
  localVideo.classList.add("mirrored");
  remoteVideo.classList.add("mirrored");
}

function createPeerConnection() {
  pc = new RTCPeerConnection(config);
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      send({ type: "ice-candidate", candidate: e.candidate.toJSON() });
    }
  };
}

async function createOffer() {
  createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  send({ type: "offer", offer });
}

async function handleOffer(offer: RTCSessionDescriptionInit) {
  createPeerConnection();
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  send({ type: "answer", answer });
}

async function handleAnswer(answer: RTCSessionDescriptionInit) {
  await pc.setRemoteDescription(answer);
}

async function handleIceCandidate(candidate: RTCIceCandidateInit) {
  await pc.addIceCandidate(candidate);
}

function takePhoto() {
  send({ type: "take-photo" });
  capturePhoto();
}

function capturePhoto() {
  const ctx = canvas.getContext("2d")!;
  canvas.width = localVideo.videoWidth + remoteVideo.videoWidth;
  canvas.height = Math.max(localVideo.videoHeight, remoteVideo.videoHeight);

  if (mirrored) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(localVideo, -localVideo.videoWidth, 0);
    ctx.drawImage(remoteVideo, -(localVideo.videoWidth + remoteVideo.videoWidth), 0);
    ctx.restore();
  } else {
    ctx.drawImage(localVideo, 0, 0);
    ctx.drawImage(remoteVideo, localVideo.videoWidth, 0);
  }

  const img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");
  img.onclick = () => {
    const a = document.createElement("a");
    a.href = img.src;
    a.download = `photobooth-${Date.now()}.png`;
    a.click();
  };
  photosDiv.prepend(img);
}

function showBooth() {
  lobby.hidden = true;
  booth.hidden = false;
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    createBtn.disabled = false;
    joinBtn.disabled = false;
  };

  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    switch (msg.type) {
      case "room-created":
        roomCodeDisplay.textContent = msg.roomCode;
        break;
      case "room-joined":
        showBooth();
        break;
      case "peer-joined":
        showBooth();
        await createOffer();
        break;
      case "peer-left":
        remoteVideo.srcObject = null;
        break;
      case "offer":
        await handleOffer(msg.offer);
        break;
      case "answer":
        await handleAnswer(msg.answer);
        break;
      case "ice-candidate":
        await handleIceCandidate(msg.candidate);
        break;
      case "take-photo":
        capturePhoto();
        break;
      case "error":
        alert(msg.message);
        break;
    }
  };
}

createBtn.disabled = true;
joinBtn.disabled = true;

createBtn.onclick = async () => {
  await startCamera();
  send({ type: "create-room" });
};

joinBtn.onclick = async () => {
  await startCamera();
  send({ type: "join-room", roomCode: roomInput.value.toUpperCase() });
};

photoBtn.onclick = takePhoto;

backBtn.onclick = () => {
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  if (pc) pc.close();
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  roomCodeDisplay.textContent = "";
  booth.hidden = true;
  lobby.hidden = false;
  ws.close();
  connect();
};

mirrorBtn.onclick = () => {
  mirrored = !mirrored;
  localVideo.classList.toggle("mirrored");
  remoteVideo.classList.toggle("mirrored");
  mirrorBtn.textContent = mirrored ? "Mirror: On" : "Mirror: Off";
};

connect();
