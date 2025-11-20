using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using OpenLiQ.Api.Services;
using OpenLiQ.Api.Models;

namespace OpenLiQ.Api.Hubs;

/// <summary>
/// SignalR Hub for real-time game state management and player interactions.
/// </summary>
public class GameHub : Hub
{
    private readonly ILogger<GameHub> _logger;
    private readonly GameStateService _gameState;
    private readonly IQuizRepository _quizRepository;

    public GameHub(ILogger<GameHub> logger, GameStateService gameState, IQuizRepository quizRepository)
    {
        _logger = logger;
        _gameState = gameState;
        _quizRepository = quizRepository;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task<string> CreateLobby()
    {
        var hostId = Context.ConnectionId;
        var session = _gameState.CreateGame(hostId);

        // Join host to group
        await Groups.AddToGroupAsync(hostId, session.GamePin);

        _logger.LogInformation("Lobby created {Pin} by {Host}", session.GamePin, hostId);
        await Clients.Caller.SendAsync("LobbyCreated", session.GamePin);
        return session.GamePin;
    }

    public async Task JoinLobby(string pin, string nickname)
    {
        var connectionId = Context.ConnectionId;

        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("JoinResult", false, "Lobby not found");
            return;
        }

        var ok = _gameState.JoinGame(pin, nickname, connectionId, out var player);
        if (!ok)
        {
            await Clients.Caller.SendAsync("JoinResult", false, "Unable to join");
            return;
        }

        await Groups.AddToGroupAsync(connectionId, pin);

        // Notify caller
        await Clients.Caller.SendAsync("JoinResult", true, pin);

        // Notify host that a new player joined
        if (!string.IsNullOrEmpty(session.HostConnectionId))
        {
            await Clients.Client(session.HostConnectionId).SendAsync("PlayerJoined", new { player?.Nickname, player?.ConnectionId });
        }

        // Broadcast updated player list to the group
        await Clients.Group(pin).SendAsync("PlayerListUpdated", session.Players.Select(p => new { p.ConnectionId, p.Nickname }));
    }

    public Task<List<QuizCatalog>> GetQuizzes()
    {
        var catalogs = _quizRepository.GetAllQuizzes();
        return Task.FromResult(catalogs);
    }

    public async Task StartGame(string pin, Guid quizId)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("StartResult", false, "Lobby not found");
            return;
        }

        if (session.HostConnectionId != caller)
        {
            await Clients.Caller.SendAsync("StartResult", false, "Only host can start the game");
            return;
        }

        var started = _gameState.StartGame(pin, caller, quizId);
        if (!started)
        {
            await Clients.Caller.SendAsync("StartResult", false, "Unable to start");
            return;
        }

        // Notify all clients in the group that the game started
        await Clients.Group(pin).SendAsync("GameStarted");
    }

    public async Task NextQuestion(string pin)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            _logger.LogWarning("NextQuestion: Lobby not found for pin {Pin}", pin);
            return;
        }

        if (session.HostConnectionId != caller)
        {
            _logger.LogWarning("NextQuestion: Only host can request next question");
            return;
        }

        var ok = _gameState.NextQuestion(pin, caller, out var question, out var timeLimit);
        if (!ok || question is null)
        {
            // no more questions -> compile final leaderboard and send game over
            _logger.LogInformation("NextQuestion: Game over - compiling final results");
            if (_gameState.CompileRoundResults(pin, out var countsEmpty, out var correctEmpty, out var leaderboardEmpty, out var gameOverEmpty))
            {
                var top = leaderboardEmpty.Take(3).ToList();
                await Clients.Group(pin).SendAsync("GameOver", top);
            }
            return;
        }

        // send question to group (players will show answers, host shows question)
        var payload = new
        {
            Text = question.Text,
            Answers = question.Answers.Select(a => a.Text).ToArray(),
            TimeLimit = timeLimit,
            QuestionIndex = session.CurrentQuestionIndex
        };

        _logger.LogInformation("NextQuestion: Sending question {Index} to pin {Pin}", session.CurrentQuestionIndex, pin);
        await Clients.Group(pin).SendAsync("QuestionStarted", payload);
    }

    public async Task SubmitAnswer(string pin, int answerIndex)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("AnswerResult", false, 0);
            return;
        }

        var ok = _gameState.SubmitAnswer(pin, caller, answerIndex, out var isCorrect, out var newScore, out var allAnswered);
        await Clients.Caller.SendAsync("AnswerResult", isCorrect, newScore);

        if (ok && allAnswered)
        {
            // compile results and broadcast
            if (_gameState.CompileRoundResults(pin, out var counts, out var correctIndex, out var leaderboard, out var gameOver))
            {
                var resultPayload = new
                {
                    Counts = counts,
                    CorrectIndex = correctIndex,
                    Leaderboard = leaderboard
                };

                await Clients.Group(pin).SendAsync("RoundResults", resultPayload);

                // send individual feedback
                foreach (var p in session.Players)
                {
                    var hasAns = session.CurrentAnswers.TryGetValue(p.ConnectionId, out var idx);
                    var pIsCorrect = hasAns && idx == correctIndex;
                    var pScore = session.Scores.ContainsKey(p.ConnectionId) ? session.Scores[p.ConnectionId] : 0;
                    await Clients.Client(p.ConnectionId).SendAsync("RoundFeedback", new { Correct = pIsCorrect, Score = pScore });
                }

                if (gameOver)
                {
                    var top = leaderboard.Take(3).ToList();
                    await Clients.Group(pin).SendAsync("GameOver", top);
                }
            }
        }
    }

    public async Task RevealRound(string pin)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session)) return;
        if (session.HostConnectionId != caller) return;

        if (_gameState.CompileRoundResults(pin, out var counts, out var correctIndex, out var leaderboard, out var gameOver))
        {
            var resultPayload = new
            {
                Counts = counts,
                CorrectIndex = correctIndex,
                Leaderboard = leaderboard
            };

            await Clients.Group(pin).SendAsync("RoundResults", resultPayload);

            foreach (var p in session.Players)
            {
                var hasAns = session.CurrentAnswers.TryGetValue(p.ConnectionId, out var idx);
                var pIsCorrect = hasAns && idx == correctIndex;
                var pScore = session.Scores.ContainsKey(p.ConnectionId) ? session.Scores[p.ConnectionId] : 0;
                await Clients.Client(p.ConnectionId).SendAsync("RoundFeedback", new { Correct = pIsCorrect, Score = pScore });
            }

            if (gameOver)
            {
                var top = leaderboard.Take(3).ToList();
                await Clients.Group(pin).SendAsync("GameOver", top);
            }
        }
    }
}

