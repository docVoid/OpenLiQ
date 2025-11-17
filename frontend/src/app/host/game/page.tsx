"use client";

import { useEffect } from "react";
import { getConnection } from "../../../lib/signalr";

export default function HostGamePage() {
  useEffect(() => {
    const conn = getConnection();
    console.log("Host game page loaded, connection state:", conn.state);
  }, []);

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 text-black">Game is Running</h1>
        <p className="text-xl text-gray-700">Host View</p>
      </div>
    </main>
  );
}
