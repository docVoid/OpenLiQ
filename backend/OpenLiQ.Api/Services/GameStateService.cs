using System.Collections.Concurrent;
using OpenLiQ.Api.Models;

namespace OpenLiQ.Api.Services;

/// <summary>
/// In-memory, thread-safe game state manager (MVP).
/// Stores active games keyed by a short PIN.
/// </summary>
public class GameStateService
{
    private readonly ConcurrentDictionary<string, GameSession> _games = new();
    private readonly Random _rng = new();

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

    public bool StartGame(string pin, string hostConnectionId)
    {
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (session.HostConnectionId != hostConnectionId) return false;
            session.CurrentState = GameState.InGame;
            session.CurrentQuestionIndex = 0;
            return true;
        }
    }
}
