"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

type Question = {
  Text: string;
  TimeLimitSeconds: number;
  Answers: string[];
};

export default function HostGamePage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<
    (Question & { CorrectAnswerIndex?: number }) | null
  >(null);
  const [gameState, setGameState] = useState<
    "waiting" | "question" | "result" | "gameover"
  >("waiting");
  const [answersCount, setAnswersCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ Nickname: string; Score: number }>
  >([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const pin =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_game_pin")
      : null;

  useEffect(() => {
    const onNewQuestion = (payload: any) => {
      // payload for host: { questionDto, CorrectAnswerIndex }
      const q = payload?.questionDto ?? payload;
      const correctIndex = payload?.CorrectAnswerIndex ?? undefined;

      setCurrentQuestion({
        Text: q.Text,
        TimeLimitSeconds: q.TimeLimitSeconds,
        Answers: q.Answers,
        CorrectAnswerIndex: correctIndex,
      });
      setAnswersCount(0);
      setGameState("question");
      setTimeLeft(q.TimeLimitSeconds ?? 20);
    };

    const onAnswerCountUpdated = (data: any) => {
      setAnswersCount(data?.Answered ?? 0);
    };

    const onShowRoundResults = (results: any) => {
      // results: { CorrectCount, TotalPlayers, CorrectAnswerIndex }
      setGameState("result");
      setCurrentQuestion((cq) =>
        cq ? { ...cq, CorrectAnswerIndex: results.CorrectAnswerIndex } : cq
      );
    };

    const onGameOver = (payload: any) => {
      // payload: { Entries: [{ Nickname, Score }, ...] }
      setLeaderboard(payload?.Entries ?? []);
      setGameState("gameover");
      setTimeLeft(0);
    };

    (async () => {
      const conn = await startConnection();
      conn.on("NewQuestion", onNewQuestion);
      conn.on("AnswerCountUpdated", onAnswerCountUpdated);
      conn.on("ShowRoundResults", onShowRoundResults);
      conn.on("GameOver", onGameOver);
    })();

    return () => {
      const conn = getConnection();
      if (conn) {
        conn.off("NewQuestion", onNewQuestion);
        conn.off("AnswerCountUpdated", onAnswerCountUpdated);
        conn.off("ShowRoundResults", onShowRoundResults);
        conn.off("GameOver", onGameOver);
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (gameState === "question" && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            // time up
            if (pin) {
              const conn = getConnection();
              if (conn) conn.invoke("ShowResults", pin).catch(() => {});
            }
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, timeLeft, pin]);

  const handleStartFirst = async () => {
    if (!pin) return;
    const conn = getConnection();
    if (!conn) return;
    try {
      await conn.invoke("RequestNextQuestion", pin);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowResults = async () => {
    if (!pin) return;
    const conn = getConnection();
    if (!conn) return;
    try {
      await conn.invoke("ShowResults", pin);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextQuestion = async () => {
    if (!pin) return;
    const conn = getConnection();
    if (!conn) return;
    try {
      await conn.invoke("RequestNextQuestion", pin);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackToLobby = () => {
    router.push("/host/create");
  };

  const answerColors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-yellow-400",
    "bg-green-500",
  ];

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Host — Game</h1>
          <div className="text-sm text-gray-600">Answers: {answersCount}</div>
        </div>

        {gameState === "waiting" && (
          <div className="text-center py-20">
            <button
              onClick={handleStartFirst}
              className="px-6 py-3 rounded-md font-semibold"
              style={{ backgroundColor: "#FFD100" }}
            >
              Start First Question
            </button>
          </div>
        )}

        {gameState === "question" && currentQuestion && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-black">
                {currentQuestion.Text}
              </h2>
            </div>

            <div className="mb-4">
              <div className="w-full h-4 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-4 rounded"
                  style={{
                    width: `${
                      (timeLeft / (currentQuestion.TimeLimitSeconds || 20)) *
                      100
                    }%`,
                    backgroundColor: "#FFD100",
                  }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Time left: {timeLeft}s
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentQuestion.Answers.map((ans, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg text-white font-semibold text-left cursor-default ${answerColors[idx]}`}
                >
                  {ans}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Answers: {answersCount}
              </div>
              <button
                onClick={handleShowResults}
                className="px-4 py-2 rounded-md font-semibold"
                style={{ backgroundColor: "#FFD100" }}
              >
                Show Results
              </button>
            </div>
          </div>
        )}

        {gameState === "result" && currentQuestion && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-black">
                {currentQuestion.Text}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentQuestion.Answers.map((ans, idx) => {
                const isCorrect = idx === currentQuestion.CorrectAnswerIndex;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg text-white font-semibold text-left ${
                      isCorrect ? "ring-4 ring-yellow-300" : "opacity-60"
                    } ${answerColors[idx]}`}
                  >
                    {ans}
                    {isCorrect && <div className="text-sm mt-2">Correct</div>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Answers: {answersCount}
              </div>
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 rounded-md font-semibold"
                style={{ backgroundColor: "#FFD100" }}
              >
                Next Question
              </button>
            </div>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-6">Game Over</h2>
            <div className="max-w-md mx-auto grid grid-cols-1 gap-4">
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <div key={idx} className="p-4 rounded shadow bg-gray-50">
                  <div className="text-lg font-semibold">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}{" "}
                    {entry.Nickname}
                  </div>
                  <div className="text-sm text-gray-600">{entry.Score} pts</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={handleBackToLobby}
                className="px-6 py-3 rounded-md font-semibold"
                style={{ backgroundColor: "#000", color: "#FFD100" }}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
