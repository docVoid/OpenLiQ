using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using OpenLiQ.Api.Models;

namespace OpenLiQ.Api.Services;

public class GameStateService
{
    private readonly ConcurrentDictionary<string, GameSession> _games = new();
    private readonly Random _rng = new();
    private readonly IQuizRepository _quizRepository;

    public GameStateService(IQuizRepository quizRepository)
    {
        _quizRepository = quizRepository;
    }

    private string GeneratePin()
    {
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
            session.CurrentState = GameState.InGame;
            session.CurrentQuestions = quiz.Questions;
            session.CurrentQuestionIndex = -1;
            session.Scores = session.Players.ToDictionary(p => p.ConnectionId, p => 0);
            session.CurrentAnswers = new Dictionary<string, int>();
            return true;
        }
    }

    public bool NextQuestion(string pin, string hostConnectionId, out Question? question, out int timeLimit)
    {
        question = null;
        timeLimit = 10;
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (session.HostConnectionId != hostConnectionId) return false;

            session.CurrentQuestionIndex++;
            if (session.CurrentQuestions == null || session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count)
            {
                return false;
            }

            question = session.CurrentQuestions[session.CurrentQuestionIndex];
            timeLimit = question.TimeLimitSeconds > 0 ? question.TimeLimitSeconds : 10;
            session.CurrentAnswers = new Dictionary<string, int>();

            // Ensure scores exist for players
            foreach (var p in session.Players)
            {
                if (!session.Scores.ContainsKey(p.ConnectionId)) session.Scores[p.ConnectionId] = 0;
            }

            return true;
        }
    }

    public bool SubmitAnswer(string pin, string connectionId, int answerIndex, out bool isCorrect, out int newScore, out bool allAnswered)
    {
        isCorrect = false;
        newScore = 0;
        allAnswered = false;

        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count) return false;

            if (session.CurrentAnswers.ContainsKey(connectionId))
            {
                isCorrect = session.CurrentQuestions[session.CurrentQuestionIndex].Answers[session.CurrentAnswers[connectionId]].IsCorrect;
                newScore = session.Scores.ContainsKey(connectionId) ? session.Scores[connectionId] : 0;
                allAnswered = session.CurrentAnswers.Count == session.Players.Count;
                return true;
            }

            var q = session.CurrentQuestions[session.CurrentQuestionIndex];
            if (answerIndex < 0 || answerIndex >= q.Answers.Count) return false;

            isCorrect = q.Answers[answerIndex].IsCorrect;
            if (isCorrect)
            {
                const int points = 100;
                if (!session.Scores.ContainsKey(connectionId)) session.Scores[connectionId] = 0;
                session.Scores[connectionId] += points;
            }

            session.CurrentAnswers[connectionId] = answerIndex;
            newScore = session.Scores.ContainsKey(connectionId) ? session.Scores[connectionId] : 0;
            allAnswered = session.CurrentAnswers.Count == session.Players.Count;
            return true;
        }
    }

    public bool CompileRoundResults(string pin, out int[] counts, out int correctIndex, out List<(string Nickname, int Score)> leaderboard, out bool gameOver)
    {
        counts = Array.Empty<int>();
        correctIndex = -1;
        leaderboard = new List<(string, int)>();
        gameOver = false;

        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.CurrentQuestions.Count) return false;

            var q = session.CurrentQuestions[session.CurrentQuestionIndex];
            var answersCount = q.Answers.Count;
            counts = new int[answersCount];

            foreach (var ans in session.CurrentAnswers.Values)
            {
                if (ans >= 0 && ans < answersCount) counts[ans]++;
            }

            for (int i = 0; i < q.Answers.Count; i++)
            {
                if (q.Answers[i].IsCorrect) { correctIndex = i; break; }
            }

            leaderboard = session.Players
                .Select(p => (p.Nickname, session.Scores.ContainsKey(p.ConnectionId) ? session.Scores[p.ConnectionId] : 0))
                .OrderByDescending(t => t.Item2)
                .ToList();

            gameOver = session.CurrentQuestionIndex >= session.CurrentQuestions.Count - 1;
            return true;
        }
    }
}

