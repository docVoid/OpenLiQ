# OpenLiQ Frontend Integration Guide - Gameplay Loop

## Quick Reference: Hub Method Calls & Events

### For Host Game Page (`/host/game/page.tsx`)

#### 1. Load First Question When Game Starts

```typescript
// In useEffect after GameStarted event
import { getConnection, startConnection } from "@/lib/signalr";

useEffect(() => {
  const conn = getConnection();
  conn.on("NewQuestion", (questionData) => {
    // questionData = { Text, TimeLimitSeconds, Answers[], CorrectAnswerIndex }
    console.log("Correct answer is at index:", questionData.CorrectAnswerIndex);
    setCurrentQuestion(questionData);
    startTimer(questionData.TimeLimitSeconds);
  });
}, []);
```

#### 2. Request Next Question (Host Button)

```typescript
const handleNextQuestion = async () => {
  const conn = getConnection();
  await conn.invoke("RequestNextQuestion", pin);
  // Hub will broadcast NewQuestion or GameOver event
};
```

#### 3. Listen for Answer Count Updates (Real-time)

```typescript
conn.on("AnswerCountUpdated", (data) => {
  // data = { Answered: 15, Total: 20 }
  setAnswerCounter(`${data.Answered}/${data.Total} answered`);
});
```

#### 4. Show Results After Time Expires

```typescript
const handleShowResults = async () => {
  const conn = getConnection();
  await conn.invoke("ShowResults", pin);
  // Hub will broadcast ShowRoundResults event
};
```

#### 5. Listen for Round Results

```typescript
conn.on("ShowRoundResults", (resultsData) => {
  // resultsData = { CorrectCount, TotalPlayers, CorrectAnswerIndex }
  setResults({
    percentCorrect: (resultsData.CorrectCount / resultsData.TotalPlayers) * 100,
    correctAnswer: resultsData.CorrectAnswerIndex,
  });
  // Show bar chart
});
```

#### 6. Listen for Game Over

```typescript
conn.on("GameOver", (leaderboardData) => {
  // leaderboardData = { Entries: [{ Nickname, Score }, ...] }
  // Entries are already sorted by score (descending)
  setLeaderboard(leaderboardData.Entries);
  router.push("/host/results"); // Navigate to results page
});
```

---

### For Player Game Page (`/player/game/page.tsx`)

#### 1. Listen for Questions

```typescript
conn.on("NewQuestion", (questionData) => {
  // questionData = { Text, TimeLimitSeconds, Answers[] }
  // NOTE: CorrectAnswerIndex is NOT included for players
  setCurrentQuestion(questionData);
  startTimer(questionData.TimeLimitSeconds);
});
```

#### 2. Submit Answer

```typescript
const handleAnswerClick = async (answerIndex: number) => {
  const conn = getConnection();
  await conn.invoke("SubmitAnswer", pin, answerIndex);
  // Hub will broadcast AnswerSubmitted event back to this player
};
```

#### 3. Listen for Answer Result (Immediate Feedback)

```typescript
conn.on("AnswerSubmitted", (resultData) => {
  // resultData = { IsCorrect, PointsAwarded, Feedback }
  // Example: { IsCorrect: true, PointsAwarded: 1000, Feedback: "+1000 points!" }
  setFeedback(resultData.Feedback);
  setAnswerCorrect(resultData.IsCorrect); // Green/red indicator
  setPoints((prev) => prev + resultData.PointsAwarded); // Update score
});
```

#### 4. Listen for Round Results (Bar Chart/Stats)

```typescript
conn.on("ShowRoundResults", (resultsData) => {
  // resultsData = { CorrectCount, TotalPlayers, CorrectAnswerIndex }
  setRoundStats({
    correctCount: resultsData.CorrectCount,
    totalPlayers: resultsData.TotalPlayers,
    correctAnswerIndex: resultsData.CorrectAnswerIndex,
  });
  // Highlight correct answer even if player answered wrong
});
```

#### 5. Listen for Game Over

