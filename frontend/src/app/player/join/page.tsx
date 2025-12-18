"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function PlayerJoinPage() {
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // register handler once on mount
    const conn = getConnection();

    const onJoinResult = (success: boolean, message: string) => {
      console.log("JoinResult", success, message);
      if (success) {
        // navigation only; storage already written before invoke
        router.push("/player/lobby");
      } else {
        setError(message);
      }
    };

    conn.on("JoinResult", onJoinResult);
    return () => {
      conn.off("JoinResult", onJoinResult);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const conn = getConnection();
    try {
      // store values so the lobby page can read them immediately after navigation
      sessionStorage.setItem("openliq_game_pin", pin);
      sessionStorage.setItem("openliq_nickname", nickname);

      await startConnection();
      await conn.invoke("JoinLobby", pin, nickname);
    } catch (err) {
      console.error(err);
      setError("Failed to join");
    }
  };

  return (
    <main className="min-h-screen p-8 bg-white flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-black">Join Game</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Nickname</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 rounded font-semibold"
              style={{ backgroundColor: "#000", color: "#FFD100" }}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
