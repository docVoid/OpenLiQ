using System.Collections.Generic;

namespace OpenLiQ.Api.Models;

public enum GameState
{
    Lobby,
    InGame
}

public record Player(string ConnectionId, string Nickname);

public class GameSession
{
    public string GamePin { get; set; } = string.Empty;
    public string HostConnectionId { get; set; } = string.Empty;
    public GameState CurrentState { get; set; } = GameState.Lobby;
    public List<Player> Players { get; set; } = new();
    public int CurrentQuestionIndex { get; set; } = -1;
}

// DTOs
public record PlayerJoinDto(string GamePin, string Nickname, string ConnectionId);
public record GameStatusDto(string GamePin, string State, int PlayerCount, int CurrentQuestionIndex);
