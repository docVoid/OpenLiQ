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
}
