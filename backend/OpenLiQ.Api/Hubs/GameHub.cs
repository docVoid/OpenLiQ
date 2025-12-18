using Microsoft.AspNetCore.SignalR;
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

    public GameHub(ILogger<GameHub> logger, GameStateService gameState)
    {
        _logger = logger;
        _gameState = gameState;
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

    /// <summary>
    /// Host creates a new lobby and becomes the host for that PIN.
    /// </summary>
    public async Task CreateLobby()
    {
        var hostId = Context.ConnectionId;
        var session = _gameState.CreateGame(hostId);

        // Join host to group
        await Groups.AddToGroupAsync(hostId, session.GamePin);

        _logger.LogInformation("Lobby created {Pin} by {Host}", session.GamePin, hostId);
        await Clients.Caller.SendAsync("LobbyCreated", session.GamePin);
    }

    /// <summary>
    /// Host selects a quiz/game before starting.
    /// </summary>
    public async Task SelectGame(string pin, string quizId)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("SelectResult", false, "Lobby not found");
            return;
        }

        if (session.HostConnectionId != caller)
        {
            await Clients.Caller.SendAsync("SelectResult", false, "Only host can select game");
            return;
        }

        var ok = _gameState.SelectQuiz(pin, quizId);
        await Clients.Caller.SendAsync("SelectResult", ok, ok ? quizId : "failed");
    }

    /// <summary>
    /// Host advances to next question. Broadcasts QuestionStarted or GameEnded.
    /// </summary>
    public async Task NextQuestion(string pin)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("NextResult", false, "Lobby not found");
            return;
        }

        if (session.HostConnectionId != caller)
        {
            await Clients.Caller.SendAsync("NextResult", false, "Only host can advance");
            return;
        }

        var hasNext = _gameState.AdvanceQuestion(pin);
        if (!hasNext)
        {
            // game ended
            var scores = _gameState.GetScores(pin);
            await Clients.Group(pin).SendAsync("GameEnded", scores);
            return;
        }

        var q = _gameState.GetCurrentQuestion(pin);
        if (q is null)
        {
            await Clients.Caller.SendAsync("NextResult", false, "Failed to load question");
            return;
        }

        var idx = session.CurrentQuestionIndex;
        var dto = new QuestionDto(q.Text, q.Options.ToArray(), idx, 20);
        await Clients.Group(pin).SendAsync("QuestionStarted", dto);
    }

    /// <summary>
    /// Player submits an answer for the current question.
    /// </summary>
    public async Task SubmitAnswer(string pin, int selectedIndex)
    {
        var connectionId = Context.ConnectionId;
        var ok = _gameState.SubmitAnswer(pin, connectionId, selectedIndex);
        if (!ok)
        {
            await Clients.Caller.SendAsync("AnswerResult", false, "Unable to submit");
            return;
        }

        // inform host that a player answered
        if (_gameState.TryGetGame(pin, out var session) && !string.IsNullOrEmpty(session.HostConnectionId))
        {
            await Clients.Client(session.HostConnectionId).SendAsync("PlayerAnswered", new { ConnectionId = connectionId });
        }

        await Clients.Caller.SendAsync("AnswerResult", true, "ok");
    }

    /// <summary>
    /// Player attempts to join a lobby by PIN and nickname.
    /// </summary>
    public async Task JoinLobby(string pin, string nickname)
    {
        var connectionId = Context.ConnectionId;

        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("JoinResult", false, "Lobby not found");
            return;
        }

        var ok = _gameState.JoinGame(pin, nickname, connectionId, out var player);
        if (!ok || player is null)
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
            await Clients.Client(session.HostConnectionId).SendAsync("PlayerJoined", new { player.Nickname, player.ConnectionId });
        }

        // Optionally broadcast updated player list to the group
        await Clients.Group(pin).SendAsync("PlayerListUpdated", session.Players.Select(p => new { p.ConnectionId, p.Nickname }));
    }

    /// <summary>
    /// Host starts the game for the given PIN.
    /// </summary>
    public async Task StartGame(string pin)
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

        var started = _gameState.StartGame(pin, caller);
        if (!started)
        {
            await Clients.Caller.SendAsync("StartResult", false, "Unable to start");
            return;
        }

        // Notify all clients in the group to navigate to the game view
        var dto = new GameStatusDto(pin, session.CurrentState.ToString(), session.Players.Count, session.CurrentQuestionIndex);
        await Clients.Group(pin).SendAsync("GameStarted", dto);
    }

    /// <summary>
    /// Host can force end the game and send final scores.
    /// </summary>
    public async Task EndGame(string pin)
    {
        var caller = Context.ConnectionId;
        if (!_gameState.TryGetGame(pin, out var session))
        {
            await Clients.Caller.SendAsync("EndResult", false, "Lobby not found");
            return;
        }

        if (session.HostConnectionId != caller)
        {
            await Clients.Caller.SendAsync("EndResult", false, "Only host can end the game");
            return;
        }

        var scores = _gameState.EndGame(pin);
        await Clients.Group(pin).SendAsync("GameEnded", scores);
        await Clients.Caller.SendAsync("EndResult", true, "ok");
    }
}
