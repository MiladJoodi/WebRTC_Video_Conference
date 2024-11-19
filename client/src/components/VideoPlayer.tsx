"use client"

import { useEffect, useRef } from "react";


const VideoPlayer = ({stream, muted}:any) => {

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(()=>{
        if(videoRef.current){
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      className="h-full max-h-screen object-cover rounded-lg"
      autoPlay
    ></video>
  );
};

export default VideoPlayer;
