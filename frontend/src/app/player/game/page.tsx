"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function PlayerGamePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    const onGameStarted = () => {
      setStatus("Game Started!");
    };

    (async () => {
      const conn = await startConnection();
      conn.on("GameStarted", onGameStarted);
      console.log("Player game page loaded, connection state:", conn.state);
    })();

    return () => {
      const conn = getConnection();
      if (conn) conn.off("GameStarted", onGameStarted);
    };
  }, []);

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 text-black">Game is Running</h1>
        <p className="text-xl text-gray-700">Player View</p>
        <p className="mt-4 text-lg text-gray-600">{status}</p>
      </div>
    </main>
  );
}
