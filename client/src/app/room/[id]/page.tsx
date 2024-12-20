"use client";
import { useEffect, useState, memo } from "react";
import { useParams } from "next/navigation";
import Peer from "peerjs";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { axiosInstanceVC } from "@/lib/axiosInstance";

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
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "Anonymous"
  );

  useEffect(() => {
    const fetchWebSocketUrl = async () => {
      try {
        const response = await axiosInstanceVC.get(`rooms/1/join/`);
        const data = response.data;
        const wsUrl = data.ws_url.replace("ws://", "wss://");

        const socket = new WebSocket(wsUrl);
        setWebSocket(socket);

        socket.onopen = () => {
          console.log("Connected to WebSocket");
          const joinMessage = JSON.stringify({
            peer: username,
            action: "join-room",
            message: {},
          });
          socket.send(joinMessage);
        };

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);

          if (message.action === "user-connected") {
            console.log("User connected:", message.message);
          }

          if (message.action === "user-disconnected") {
            const { userId } = message.message;
            setRemoteStreams((prev) =>
              prev.filter((item) => item.userId !== userId)
            );
          }
        };

        socket.onclose = () => {
          console.log("WebSocket connection closed");
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        return () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch (error) {
        console.error("Error fetching WebSocket URL:", error);
      }
    };

    fetchWebSocketUrl();
  }, [params.id, username]);

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
