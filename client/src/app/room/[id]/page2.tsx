"use client";
import { useEffect, useState, memo } from "react";
import { useParams } from "next/navigation";
import Peer from "peerjs";
import io from "socket.io-client";
import { v4 as uuid4 } from "uuid";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

const socket = io("http://localhost:5000");

// استفاده از React.memo برای بهبود رندر
const VideoPlayer = memo(({ muted, stream, username }) => {
  useEffect(() => {
    const video = document.getElementById(username) as HTMLVideoElement;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  }, [stream, username]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-900 border border-gray-700">
      <video
        id={username}
        muted={muted}
        className="w-full h-full object-cover rounded-xl"
        autoPlay
        playsInline
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded-md text-sm text-white shadow-md">
        {username}
      </div>
    </div>
  );
});
VideoPlayer.displayName = "VideoPlayer";

export default function Room() {
  const params = useParams();
  const [peerId, setPeerId] = useState<Peer>();
  const [stream, setStream] = useState<MediaStream>();
  const [remoteStreams, setRemoteStreams] = useState<
    { userId: string; stream: MediaStream; name: string }[]
  >([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "Anonymous"
  );

  useEffect(() => {
    // مدیریت دقیق اتصالات PeerJS
    const peer = new Peer(uuid4(), {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:YOUR_TURN_SERVER_URL",
            username: "YOUR_USERNAME",
            credential: "YOUR_CREDENTIAL",
          },
        ],
      },
    });

    setPeerId(peer);

    peer.on("open", (id) => {
      socket.emit("join-room", {
        roomId: params.id,
        userId: id,
        metadata: { name: username },
      });
    });

    navigator.mediaDevices
      .getUserMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: true,
      })
      .then((stream: MediaStream) => {
        setStream(stream);
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
      });

    socket.on("user-disconnected", (userId) => {
      setRemoteStreams((prev) =>
        prev.filter((item) => item.userId !== userId)
      );
    });

    return () => {
      socket.disconnect();
      peer.destroy();
    };
  }, [params.id, username]);

  useEffect(() => {
    if (!peerId || !stream) return;

    const handleUserConnected = (user) => {
      const { userId, metadata } = user;
      const call = peerId.call(userId, stream, {
        metadata: { name: username },
      });

      call.on("stream", (userVideoStream: MediaStream) => {
        setRemoteStreams((prev) => {
          const isExist = prev.some((item) => item.userId === userId);
          if (!isExist) {
            return [...prev, { userId, stream: userVideoStream, name: metadata.name }];
          }
          return prev;
        });
      });

      call.on("close", () => {
        setRemoteStreams((prev) =>
          prev.filter((item) => item.userId !== userId)
        );
      });
    };

    const handleCall = (call) => {
      const username = call.metadata?.name;
      call.answer(stream);
      call.on("stream", (remoteVideoStream: MediaStream) => {
        setRemoteStreams((prev) => {
          const isExist = prev.some((item) => item.userId === call.peer);
          if (!isExist) {
            return [...prev, { userId: call.peer, stream: remoteVideoStream, name: username }];
          }
          return prev;
        });
      });

      call.on("close", () => {
        setRemoteStreams((prev) =>
          prev.filter((item) => item.userId !== call.peer)
        );
      });
    };

    socket.on("user-connected", handleUserConnected);
    peerId.on("call", handleCall);

    return () => {
      socket.off("user-connected", handleUserConnected);
      peerId.off("call", handleCall);
    };
  }, [peerId, stream, username]);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white p-6">
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={toggleVideo}
          className={`px-5 py-3 rounded-full shadow-lg transition transform hover:scale-105 ${
            isVideoOn
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isVideoOn ? (
            <Video className="h-6 w-6 text-white" />
          ) : (
            <VideoOff className="h-6 w-6 text-white" />
          )}
        </button>
        <button
          onClick={toggleMic}
          className={`px-5 py-3 rounded-full shadow-lg transition transform hover:scale-105 ${
            isMicOn
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isMicOn ? (
            <Mic className="h-6 w-6 text-white" />
          ) : (
            <MicOff className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6">
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {stream && (
            <div className="flex-1 min-w-[300px] max-w-[400px] h-[50vh] md:h-[40vh] lg:h-[30vh]">
              <VideoPlayer
                muted={true}
                stream={stream}
                username={`${username} (You)`}
              />
            </div>
          )}
          {remoteStreams.map((peer) => (
            <div
              key={peer.userId}
              className="flex-1 min-w-[300px] max-w-[400px] h-[50vh] md:h-[40vh] lg:h-[30vh]"
            >
              <VideoPlayer
                muted={false}
                stream={peer.stream}
                username={peer.name}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
