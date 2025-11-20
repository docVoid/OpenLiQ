"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function PlayerLobbyPage() {
  const router = useRouter();
  const nickname =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_nickname")
      : null;
  const pin =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_game_pin")
      : null;

  useEffect(() => {
    const onGameStarted = () => {
      console.log("GameStarted event received");
      router.push("/player/game");
    };

    (async () => {
      const conn = await startConnection();
      conn.on("GameStarted", onGameStarted);
    })();

    return () => {
      const conn = getConnection();
      if (conn) conn.off("GameStarted", onGameStarted);
    };
  }, [router]);

  return (
    <main className="min-h-screen p-8 bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">You are in!</h1>
        <p className="mb-4">Waiting for host to start...</p>

        <div className="flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-4"
            style={{ borderColor: "#FFD100", borderTopColor: "#000" }}
          />
        </div>

        <p className="mt-6 text-sm text-gray-500">
          {nickname ? `Player: ${nickname}` : ""} {pin ? ` · PIN: ${pin}` : ""}
        </p>
      </div>
    </main>
  );
}
