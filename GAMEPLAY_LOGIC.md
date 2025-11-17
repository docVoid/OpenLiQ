# OpenLiQ Gameplay Logic Implementation - Complete Guide

## Overview

This document outlines the complete gameplay logic implementation for OpenLiQ, including player scoring, answer tracking, question progression, and real-time synchronization via SignalR.

---

## 1. Data Models & DTOs

### GameSession Enhancements

**File:** `Models/GameSession.cs`

**New Properties Added:**

```csharp
/// <summary>Maps ConnectionId to Score</summary>
public Dictionary<string, int> PlayerScores { get; set; } = new();

/// <summary>Tracks which players have answered the current question</summary>
public HashSet<string> PlayersAnsweredCurrentQuestion { get; set; } = new();
```

**Rationale:**

- `PlayerScores`: Maintains cumulative score per player (Key: ConnectionId, Value: Points)
- `PlayersAnsweredCurrentQuestion`: Prevents double-answering within a single question round

### New DTOs

```csharp
public record QuestionDto(string Text, int TimeLimitSeconds, List<string> Answers);
public record LeaderboardEntry(string Nickname, int Score);
public record AnswerResultDto(bool IsCorrect, int PointsAwarded, string Feedback);
public record RoundResultsDto(int CorrectCount, int TotalPlayers, int CorrectAnswerIndex);
public record LeaderboardDto(List<LeaderboardEntry> Entries);
```

**Purpose:**

- `QuestionDto`: Shared question data (no correct answer revealed to players)
- `LeaderboardEntry`: Single leaderboard row
- `AnswerResultDto`: Player answer submission response
- `RoundResultsDto`: Round statistics for results display
- `LeaderboardDto`: Final standings

---

## 2. GameStateService Methods

### SubmitAnswer(pin, connectionId, answerIndex)

**Purpose:** Process player answer submission with validation and scoring.

**Returns:** Tuple `(Status: string, PointsAwarded: int)`

**Flow:**

1. Validate game exists
2. Check if player already answered (prevent double-answering)
3. Verify question exists and index is valid
4. Validate answer index bounds
5. Mark player as answered
6. Check if answer is correct
7. Award points (fixed 1000 for MVP)
8. Update player score dictionary

**Status Codes:**

- `("Correct", 1000)` — Answer is correct, 1000 points awarded
- `("Wrong", 0)` — Answer is incorrect
- `("AlreadyAnswered", 0)` — Player already answered this question
- `("QuestionNotFound", 0)` — Invalid question state
- `("InvalidAnswer", 0)` — Answer index out of bounds
- `("GameNotFound", 0)` — Game session not found

**Thread Safety:** Wrapped in `lock(session)` to prevent race conditions.

### RequestNextQuestion(pin)

**Purpose:** Advance to next question and reset answer tracking.

**Returns:** `Question?` (null if game is over)

**Flow:**

1. Increment `CurrentQuestionIndex`
2. Clear `PlayersAnsweredCurrentQuestion` set
3. Check bounds against total questions
4. Return question object or null

**Notes:**

- Called by host to move the game forward
- Automatically resets answer tracking for new round

### GetCurrentQuestion(pin)

**Purpose:** Safely retrieve current question without modifications.

**Returns:** `Question?` (null if out of bounds)

### GetLeaderboard(pin)

**Purpose:** Generate sorted leaderboard by score (descending).

**Returns:** `List<LeaderboardEntry>`

**Algorithm:**

1. Iterate all players
2. Lookup score from `PlayerScores` dictionary (default 0 if not found)
3. Create `LeaderboardEntry` for each player
4. Sort by score descending
5. Return sorted list

**Use Case:** Display at game end or interim leaderboards.

### GetRoundResults(pin)

**Purpose:** Get statistics for current question.

**Returns:** Tuple `(CorrectCount: int, TotalPlayers: int, CorrectAnswerIndex: int)`

**Flow:**

