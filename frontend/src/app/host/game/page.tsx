"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function HostGamePage({ searchParams }: any) {
  const router = useRouter();
  const pin =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_game_pin")
      : null;
  const [question, setQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [playersCount, setPlayersCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finalScores, setFinalScores] = useState<
    Array<{ nickname: string; score: number }>
  >([]);

  useEffect(() => {
    const conn = getConnection();
    startConnection();

    const onQuestionStarted = (dto: any) => {
      setQuestion(dto);
      setTimeLeft(dto.timeSeconds ?? 20);
      setAnsweredCount(0);
    };

    const onGameEnded = (scores: any[]) => {
      setFinalScores(
        scores.map((s: any) => ({ nickname: s.nickname, score: s.score }))
      );
      setQuestion(null);
      setTimeLeft(0);
    };

    const onPlayerAnswered = (payload: any) => {
      setAnsweredCount((c) => c + 1);
    };

    const onPlayerListUpdated = (list: any[]) => {
      setPlayersCount(list.length);
    };

    conn.on("QuestionStarted", onQuestionStarted);
    conn.on("GameEnded", onGameEnded);
    conn.on("PlayerAnswered", onPlayerAnswered);
    conn.on("PlayerListUpdated", onPlayerListUpdated);

    return () => {
      conn.off("QuestionStarted", onQuestionStarted);
      conn.off("GameEnded", onGameEnded);
      conn.off("PlayerAnswered", onPlayerAnswered);
      conn.off("PlayerListUpdated", onPlayerListUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(
      () => setTimeLeft((t) => t - 1),
      1000
    );
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const handleNext = async () => {
    if (!pin) return;
    const conn = getConnection();
    await conn.invoke("NextQuestion", pin);
  };

  const handleEnd = async () => {
    if (!pin) return;
    const conn = getConnection();
    await conn.invoke("EndGame", pin);
    sessionStorage.removeItem("openliq_game_pin");
    router.push("/");
  };

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Host Game</h1>
        {question ? (
          <div>
            <h2 className="font-semibold">Frage {question.index + 1}</h2>
            <p className="mt-2 mb-4">{question.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((o: any, i: number) => (
                <div key={i} className="p-2 border rounded">
                  {o}
                </div>
              ))}
            </div>
            <div className="mt-4">Zeit verbleibend: {timeLeft}s</div>
            <div className="mt-2 text-sm text-gray-600">
              Antworten: {answeredCount} / {playersCount}
            </div>
          </div>
        ) : (
          <div>Warte auf Frage...</div>
        )}

        <div className="mt-6 space-x-2">
          <button
            onClick={handleNext}
            disabled={timeLeft > 0 && answeredCount < playersCount}
            className="px-4 py-2 rounded bg-black text-yellow-400 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={handleEnd}
            className="px-4 py-2 rounded bg-red-500 text-white"
          >
            End Game
          </button>
        </div>

        {finalScores.length > 0 && (
          <div className="mt-6">
            <h3 className="text-2xl font-semibold">Final Scores</h3>
            <ul className="mt-4">
              {finalScores.map((s) => (
                <li key={s.nickname}>
                  {s.nickname}: {s.score}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <button
                onClick={() => {
                  sessionStorage.removeItem("openliq_game_pin");
                  router.push("/");
                }}
                className="px-4 py-2 rounded bg-black text-yellow-400"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
