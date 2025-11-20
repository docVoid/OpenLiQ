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
    public List<Question> CurrentQuestions { get; set; } = new();

    // Map connectionId => score
    public Dictionary<string, int> Scores { get; set; } = new();

    // Map connectionId => chosen answer index for the current round
    public Dictionary<string, int> CurrentAnswers { get; set; } = new();
}

// Simple DTOs used by hub/frontend
public record GameStatusDto(string GamePin, string State, int PlayerCount, int CurrentQuestionIndex);
public record LeaderboardEntry(string Nickname, int Score);
