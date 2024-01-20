// DOM elements.
const roomSelectionContainer = document.getElementById(
    'room-selection-container'
);
const roomInput = document.getElementById('room-input');
const connectButton = document.getElementById('connect-button');

const videoChatContainer = document.getElementById('video-chat-container');
const localVideoComponent = document.getElementById('local-video');
const remoteVideoComponent = document.getElementById('remote-video');
const muteBtn = document.getElementById('mute');
const cameraBtn = document.getElementById('camera');
const cameraSelect = document.getElementById('camera-select');
const audioSelect = document.getElementById('audio-select');

// Variables.
const socket = io();
const mediaConstraints = {
    audio: true,
    video: { width: 1280, height: 720 },
};
let localStream;
let remoteStream;
let isRoomCreator;
let roomId;

let creator = false;
let rtcPeerConnection; // Connection between the local device and the remote peer.
let iceServers = {
    iceServer: [{ urls: 'stun:stun1.1.google.conm:19302' }],
};

let muted = false;
let cameraOff = false;

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => {
    joinRoom(roomInput.value);
});

muteBtn.addEventListener('click', handleMuteClick);
cameraBtn.addEventListener('click', handleCameraClick);
cameraSelect.addEventListener('input', handleCameraChange);
audioSelect.addEventListener('input', handleAudioChange);

// FUNCTIONS ==================================================================
function joinRoom(room) {
    if (room === '') {
        alert('Please type a room ID');
    } else {
        roomId = room;
        socket.emit('join', room);
    }
}

async function initCall() {
    roomSelectionContainer.style = 'display: none';
    videoChatContainer.style = 'display: block';
    await getMedia();
}

async function getMedia(audioId, videoId) {
    const initialConstraints = {
        // initialConstraints는 deviceId가 없을 때 실행
        audio: true,
        video: { facingMode: 'user' }, // 카메라가 전후면에 달려있을 경우 전면 카메라의 정보를 받음 (후면의 경우 "environment")
    };
    console.log('initialConstraints: ', initialConstraints);

    const cameraConstraints = {
        // CameraConstraints는 deviceId가 있을 때 실행
        audio: true,
        video: { videoId: { exact: videoId } }, // exact를 쓰면 받아온 deviceId가 아니면 출력하지 않는다
    };
    console.log('cameraConstraints: ', cameraConstraints);

    const audioConstraints = {
        // CameraConstraints는 deviceId가 있을 때 실행
        audio: { audioId: { exact: audioId } },
        video: true, // exact를 쓰면 받아온 deviceId가 아니면 출력하지 않는다
    };
    console.log('audioConstraints: ', audioConstraints);

    try {
        localStream = await navigator.mediaDevices.getUserMedia(
            videoId
                ? cameraConstraints
                : audioId
                ? audioConstraints
                : initialConstraints
        );
        console.log('바귄 디바이스', localStream);

        localVideoComponent.srcObject = localStream;
        if (!videoId && !audioId) {
            console.log('처음 실행!');
            // 처음 딱 1번만 실행! 우리가 맨 처음 getMedia를 할 때만 실행됨!!
            await getCameras();
            await getAudios();
        }

        socket.emit('ready', roomId);
    } catch (e) {
        console.error(e);
    }
}

// CAMERA, AUDIO BUTTON ==================================================
async function handleMuteClick() {
    localStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (!muted) {
        muteBtn.innerText = '음소거 해제';
        muted = true;
    } else {
        muteBtn.innerText = '음소거';
        muted = false;
    }
}

async function handleCameraClick() {
    localStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
        cameraBtn.innerText = '카메라 끄기';
        cameraOff = false;
    } else {
        cameraBtn.innerText = '카메라 켜기';
        cameraOff = true;
    }
}

async function getAudios() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((device) => device.kind === 'audioinput');
        const currentAudio = localStream.getAudioTracks()[0];
        audios.forEach((audio) => {
            const option = document.createElement('option');
            option.value = audio.deviceId;
            option.innerText = audio.label;
            if (currentAudio.label === audio.label) {
                option.selected = true;
            }
            audioSelect.appendChild(option);
        });
    } catch (err) {
        console.log(err);
    }
}

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
            (device) => device.kind === 'videoinput'
        );
        const currentCamera = localStream.getVideoTracks()[0];

        cameras.forEach((camera) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (err) {
        console.log(err);
    }
}

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
}

async function handleAudioChange() {
    await getMedia(audioSelect.value);
}

// RTC ===================================================================

socket.on('Room created', () => {
    creator = true;
    initCall();
});
socket.on('Room joined', () => {
    creator = false;
    initCall();
});
socket.on('Room full', () => {
    alert('방 최대인원에 도달 했습니다.');
});
socket.on('ready', () => {
    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        console.log('rtcPeerConnection: ', rtcPeerConnection);
        console.log('확인하고싶은거 위에있음');
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer(
            function (offer) {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit('offer', offer, roomId);
            },
            function (error) {
                console.log(error);
            }
        );
        console.log('작동 잘 되나');
    }
});
socket.on('candidate', (candidate) => {
    let iceCandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(iceCandidate);
});
socket.on('offer', (offer) => {
    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer(
            function (answer) {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit('answer', answer, roomId);
            },
            function (error) {
                console.log(error);
            }
        );
        console.log('작동 잘 되나');
    }
});
socket.on('answer', (answer) => {
    rtcPeerConnection.setRemoteDescription(answer);
});

function OnIceCandidateFunction(event) {
    if (event.candidate) {
        socket.emit('candidate', event.candidate, roomId);
    }
}

async function OnTrackFunction(event) {
    console.log('이벤트', event);
    remoteVideoComponent.srcObject = event.streams[0];
    remoteVideoComponent.onloadedmetadata = function (e) {
        remoteVideoComponent.play();
    };
}
