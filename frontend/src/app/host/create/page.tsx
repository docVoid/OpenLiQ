"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function HostCreatePage() {
  const [pin, setPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<
    Array<{ connectionId: string; nickname: string }>
  >([]);
  const [started, setStarted] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    text: string;
    options: string[];
    index: number;
    timeSeconds: number;
  } | null>(null);
  const [scores, setScores] = useState<
    Array<{ nickname: string; score: number }>
  >([]);
  const router = useRouter();

  useEffect(() => {
    const conn = getConnection();
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

    const onQuestionStarted = (dto: any) => {
      console.log("QuestionStarted", dto);
      setCurrentQuestion({
        text: dto.text,
        options: dto.options,
        index: dto.index,
        timeSeconds: dto.timeSeconds,
      });
    };

    const onGameEnded = (finalScores: any[]) => {
      console.log("GameEnded", finalScores);
      setScores(
        finalScores.map((s) => ({ nickname: s.nickname, score: s.score }))
      );
      setCurrentQuestion(null);
      setStarted(false);
    };

    conn.on("LobbyCreated", onLobbyCreated);
    conn.on("PlayerJoined", onPlayerJoined);
    conn.on("PlayerListUpdated", onPlayerListUpdated);
    conn.on("QuestionStarted", onQuestionStarted);
    conn.on("GameEnded", onGameEnded);

    // start connection and ensure it's running before invoking CreateLobby
    (async () => {
      try {
        await startConnection();
        // Attempt to create lobby; if it fails once, retry once after a short delay
        try {
          await conn.invoke("CreateLobby");
        } catch (err) {
          console.warn("CreateLobby failed, retrying", err);
          setTimeout(async () => {
            try {
              await conn.invoke("CreateLobby");
            } catch (err2) {
              console.error("CreateLobby retry failed", err2);
            }
          }, 300);
        }
      } catch (startErr) {
        console.error("SignalR start failed", startErr);
      }
    })();

    return () => {
      conn.off("LobbyCreated", onLobbyCreated);
      conn.off("PlayerJoined", onPlayerJoined);
      conn.off("PlayerListUpdated", onPlayerListUpdated);
      conn.off("QuestionStarted", onQuestionStarted);
      conn.off("GameEnded", onGameEnded);
    };
  }, []);

  const handleStart = async () => {
    if (!pin || !selectedQuiz) return;
    const conn = getConnection();
    // select the quiz first
    await conn.invoke("SelectGame", pin, selectedQuiz);
    // advance to first question
    await conn.invoke("NextQuestion", pin);
    // store pin locally for host game page and navigate
    sessionStorage.setItem("openliq_game_pin", pin);
    router.push("/host/game");
  };

  const handleSelectQuiz = (id: string) => {
    setSelectedQuiz(id);
  };

  const handleNext = async () => {
    if (!pin) return;
    const conn = getConnection();
    await conn.invoke("NextQuestion", pin);
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

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Select Game</h2>
          <div className="space-x-2">
            <button
              onClick={() => handleSelectQuiz("liebherr")}
              className={`px-4 py-2 rounded ${
                selectedQuiz === "liebherr"
                  ? "bg-black text-yellow-400"
                  : "bg-gray-200"
              }`}
            >
              Liebherr-Quiz
            </button>
            <button
              onClick={() => handleSelectQuiz("it")}
              className={`px-4 py-2 rounded ${
                selectedQuiz === "it"
                  ? "bg-black text-yellow-400"
                  : "bg-gray-200"
              }`}
            >
              IT-Quiz
            </button>
          </div>
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

        {currentQuestion && (
          <div className="mt-8 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Frage {currentQuestion.index + 1}</h3>
            <p className="mt-2 mb-4">{currentQuestion.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((o, i) => (
                <div key={i} className="p-2 bg-white rounded border">
                  {o}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded bg-black text-yellow-400"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {scores.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Final Scores</h3>
            <ul>
              {scores.map((s) => (
                <li key={s.nickname}>
                  {s.nickname}: {s.score}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
