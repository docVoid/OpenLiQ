using System;
using System.Collections.Concurrent;
using System.Linq;
using OpenLiQ.Api.Models;

namespace OpenLiQ.Api.Services;

/// <summary>
/// In-memory, thread-safe game state manager (MVP).
/// Stores active games keyed by a short PIN.
/// </summary>
public class GameStateService
{
    private readonly ConcurrentDictionary<string, GameSession> _games = new();
    private readonly IQuizRepository _quizRepository;
    private readonly Random _rng = new();

    public GameStateService(IQuizRepository quizRepository)
    {
        _quizRepository = quizRepository;
    }

    private string GeneratePin()
    {
        // 6-digit numeric PIN
        return _rng.Next(100000, 999999).ToString();
    }

    public GameSession CreateGame(string hostConnectionId)
    {
        string pin;
        GameSession session;
        do
        {
            pin = GeneratePin();
            session = new GameSession
            {
                GamePin = pin,
                HostConnectionId = hostConnectionId,
                CurrentState = GameState.Lobby,
                CurrentQuestionIndex = -1
            };
        }
        while (!_games.TryAdd(pin, session));

        return session;
    }

    public bool TryGetGame(string pin, out GameSession? session)
    {
        return _games.TryGetValue(pin, out session);
    }

    public bool JoinGame(string pin, string nickname, string connectionId, out Player? joinedPlayer)
    {
        joinedPlayer = null;
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            // Prevent duplicate connectionId
            if (session.Players.Any(p => p.ConnectionId == connectionId))
            {
                joinedPlayer = session.Players.First(p => p.ConnectionId == connectionId);
                return true;
            }

            var player = new Player(connectionId, nickname);
            session.Players.Add(player);
            joinedPlayer = player;
            return true;
        }
    }

    public bool StartGame(string pin, string hostConnectionId, Guid quizId)
    {
        if (!_games.TryGetValue(pin, out var session)) return false;

        var quiz = _quizRepository.GetQuizById(quizId);
        if (quiz is null) return false;

        lock (session)
        {
            if (session.HostConnectionId != hostConnectionId) return false;
            
            // Load quiz
            var quiz = _quizRepository.GetQuizById(quizId);
            if (quiz == null) return false;

            session.CurrentState = GameState.InGame;
            session.CurrentQuestions = quiz.Questions;
            session.CurrentQuestionIndex = 0;
            return true;
        }
    }

    /// <summary>
    /// SubmitAnswer processes a player's answer submission.
    /// Returns: ("Correct", points) | ("Wrong", 0) | ("AlreadyAnswered", 0) | ("QuestionNotFound", 0)
    /// </summary>
    public (string Status, int PointsAwarded) SubmitAnswer(string pin, string connectionId, int answerIndex)
    {
        if (!_games.TryGetValue(pin, out var session))
            return ("GameNotFound", 0);

        lock (session)
        {
            // Check if player already answered
            if (session.PlayersAnsweredCurrentQuestion.Contains(connectionId))
                return ("AlreadyAnswered", 0);

            // Check if current question exists
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count)
                return ("QuestionNotFound", 0);

            var question = session.CurrentQuestions[session.CurrentQuestionIndex];
            if (answerIndex < 0 || answerIndex >= question.Answers.Count)
                return ("InvalidAnswer", 0);

            // Mark player as answered
            session.PlayersAnsweredCurrentQuestion.Add(connectionId);

            var answer = question.Answers[answerIndex];
            if (!answer.IsCorrect)
                return ("Wrong", 0);

            // Award points (MVP: fixed 1000 points for correct answer)
            int pointsAwarded = 1000;
            if (!session.PlayerScores.ContainsKey(connectionId))
                session.PlayerScores[connectionId] = 0;

            session.PlayerScores[connectionId] += pointsAwarded;
            return ("Correct", pointsAwarded);
        }
    }

    /// <summary>
    /// GetCurrentQuestion returns the current question or null if game is over.
    /// </summary>
    public Question? GetCurrentQuestion(string pin)
    {
        if (!_games.TryGetValue(pin, out var session))
            return null;

        lock (session)
        {
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count)
                return null;

            return session.CurrentQuestions[session.CurrentQuestionIndex];
        }
    }

    /// <summary>
    /// RequestNextQuestion advances to the next question and resets answer tracking.
    /// Returns the Question object, or null if game is over.
    /// </summary>
    public Question? RequestNextQuestion(string pin)
    {
        if (!_games.TryGetValue(pin, out var session))
            return null;

        lock (session)
        {
            // Move to next question
            session.CurrentQuestionIndex++;

            // Reset answered tracking
            session.PlayersAnsweredCurrentQuestion.Clear();

            // Check bounds
            if (session.CurrentQuestionIndex >= session.CurrentQuestions.Count)
                return null;

            return session.CurrentQuestions[session.CurrentQuestionIndex];
        }
    }

    /// <summary>
    /// GetLeaderboard returns sorted list of players by score (descending).
    /// </summary>
    public List<LeaderboardEntry> GetLeaderboard(string pin)
    {
        if (!_games.TryGetValue(pin, out var session))
            return new();

        lock (session)
        {
            var leaderboard = new List<LeaderboardEntry>();
            foreach (var player in session.Players)
            {
                var score = session.PlayerScores.TryGetValue(player.ConnectionId, out var s) ? s : 0;
                leaderboard.Add(new LeaderboardEntry(player.Nickname, score));
            }

            // Sort by score descending
            return leaderboard.OrderByDescending(e => e.Score).ToList();
        }
    }

    /// <summary>
    /// GetRoundResults returns answer statistics for current question.
    /// </summary>
    public (int CorrectCount, int TotalAnswers, int CorrectAnswerIndex) GetRoundResults(string pin)
    {
        if (!_games.TryGetValue(pin, out var session))
            return (0, 0, -1);

        lock (session)
        {
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count)
                return (0, 0, -1);

            var question = session.CurrentQuestions[session.CurrentQuestionIndex];
            var correctCount = 0;
            var correctAnswerIndex = -1;

            for (int i = 0; i < question.Answers.Count; i++)
            {
                if (question.Answers[i].IsCorrect)
                {
                    correctCount++;
                    correctAnswerIndex = i;
                }
            }

            return (session.PlayersAnsweredCurrentQuestion.Count, session.Players.Count, correctAnswerIndex);
        }
    }
}

