"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";
import { v4 as uuid } from "uuid";

const page = () => {

  const router = useRouter();
  const [username, setUsername] = useState("");

  const joinRoom = ()=>{
    localStorage.setItem("username", username);
    router.push(`/room/1`);
  }

  return (
    <div>
      <input type="text"
      value={username}
      placeholder="Enter your name"
      onChange={(e)=> setUsername(e.target.value)}
      />
      <button onClick={joinRoom}>join room</button>
    </div>
  );
}

export default page;