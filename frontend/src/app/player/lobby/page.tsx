"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getConnection, startConnection } from "../../../lib/signalr";

export default function PlayerLobbyPage() {
  const nickname =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_nickname")
      : null;
  const pin =
    typeof window !== "undefined"
      ? sessionStorage.getItem("openliq_game_pin")
      : null;

  const [question, setQuestion] = useState<null | {
    text: string;
    options: string[];
    index: number;
    timeSeconds: number;
  }>(null);
  const [lastQuestionIndex, setLastQuestionIndex] = useState<number | null>(
    null
  );
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const [finalScores, setFinalScores] = useState<
    Array<{ nickname: string; score: number }>
  >([]);
  const router = useRouter();

  useEffect(() => {
    const conn = getConnection();
    startConnection();

    const onQuestionStarted = (dto: any) => {
      setQuestion({
        text: dto.text,
        options: dto.options,
        index: dto.index,
        timeSeconds: dto.timeSeconds,
      });
      setSelected(null);
      setTimeLeft(dto.timeSeconds ?? 20);
      setLastQuestionIndex(dto.index ?? null);
    };

    const onGameEnded = (scores: any[]) => {
      setFinalScores(
        scores.map((s: any) => ({ nickname: s.nickname, score: s.score }))
      );
      setQuestion(null);
      setTimeLeft(0);
    };

    conn.on("QuestionStarted", onQuestionStarted);
    conn.on("GameEnded", onGameEnded);

    return () => {
      conn.off("QuestionStarted", onQuestionStarted);
      conn.off("GameEnded", onGameEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [timeLeft]);

  useEffect(() => {
    // when time runs out, disable answering
    if (timeLeft === 0 && question) {
      setSelected((s) => s ?? -1);
    }
  }, [timeLeft, question]);

  const handleSelect = async (idx: number) => {
    if (!pin || !question) return;
    if (selected !== null && selected !== -1) return; // already answered
    setSelected(idx);
    const conn = getConnection();
    try {
      await conn.invoke("SubmitAnswer", pin, idx);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-white flex items-center justify-center">
      <div className="text-center w-full max-w-2xl">
        {!question && finalScores.length === 0 && (
          <>
            <h1 className="text-3xl font-bold mb-4">You are in!</h1>
            <p className="mb-4">Waiting for host to start...</p>

            <div className="flex items-center justify-center">
              <div
                className="animate-spin rounded-full h-12 w-12 border-t-4"
                style={{ borderColor: "#FFD100", borderTopColor: "#000" }}
              />
            </div>

            <p className="mt-6 text-sm text-gray-500">
              {nickname ? `Player: ${nickname}` : ""}{" "}
              {pin ? ` · PIN: ${pin}` : ""}
            </p>
          </>
        )}
        {/* waiting for next question if previous question finished */}
        {!question &&
          lastQuestionIndex !== null &&
          timeLeft === 0 &&
          finalScores.length === 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold">Warte auf nächste Frage</h2>
              <p className="text-sm text-gray-500">
                Der Host kann weiterklicken, um die nächste Frage zu starten.
              </p>
            </div>
          )}

        {question && (
          <div>
            <h2 className="text-xl font-semibold">
              Frage {question.index + 1}
            </h2>
            <p className="mt-2 mb-4">{question.text}</p>
            <div className="grid grid-cols-2 gap-3">
              {question.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null && selected !== -1}
                  className={`p-3 border rounded ${
                    selected === i ? "bg-green-100" : "bg-white"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-500">Zeit: {timeLeft}s</div>
          </div>
        )}
        {finalScores.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold">Ergebnis</h2>
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
                  sessionStorage.removeItem("openliq_nickname");
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
