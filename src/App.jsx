import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { signInWithGoogle, signOutUser, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const socket = io('https://chitchat-backend-op5h.onrender.com'); // Use your backend URL

function App() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const [user, setUser] = useState(null);
  const peerIdRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user || null);
    });
  }, []);

  const createPeerConnection = () => {
    return new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'openai',
          credential: 'openai'
        }
      ]
    });
  };

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.current.srcObject = stream;

    peerRef.current = createPeerConnection();

    stream.getTracks().forEach(track => {
      peerRef.current.addTrack(track, stream);
    });

    peerRef.current.ontrack = e => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    peerRef.current.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, target: null });
      }
    };

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    socket.emit('offer', { sdp: offer, target: null });

    setInCall(true);
  };

  useEffect(() => {
    socket.on('offer', async (data) => {
      peerIdRef.current = data.caller;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.current.srcObject = stream;

      peerRef.current = createPeerConnection();

      stream.getTracks().forEach(track => {
        peerRef.current.addTrack(track, stream);
      });

      peerRef.current.ontrack = e => {
        remoteVideo.current.srcObject = e.streams[0];
      };

      peerRef.current.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, target: data.caller });
        }
      };

      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit('answer', { sdp: answer, target: data.caller });

      setInCall(true);
    });

    socket.on('answer', async (data) => {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });

    socket.on('ice-candidate', (data) => {
      peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">ChitChat Video Call</h1>

      {!user ? (
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
          onClick={signInWithGoogle}
        >
          Sign In with Google
        </button>
      ) : (
        <div>
          <div className="mb-4">
            <span className="font-bold">{user.displayName}</span>
            <button
              className="ml-4 text-sm text-red-500"
              onClick={signOutUser}
            >
              Sign Out
            </button>
          </div>

          <div className="flex gap-4">
            <video ref={localVideo} autoPlay playsInline className="w-64 h-48 bg-black" />
            <video ref={remoteVideo} autoPlay playsInline className="w-64 h-48 bg-black" />
          </div>

          {!inCall && (
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded mt-4"
              onClick={startCall}
            >
              Start Video Chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