```typescript
conn.on("GameOver", (leaderboardData) => {
  // leaderboardData = { Entries: [{ Nickname, Score }, ...] }
  setLeaderboard(leaderboardData.Entries);
  // Show final leaderboard, maybe player's rank
});
```

---

## Host Game Flow (Pseudocode)

```typescript
export default function HostGamePage() {
  const [pin, setPin] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answered, setAnswered] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const conn = getConnection();
    startConnection();

    // Get PIN from session storage or route params
    const storedPin = sessionStorage.getItem("openliq_game_pin");
    setPin(storedPin);

    conn.on("NewQuestion", (q) => {
      setCurrentQuestion(q);
      setTimeLeft(q.TimeLimitSeconds);
      setAnswered(0);
      setResults(null);
      startTimer(q.TimeLimitSeconds);
    });

    conn.on("AnswerCountUpdated", (data) => {
      setAnswered(data.Answered);
      setTotal(data.Total);
    });

    conn.on("ShowRoundResults", (data) => {
      setResults(data);
      // Stop accepting submissions, display bar chart
    });

    conn.on("GameOver", (data) => {
      setLeaderboard(data.Entries);
      // Show final results screen
      router.push("/host/results");
    });

    return () => {
      // Cleanup listeners
    };
  }, []);

  const handleLoadFirstQuestion = () => {
    conn.invoke("RequestNextQuestion", pin);
  };

  const handleNextQuestion = () => {
    conn.invoke("RequestNextQuestion", pin);
  };

  const handleShowResults = () => {
    conn.invoke("ShowResults", pin);
  };

  return (
    <div>
      {!currentQuestion && (
        <button onClick={handleLoadFirstQuestion}>Load First Question</button>
      )}

      {currentQuestion && (
        <>
          <h2>{currentQuestion.Text}</h2>
          <p>
            Time: {timeLeft}s | Answered: {answered}/{total}
          </p>

          <div>
            {currentQuestion.Answers.map((ans, idx) => (
              <button key={idx} disabled>
                {ans}
                {results && idx === currentQuestion.CorrectAnswerIndex && (
                  <span>✓ Correct</span>
                )}
              </button>
            ))}
          </div>

          {!results && (
            <button onClick={handleShowResults}>Show Results</button>
          )}

          {results && (
            <>
              <div>
                {results.CorrectCount}/{results.TotalPlayers} correct
              </div>
              <button onClick={handleNextQuestion}>Next Question</button>
            </>
          )}
        </>
      )}

      {leaderboard.length > 0 && (
        <div>
          <h2>Final Leaderboard</h2>
          {leaderboard.map((entry, idx) => (
            <div key={idx}>
              #{idx + 1} {entry.Nickname}: {entry.Score} pts
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Player Game Flow (Pseudocode)

```typescript
export default function PlayerGamePage() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const conn = getConnection();
    startConnection();

    const pin = sessionStorage.getItem("openliq_game_pin");

    conn.on("NewQuestion", (q) => {
      setCurrentQuestion(q);
      setAnswered(false);
      setFeedback("");
      setResults(null);
    });

    conn.on("AnswerSubmitted", (data) => {
      setFeedback(data.Feedback);
      setIsCorrect(data.IsCorrect);
      setScore((prev) => prev + data.PointsAwarded);
      setAnswered(true);
    });

    conn.on("ShowRoundResults", (data) => {
      setResults(data);
      // Show bar chart with answer distribution
    });

    conn.on("GameOver", (data) => {
      setLeaderboard(data.Entries);
      // Show final results with ranking
      router.push("/player/results");
    });

    return () => {
      // Cleanup listeners
    };
  }, []);

  const handleAnswer = (answerIndex) => {
    if (answered) return; // Already answered this question

    const conn = getConnection();
    const pin = sessionStorage.getItem("openliq_game_pin");
    conn.invoke("SubmitAnswer", pin, answerIndex);
  };

  return (
    <div>
      {currentQuestion && (
        <>
          <h2>{currentQuestion.Text}</h2>
          <div>
            {currentQuestion.Answers.map((ans, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                className={
                  answered && results
                    ? idx === results.CorrectAnswerIndex
                      ? "bg-green-500"
                      : "bg-gray-300"
                    : ""
                }
              >
                {ans}
              </button>
            ))}
          </div>

          {feedback && (
            <div className={isCorrect ? "text-green-600" : "text-red-600"}>
              {feedback}
            </div>
          )}

          {results && (
            <div>
              {results.CorrectCount}/{results.TotalPlayers} players correct
            </div>
          )}
        </>
      )}

      <div>Your Score: {score} pts</div>

      {leaderboard.length > 0 && (
        <div>
          <h2>Final Standings</h2>
          {leaderboard.map((entry, idx) => (
            <div key={idx}>
              #{idx + 1} {entry.Nickname}: {entry.Score} pts
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Status Codes Reference

When `SubmitAnswer` is called, player receives `AnswerSubmitted` event with:

```typescript
type AnswerResultDto = {
  IsCorrect: boolean;
  PointsAwarded: number;
  Feedback: string;
};
```

**Example Responses:**

| Scenario         | IsCorrect | PointsAwarded | Feedback                  |
| ---------------- | --------- | ------------- | ------------------------- |
| Correct answer   | `true`    | `1000`        | `"+1000 points!"`         |
| Wrong answer     | `false`   | `0`           | `"Incorrect!"`            |
| Already answered | `false`   | `0`           | `"You already answered!"` |

---

## Common Patterns

### Pattern 1: Disable Answers After Submit

```typescript
const [answered, setAnswered] = useState(false);

return (
  <button onClick={() => handleAnswer(idx)} disabled={answered}>
    {answer}
  </button>
);
```

### Pattern 2: Highlight Correct Answer After Results

```typescript
const [results, setResults] = useState(null);

return (
  <button
    className={
      results && idx === results.CorrectAnswerIndex ? "bg-green-500" : ""
    }
  >
    {answer}
  </button>
);
```

### Pattern 3: Countdown Timer

```typescript
useEffect(() => {
  if (timeLeft <= 0) return;

  const interval = setInterval(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearInterval(interval);
}, [timeLeft]);
```

### Pattern 4: Store PIN in Session Storage on Join

```typescript
// In player/join/page.tsx
sessionStorage.setItem("openliq_game_pin", pin);

// In player/game/page.tsx
const pin = sessionStorage.getItem("openliq_game_pin");
```

---

## Error Handling

```typescript
conn.on("RequestError", (message) => {
  console.error("Request error:", message);
  // "Only host can request next question"
  // "Only host can show results"
});
```

---

## Testing with Console Logs

```typescript
// In useEffect setup
conn.on("NewQuestion", (q) => {
  console.log("📝 New Question:", q);
  // { Text: "...", TimeLimitSeconds: 30, Answers: [...] }
});

conn.on("AnswerSubmitted", (data) => {
  console.log("✓ Answer Submitted:", data);
  // { IsCorrect: true, PointsAwarded: 1000, Feedback: "+1000 points!" }
});

conn.on("AnswerCountUpdated", (data) => {
  console.log("📊 Answer Count:", data);
  // { Answered: 15, Total: 20 }
});

conn.on("ShowRoundResults", (data) => {
  console.log("📈 Round Results:", data);
  // { CorrectCount: 15, TotalPlayers: 20, CorrectAnswerIndex: 2 }
});

conn.on("GameOver", (data) => {
  console.log("🏆 Game Over - Leaderboard:", data);
  // { Entries: [{ Nickname: "Alice", Score: 4500 }, ...] }
});
```

---

## Next Steps

1. Update `/host/game/page.tsx` with RequestNextQuestion, ShowResults, AnswerCountUpdated listeners
2. Update `/player/game/page.tsx` with SubmitAnswer, AnswerSubmitted listeners
3. Create `/host/results/page.tsx` for final leaderboard display
4. Create `/player/results/page.tsx` for final leaderboard display
5. Add countdown timer UI component
6. Add answer distribution bar chart for results view

---

**Last Updated:** November 17, 2025  
**Status:** Ready for Frontend Integration ✅
