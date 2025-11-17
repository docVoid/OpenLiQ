"use client";

import { useEffect, useState } from "react";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function HostCreatePage() {
  const [pin, setPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<
    Array<{ connectionId: string; nickname: string }>
  >([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const conn = getConnection();
    startConnection();

    const onLobbyCreated = (generatedPin: string) => {
      console.log("LobbyCreated", generatedPin);
      setPin(generatedPin);
    };

    const onPlayerJoined = (payload: any) => {
      console.log("PlayerJoined", payload);
      // payload has Nickname and ConnectionId
    };

    const onPlayerListUpdated = (list: any[]) => {
      console.log("PlayerListUpdated", list);
      setPlayers(
        list.map((p) => ({
          connectionId: p.connectionId ?? p.ConnectionId,
          nickname: p.nickname ?? p.Nickname,
        }))
      );
    };

    conn.on("LobbyCreated", onLobbyCreated);
    conn.on("PlayerJoined", onPlayerJoined);
    conn.on("PlayerListUpdated", onPlayerListUpdated);

    // create the lobby
    conn.invoke("CreateLobby").catch((err) => console.error(err));

    return () => {
      conn.off("LobbyCreated", onLobbyCreated);
      conn.off("PlayerJoined", onPlayerJoined);
      conn.off("PlayerListUpdated", onPlayerListUpdated);
    };
  }, []);

  const handleStart = async () => {
    if (!pin) return;
    const conn = getConnection();
    await conn.invoke("StartGame", pin);
    setStarted(true);
  };

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 text-black">Host Lobby</h1>
        <p className="mb-6 text-gray-700">Share this PIN with your players:</p>

        <div className="mb-8">
          <div
            className="inline-block px-8 py-6 rounded-md text-5xl font-extrabold"
            style={{ backgroundColor: "#000", color: "#FFD100" }}
          >
            {pin ?? "-----"}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Players</h2>
          <ul className="space-y-2">
            {players.length === 0 && (
              <li className="text-gray-500">No players yet</li>
            )}
            {players.map((p) => (
              <li
                key={p.connectionId}
                className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded"
              >
                <span className="font-medium">{p.nickname}</span>
                <span className="text-xs text-gray-500">
                  {p.connectionId.slice(0, 6)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <button
            onClick={handleStart}
            className="px-6 py-3 rounded-md font-semibold"
            style={{ backgroundColor: "#FFD100" }}
          >
            Start Game
          </button>
        </div>
      </div>
    </main>
  );
}