1. Find correct answer index by scanning `question.Answers[]`
2. Count total players who answered (size of `PlayersAnsweredCurrentQuestion`)
3. Return triplet with statistics

**Use Case:** Host sees "15/20 answered" counter and can display results.

---

## 3. GameHub Methods

### RequestNextQuestion(pin) [Host Only]

**Caller:** Host via SignalR

**Broadcast Destinations:**

- **Game Over:** All clients in group → `"GameOver"` event with `LeaderboardDto`
- **Next Question:**
  - Host → `"NewQuestion"` with full details (`questionDto` + `CorrectAnswerIndex`)
  - Players → `"NewQuestion"` with only `questionDto` (no correct answer)

**Security:** Validates caller is host.

**Example Broadcast Flow:**

```
Host calls: RequestNextQuestion(pin: "123456")
  ├─ Service advances to question 2
  ├─ Host receives: { Text: "What is 2+2?", TimeLimitSeconds: 30, Answers: [...], CorrectAnswerIndex: 2 }
  └─ Players receive: { Text: "What is 2+2?", TimeLimitSeconds: 30, Answers: [...] }
```

### SubmitAnswer(pin, answerIndex) [Player]

**Caller:** Player via SignalR

**Flow:**

1. Service processes answer, returns (status, points)
2. Create `AnswerResultDto` with appropriate feedback
3. Send immediate response to player (green/red indicator)
4. Notify host of submission count

**Responses:**

- **To Caller (Player):** `"AnswerSubmitted"` event with `AnswerResultDto`
  - Triggers UI green/red feedback and "+1000 points!" display
- **To Host:** `"AnswerCountUpdated"` event with `{ Answered: 15, Total: 20 }`

**Feedback Logic:**

```csharp
status == "Correct" ? "+1000 points!"
: status == "Wrong" ? "Incorrect!"
: "You already answered!"
```

### ShowResults(pin) [Host Only]

**Caller:** Host via SignalR (typically after time expires)

**Broadcast:** All clients in group → `"ShowRoundResults"` event with `RoundResultsDto`

**Data Sent:**

- `CorrectCount`: How many players answered correctly
- `TotalPlayers`: Total players in game
- `CorrectAnswerIndex`: Which answer was correct (to highlight)

**Use Case:** Host displays bar chart showing answer distribution.

---

## 4. Gameplay Loop Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ GAME START (Host clicks "Start Game")                          │
│ → StartGame(pin, quizId) broadcasts GameStarted event          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────▼──────────────────────────────────────┐
                    │ QUESTION 1 (Host calls RequestNextQuestion)
                    │ → Service loads question 1               │
                    │ → Host receives full question details    │
                    │ → Players receive question (no answer)   │
                    │ → 30-second timer starts on host         │
                    └────┬──────────────────────────────────────┘
                         │
            ┌────────────┬┴┬───────────────┐
            │            │ │               │
    ┌───────▼──┐  ┌──────▼┐  ┌────────────▼─┐
    │ Player A │  │Player B│  │ ... (during timer)
    │ SubmitAns│  │SubmitAns  │
    │ (index 2)│  │ (index 2) │
    └───────┬──┘  └──────┬┘  └────────────┬─┘
            │            │                │
            └────────────┼────────────────┘
                         │
          ┌──────────────▼────────────────┐
          │ ALL RESPONSES IN              │
          │ Host calls ShowResults(pin)   │
          │ → CorrectAnswerIndex: 2      │
          │ → Correct players get +1000pts
          └──────────────┬────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Results displayed   │
              │ Leaderboard updates │
              │ Host presses "Next" │
              └──────────┬──────────┘
                         │
         ┌───────────────▼────────────────┐
         │ Loop to QUESTION 2...          │
         │ OR                             │
         │ GameOver if no more questions  │
         └────────────────────────────────┘
