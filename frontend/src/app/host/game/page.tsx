"use client";

import { useEffect, useRef, useState } from "react";
import {
  getConnection,
  startConnection,
  nextQuestion,
} from "../../../lib/signalr";

type PayloadQuestion = {
  Text: string;
  TimeLimit: number;
  Answers: string[];
  QuestionIndex?: number;
};

export default function HostGamePage() {
  const [question, setQuestion] = useState<PayloadQuestion | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "question" | "reveal" | "gameover"
  >("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [counts, setCounts] = useState<number[]>([]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ Nickname: string; Score: number }>
  >([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const conn = await startConnection();

      const onQuestionStarted = (payload: any) => {
        setQuestion({
          Text: payload.Text,
          TimeLimit: payload.TimeLimit ?? 10,
          Answers: payload.Answers,
          QuestionIndex: payload.QuestionIndex ?? 0,
        });
        setPhase("question");
        setTimeLeft(payload.TimeLimit ?? 10);
        setCounts([]);
        setCorrectIndex(null);
        setQuestionIndex(payload.QuestionIndex ?? 0);

        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              if (timerRef.current) window.clearInterval(timerRef.current);
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      };

      const onRoundResults = (payload: any) => {
        setCounts(payload.Counts ?? []);
        setCorrectIndex(payload.CorrectIndex ?? null);
        setLeaderboard(payload.Leaderboard ?? []);
        setPhase("reveal");
        if (timerRef.current) window.clearInterval(timerRef.current);
      };

      const onGameOver = (top: any[]) => {
        setPhase("gameover");
        setLeaderboard(top ?? []);
      };

      conn.on("QuestionStarted", onQuestionStarted);
      conn.on("RoundResults", onRoundResults);
      conn.on("GameOver", onGameOver);

      cleanup = () => {
        conn.off("QuestionStarted", onQuestionStarted);
        conn.off("RoundResults", onRoundResults);
        conn.off("GameOver", onGameOver);
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleNext = async () => {
    try {
      await nextQuestion(sessionStorage.getItem("openliq_game_pin") ?? "");
    } catch (err) {
      console.error("nextQuestion error:", err);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Host — Game</h1>
        <p className="text-gray-500 mb-6">Question {questionIndex + 1}</p>

        {phase === "idle" && (
          <div className="text-center">
            <p className="mb-4">Press &quot;Next Question&quot; to begin.</p>
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-md font-semibold"
              style={{ backgroundColor: "#FFD100" }}
            >
              Next Question
            </button>
          </div>
        )}

        {phase === "question" && question && (
          <div>
            <div className="bg-gray-100 p-6 rounded mb-4">
              <h2 className="text-3xl font-bold mb-4">{question.Text}</h2>
              <div className="grid grid-cols-2 gap-4">
                {question.Answers.map((a, i) => (
                  <div key={i} className="p-4 bg-white rounded shadow">
                    <span className="font-medium text-lg">
                      {String.fromCharCode(65 + i)}.
                    </span>{" "}
                    {a}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold">⏱ {timeLeft}s</div>
              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-md font-semibold text-black"
                style={{ backgroundColor: "#FFD100" }}
              >
                Reveal Now
              </button>
            </div>
          </div>
        )}

        {phase === "reveal" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {counts.map((c, i) => (
                <div
                  key={i}
                  className={`p-4 rounded border-2 ${
                    i === correctIndex
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-lg">
                    {String.fromCharCode(65 + i)}.
                  </div>
                  <div className="text-2xl font-bold mt-2">{c} votes</div>
                  {i === correctIndex && (
                    <div className="text-sm text-green-600 font-semibold mt-2">
                      ✓ Correct
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded mb-6">
              <h3 className="text-xl font-semibold mb-3">Live Leaderboard</h3>
              <ol className="space-y-2">
                {leaderboard.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center p-2 bg-white rounded"
                  >
                    <span className="font-semibold">
                      {idx + 1}. {p.Nickname}
                    </span>
                    <span className="text-lg font-bold">{p.Score} pts</span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-md font-semibold text-black text-lg"
              style={{ backgroundColor: "#FFD100" }}
            >
              Next Question
            </button>
          </div>
        )}

        {phase === "gameover" && (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-8">🎉 Game Over!</h2>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-6">Final Podium</h3>
              {leaderboard.slice(0, 3).map((p, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between mb-4 p-4 bg-white rounded"
                  >
                    <span className="text-3xl">{medals[i]}</span>
                    <span className="text-xl font-semibold">{p.Nickname}</span>
                    <span className="text-2xl font-bold">{p.Score} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
