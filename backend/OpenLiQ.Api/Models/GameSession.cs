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
    // Quiz-related
    public string SelectedQuizId { get; set; } = string.Empty;
    public List<Question> Questions { get; set; } = new();
    // mapping connectionId -> score
    public Dictionary<string, int> Scores { get; set; } = new();
    // mapping connectionId -> selected answer index for current question (or -1)
    public Dictionary<string, int> CurrentAnswers { get; set; } = new();
}

// DTOs
public record PlayerJoinDto(string GamePin, string Nickname, string ConnectionId);
public record GameStatusDto(string GamePin, string State, int PlayerCount, int CurrentQuestionIndex);

public record Question(string Text, string[] Options, int CorrectIndex);
public record QuestionDto(string Text, string[] Options, int Index, int TimeSeconds);
public record PlayerScoreDto(string Nickname, int Score);
