"use client";
import Peer from "peerjs";
import io from "socket.io-client";
import { v4 as uuid4 } from "uuid";
import VideoPlayer from "./VideoPlayer";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const socket = io("http://localhost:5000");

const Room = () => {
  const params = useParams();
  const [peerId, setPeerId] = useState<any>();
  const [stream, setStream] = useState<any>();
  const [remoteStream, setRemoteStream] = useState<any>();
  const [micStatus, setMicStatus] = useState<boolean>(false);
  const [username, setName] = useState(localStorage.getItem("username") || "");

  useEffect(() => {
    // Create peer
    const peer = new Peer(uuid4().toString());

    // Set Peer to state
    // Join room
    setPeerId(peer);
    peer.on("open", (id) => {
      socket.emit("join-room", {
        roomId: params.id,
        userId: id,
        metadata: { name: username },
      });
    });

    // Access Media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream: MediaStream) => {
        setStream(stream);
      });

    //   User leave
    // Remove user to array
    socket.on("user-disconnected", (userId) => {
      setRemoteStream((prev: any) => {
        return prev.filter((item: any) => item.userId != userId);
      });
    });

    // to avoid memory leak
    return () => {
      socket.disconnect();
      peer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!peerId || !stream) return;

    // Call users
    // Initiate call
    const handleUserConnected = ({ userId, metadata }: any) => {
      console.log(metadata);
      const call = peerId.call(userId, stream, {
        metadata: {
          name: localStorage.getItem("username"),
        },
      });

      call.on("stream", (userVideoStream: MediaStream) => {
        setRemoteStream((prev: any) => {
          const isExist = prev.find((item: any) => item.userId === userId);
          if (!isExist) {
            return [
              ...prev,
              {
                userId,
                remoteVideoStream: userVideoStream,
                name: metadata.name,
              },
            ];
          }
          return prev;
        });
      });
    };

    const handleCall = (call: any) => {
      console.log(call);
      const username = call.metadata?.name;
      call.answer(stream);
      call.on("stream", (remoteVideoStream: MediaStream) => {
        setRemoteStream((prev: any) => {
          const isExist = prev.find((item: any) => item.userId === call.peer);
          if (!isExist) {
            return [
              ...prev,
              {
                userId: call.peer,
                remoteVideoStream,
                name: username,
              },
            ];
          }
          return prev;
        });
      });
    };

    socket.on("user-connected", handleUserConnected);
    peerId.on("call", handleCall);

    return () => {
      socket.off("user-connected", handleUserConnected);
      peerId.off("call", handleCall);
    };
  }, [peerId, stream]);

  //   Video Toggle
  const toggleVideo = async () => {
    if (stream) {
      const tracks = stream.getVideoTracks();
      tracks.forEach((track: any) => (track.enabled = !track.enabled));
    }
  };

  const toggleMic = async () => {
    if (stream) {
      const tracks = stream.getAudioTracks();
      tracks.forEach((track: any) => (track.enabled = !track.enabled));
      setMicStatus((prev) => (prev = !prev));
    }
  };

  return (
    <div className="w-screen h-screen overflow-x-hidden">
      <div className="flex justify-evenly">
        <button onClick={toggleVideo}>Toggle Video</button>
        <button onClick={toggleMic}>Toggle Audio</button>
      </div>
      <div
        className={`grid place-items-center grid-flow-row gap-4 w-100 h-100 p-4 ${
          remoteStream.length === 0
            ? "grid-cols-1"
            : remoteStream.length === 1
            ? "grid-cols-1 md:grid-cols-2"
            : remoteStream.length >= 2
            ? "lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
            : ""
        }`}
      >
        <div id={peerId?._id} className="relative">
          <VideoPlayer muted={true} stream={stream}></VideoPlayer>
          <p className="absolute bottom-2 left-2 bg-black text-white">
            {username}
          </p>
        </div>

        {remoteStream.length > 0 &&
          remoteStream.map((peer, index) => (
            <div key={peer.userId} id={peer.userId} className="relative">
              <VideoPlayer
                muted={false}
                stream={peer.remoteVideoStream}
              ></VideoPlayer>
              {peer.muted && (
                <p className="absolute right-2 top-2 bg-black text-white p-1 rounded-xl">
                    muted
                </p>
              )}
              <p className="absolute bottom-2 left-2 bg-black text-white">
                {peer.name}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Room;
