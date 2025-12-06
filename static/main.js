// CONSTANTS
const URL = `ws://${window.location.host}/ws/call`;

// //
let localStream;
let peers = {}; // others users key:id and value: RTCPeerConnection
let ws;
let myMemberId;

let constraints = {
  video: true,
  audio: true,
};

// stun servers (free ones from google)
const servers = {
  iceServers: [
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

async function init() {
  // my id
  myMemberId = Math.floor(Math.random() * 1000000);
  document.getElementById("myid").innerHTML = myMemberId;

  // video buttons function
  videoControlButton();

  // websocket configuration
    handelWebsocket();

  // displaying my video
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log("AUDIO TRACKS:", localStream.getAudioTracks());

  document.getElementById("localStream").srcObject = localStream;
}

function handelWebsocket() {
  ws = new WebSocket(URL + `/?id=${myMemberId}`);
  ws.onopen = async () => {
    console.log("Websocker connected...");
  };
  ws.onmessage = async (event) => {
    const reveived_data = JSON.parse(event.data);
    console.log(reveived_data);
    if (reveived_data.receiverId && reveived_data.receiverId !== myMemberId) {
      console.log("PREVENT NOT FOR ME", reveived_data.receiverId, myMemberId);
      return; // not for me
    }
    handelMessageReceived(reveived_data);
  };
  ws.onclose = () => {
    console.log("Websocket disconnected...");
  };
  ws.onerror = (error) => {
    console.log("Error occured :", error);
  };
}

async function handelMessageReceived(received_data) {
  const { type, senderId } = received_data; // {type:"offer"/"answer"/"candidate", senderId:...}
  console.log(`[WS] Message received from ${senderId}:`, received_data);

  if (type === "current-users") {
    console.log("Current users in the room", received_data.users);
    console.log("Current locally available users", peers);
    // send offer to all currently available user (only to new)
    const users = received_data.users || [];
    users.map(async (userId) => {
      if (Number(userId) === myMemberId) return;
      if (peers[Number(userId)]) return;

      await createOffer(Number(userId));
    });
  }

  if (type === "offer") {
    console.log(`[WEBRTC] Received offer from ${senderId}. Creating answer...`);
    await createAnswer(received_data.offer, senderId);
    console.log(`[WEBRTC] Answer sent to ${senderId}`);
  }

  if (type === "answer") {
    console.log(
      `[WEBRTC] Received answer from ${senderId}. Setting remote description...`
    );
    await responseToAnswer(senderId, received_data.answer);
  }

  if (type === "candidate") {
    if (peers[senderId]) {
      console.log(
        `[WEBRTC] Received ICE candidate from ${senderId}. Adding to peerConnection...`
      );
      await peers[senderId].addIceCandidate(received_data.candidate);
      console.log(`[WEBRTC] ICE candidate added for ${senderId}`);
    } else {
      console.warn(
        `[WEBRTC] Received ICE candidate from ${senderId} but peerConnection does not exist yet`
      );
    }
  }
}

async function createOffer(userId) {
  const peerConnection = new RTCPeerConnection(servers);
  console.log("PeerConnection created:", peerConnection);

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById("localStream").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peers[userId] = peerConnection;
  createVideoAndAddTracks(peerConnection, userId);
  console.log("Setting onicecandidate...", peerConnection.onicecandidate);
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      ws.send(
        JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
          senderId: myMemberId,
          receiverId: userId,
        })
      );
    }
  });
  peerConnection.addEventListener("connectionstatechange", () => {
    if (
      peerConnection.connectionState === "disconnected" ||
      peerConnection.connectionState === "failed" ||
      peerConnection.connectionState === "closed"
    ) {
      removePeer(userId);
    }
  });

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  ws.send(
    JSON.stringify({
      type: "offer",
      offer: offer,
      senderId: myMemberId,
      receiverId: userId,
    })
  );
}

