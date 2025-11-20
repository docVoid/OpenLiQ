"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getConnection,
  startConnection,
  getQuizzes,
  startGame,
} from "../../../lib/signalr";

interface Quiz {
  id: string;
  title: string;
  description: string;
}

export default function HostCreatePage() {
  const router = useRouter();
  const [pin, setPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<
    Array<{ connectionId: string; nickname: string }>
  >([]);
  const [quizList, setQuizList] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onLobbyCreated = (generatedPin: string) => {
      console.log("LobbyCreated", generatedPin);
      setPin(generatedPin);
      sessionStorage.setItem("openliq_game_pin", generatedPin);
    };

    const onPlayerJoined = (payload: any) => {
      console.log("PlayerJoined", payload);
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

    const onGameStarted = (dto: any) => {
      console.log("GameStarted", dto);
      setStarted(true);
      router.push("/host/game");
    };

    (async () => {
      try {
        setLoading(true);
        const conn = await startConnection();
        console.log("Connection established");
        conn.on("LobbyCreated", onLobbyCreated);
        conn.on("PlayerJoined", onPlayerJoined);
        conn.on("PlayerListUpdated", onPlayerListUpdated);
        conn.on("GameStarted", onGameStarted);
        await conn.invoke("CreateLobby");
        console.log("Lobby created");
        const quizzes = await getQuizzes();
        console.log("Quizzes received:", quizzes);
        setQuizList(quizzes);
        if (quizzes.length > 0) {
          setSelectedQuizId(quizzes[0].id);
        }
      } catch (err) {
        console.error("Failed to initialize lobby:", err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      const conn = getConnection();
      if (conn) {
        conn.off("LobbyCreated", onLobbyCreated);
        conn.off("PlayerJoined", onPlayerJoined);
        conn.off("PlayerListUpdated", onPlayerListUpdated);
        conn.off("GameStarted", onGameStarted);
      }
    };
  }, [router]);
  }, [router]);

  const handleStart = async () => {
    if (!pin || !selectedQuizId) return;
    try {
      const conn = getConnection();
      if (conn) {
        await conn.invoke("StartGame", pin, selectedQuizId);
      }
    } catch (err) {
      console.error("Failed to start game", err);
    }
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
            {loading ? "..." : pin ?? "-----"}
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

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Select Quiz</h2>
          {loading || quizList.length === 0 ? (
            <p className="text-gray-500">
              {loading ? "Loading quizzes..." : "No quizzes available"}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizList.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => setSelectedQuizId(quiz.id)}
                  className={`p-4 rounded-lg cursor-pointer border-2 transition ${
                    selectedQuizId === quiz.id
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-black">
                    {quiz.title}
                  </h3>
                  <p className="text-sm text-gray-600">{quiz.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={handleStart}
            disabled={!selectedQuizId || loading}
            className="px-6 py-3 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#FFD100" }}
          >
            Start Game
          </button>
        </div>
      </div>
    </main>
  );
}