```

---

## 5. Score Calculation (MVP)

**Current Logic:** Fixed 1000 points per correct answer.

**Potential Future Enhancements:**

- Time-based scoring: `1000 - (secondsElapsed * 10)`
- Speed bonus: First 5 correct answers get 500 bonus points
- Streak multiplier: Consecutive correct answers double points

---

## 6. Thread Safety

All methods in `GameStateService` protecting state use:

```csharp
lock (session)
{
    // Perform operations
}
```

**Why:**

- Multiple players submitting answers simultaneously
- Host advancing questions while answers arrive
- Prevents: Race conditions, double-scoring, lost updates

---

## 7. SignalR Event Reference

### Events Sent BY Backend

| Event                | Recipients  | Data                          | Trigger                  |
| -------------------- | ----------- | ----------------------------- | ------------------------ |
| `GameStarted`        | All (group) | `GameStatusDto`               | Host clicks "Start Game" |
| `NewQuestion`        | All (group) | `QuestionDto` or full details | `RequestNextQuestion`    |
| `GameOver`           | All (group) | `LeaderboardDto`              | No more questions        |
| `AnswerSubmitted`    | Player      | `AnswerResultDto`             | Player submits answer    |
| `AnswerCountUpdated` | Host        | `{ Answered, Total }`         | Player submits answer    |
| `ShowRoundResults`   | All (group) | `RoundResultsDto`             | Host calls `ShowResults` |
| `RequestError`       | Caller      | `string` message              | Unauthorized action      |

### Methods Called BY Frontend

| Method                | Caller | Parameters                      | Purpose               |
| --------------------- | ------ | ------------------------------- | --------------------- |
| `RequestNextQuestion` | Host   | `pin: string`                   | Load next question    |
| `SubmitAnswer`        | Player | `pin: string, answerIndex: int` | Submit answer choice  |
| `ShowResults`         | Host   | `pin: string`                   | Display round results |

---

## 8. Testing Scenarios

### Scenario 1: Normal Answer Flow

1. Host starts game with 3 questions
2. Q1 broadcast to all players
3. Player A submits answer (index 2) → Correct → Receives feedback
4. Player B submits answer (index 1) → Wrong → Receives feedback
5. Player A tries to answer again → AlreadyAnswered error
6. Host calls ShowResults → All see correct index (2)

### Scenario 2: Game Over

1. RequestNextQuestion called after last question
2. Service returns null (index out of bounds)
3. Hub sends GameOver event with LeaderboardDto
4. Players redirected to results page

### Scenario 3: Concurrent Submissions

- 20 players submit answers in parallel
- Each increments `PlayersAnsweredCurrentQuestion` set
- Lock ensures no race conditions
- Host sees "20/20 answered" in real-time

---

## 9. Error Handling

**Service-level validation:**

- Game not found → Return error status
- Question not found → Return error status
- Double answer → Return "AlreadyAnswered"
- Invalid answer index → Return "InvalidAnswer"

**Hub-level validation:**

- Only host can request next question
- Only host can show results
- If validation fails, send RequestError to caller

---

## 10. Integration Checklist

- [x] GameSession model updated with PlayerScores and PlayersAnsweredCurrentQuestion
- [x] GameStateService implements all gameplay methods
- [x] GameHub implements all broadcast methods
- [x] DTOs created for all data structures
- [x] Backend builds successfully
- [ ] Frontend updated to call RequestNextQuestion, SubmitAnswer, ShowResults
- [ ] Frontend updated to listen for NewQuestion, AnswerSubmitted, ShowRoundResults, GameOver
- [ ] End-to-end testing with real players

---

## 11. Future Enhancements

1. **Persistence:** Migrate from in-memory to database
2. **Metrics:** Track questions answered, average response time, accuracy %
3. **Streaming:** Send question to players gradually (text + answers separately)
4. **Reaction Emotes:** Let players send quick reactions during results
5. **Admin Panel:** Quiz creator can preview and edit questions
6. **Anti-Cheat:** Detect suspicious patterns (same exact timing, only correct answers)

---

**Generated:** November 17, 2025  
**Status:** MVP Implementation Complete ✅  
**Build Result:** Success with 2 non-blocking warnings