async function createAnswer(offer, senderId) {
  const peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peers[senderId] = peerConnection;
  console.log("CURRENT PEERS : ", peers);
  createVideoAndAddTracks(peerConnection, senderId);
  console.log("Setting onicecandidate...", peerConnection.onicecandidate);
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      ws.send(
        JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
          senderId: myMemberId,
          receiverId: senderId,
        })
      );
    }
  });
  peerConnection.addEventListener("connectionstatechange", () => {
    if (
      peerConnection.connectionState === "disconnected" ||
      peerConnection.connectionState === "failed" ||
      peerConnection.connectionState === "closed"
    ) {
      removePeer(senderId);
    }
  });

  await peerConnection.setRemoteDescription(offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  ws.send(
    JSON.stringify({
      type: "answer",
      answer: answer,
      senderId: myMemberId,
      receiverId: senderId,
    })
  );
}

async function responseToAnswer(senderId, answer) {
  await peers[senderId].setRemoteDescription(answer);
  console.log("CURRENT PEERS : ", peers);
}

// function createVideoAndAddTracks(peerConnection, senderId) {
//   let videoContainer = document.querySelector("#remoteStreams");

//   // Only create the video element if it doesn't exist
//   let remoteVideo = document.getElementById("video" + senderId);
//   if (!remoteVideo) {
//     remoteVideo = document.createElement("video");
//     remoteVideo.id = "video" + senderId;
//     remoteVideo.autoplay = true;
//     remoteVideo.playsInline = true;
//     remoteVideo.muted = false; // Unmute remote video
//     videoContainer.appendChild(remoteVideo);
//   }

//   peerConnection.addEventListener("track", (event) => {
//     console.log(`[WEBRTC] Track received from ${senderId}:`, event.track.kind);
//     if (remoteVideo.srcObject) return;
//     const remoteStream = event.streams[0] || new MediaStream([event.track]);
//     remoteVideo.srcObject = remoteStream;

//     if (!event.streams[0]) {
//       remoteStream.addTrack(event.track);
//     }
//     remoteVideo.play().catch((e) => console.error("Error playing video:", e));
//   });
// }

function createVideoAndAddTracks(peerConnection, senderId) {
  let videoContainer = document.querySelector("#remoteStreams");

  // Only create the video element if it doesn't exist
  let remoteVideo = document.getElementById("video" + senderId);
  if (!remoteVideo) {
    remoteVideo = document.createElement("video");
    remoteVideo.id = "video" + senderId;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.muted = false; // Ensure remote video is not muted
    videoContainer.appendChild(remoteVideo);
  }

  peerConnection.addEventListener("track", (event) => {
    console.log(`[WEBRTC] Track received from ${senderId}:`, event.track.kind);

    // FIX: Use the stream provided by the event (event.streams[0])
    // WebRTC automatically groups the audio and video tracks into this stream
    if (event.streams && event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
    } else {
      // Fallback: If no stream info is sent, create/append manually
      if (!remoteVideo.srcObject) {
        remoteVideo.srcObject = new MediaStream();
      }
      remoteVideo.srcObject.addTrack(event.track);
    }

    // Attempt to play (sometimes needed if autoplay fails)
    remoteVideo.play().catch((e) => console.error("Error playing video:", e));
  });
}

function removePeer(senderId) {
  const peerConnection = peers[senderId];
  if (!peerConnection) return;

  // Close the peer connection
  peerConnection.close();

  // Remove the video element
  const video = document.getElementById("video" + senderId);
  if (video) {
    video.srcObject = null;
    video.remove();
  }

  // Remove from peers object
  delete peers[senderId];

  console.log(`[WEBRTC] Peer ${senderId} removed.`);
}

function videoControlButton() {
  let videoButton = document.getElementById("videoButton");
  let audioButton = document.getElementById("audioButton");

  videoButton.addEventListener("click", () => {
    constraints.video = !constraints.video;
    videoButton.innerHTML = constraints.video ? "Video: on" : "Video: off";

    localStream.getVideoTracks().forEach((track) => {
      track.enabled = constraints.video;
    });
  });

  audioButton.addEventListener("click", () => {
    constraints.audio = !constraints.audio;
    audioButton.innerHTML = constraints.audio ? "Audio: on" : "Audio: off";

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = constraints.audio;
    });
  });
}

// main function
init();
