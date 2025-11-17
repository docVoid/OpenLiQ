using Microsoft.AspNetCore.SignalR;

namespace OpenLiQ.Api.Hubs;

/// <summary>
/// SignalR Hub for real-time game state management and player interactions.
/// </summary>
public class GameHub : Hub
{
    private readonly ILogger<GameHub> _logger;

    public GameHub(ILogger<GameHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Called when a client connects to the hub.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Sends a welcome message to the connected client.
    /// </summary>
    public async Task SendWelcome(string userName)
    {
        _logger.LogInformation("User {UserName} connected with ID {ConnectionId}", userName, Context.ConnectionId);
        await Clients.Caller.SendAsync("ReceiveWelcome", $"Welcome {userName}!");
    }

    /// <summary>
    /// Placeholder method for starting a game.
    /// </summary>
    public async Task StartGame(string gameId)
    {
        _logger.LogInformation("Game started: {GameId}", gameId);
        await Clients.All.SendAsync("GameStarted", gameId);
    }

    /// <summary>
    /// Placeholder method for ending a game.
    /// </summary>
    public async Task EndGame(string gameId)
    {
        _logger.LogInformation("Game ended: {GameId}", gameId);
        await Clients.All.SendAsync("GameEnded", gameId);
    }
}
