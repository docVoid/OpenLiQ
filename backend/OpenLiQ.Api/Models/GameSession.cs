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
     /// <summary>Maps ConnectionId to Score</summary>
     public Dictionary<string, int> PlayerScores { get; set; } = new();
     /// <summary>Tracks which players have answered the current question</summary>
     public HashSet<string> PlayersAnsweredCurrentQuestion { get; set; } = new();
}

// DTOs
public record PlayerJoinDto(string GamePin, string Nickname, string ConnectionId);
public record GameStatusDto(string GamePin, string State, int PlayerCount, int CurrentQuestionIndex);
public record QuestionDto(string Text, int TimeLimitSeconds, List<string> Answers);
public record LeaderboardEntry(string Nickname, int Score);
public record AnswerResultDto(bool IsCorrect, int PointsAwarded, string Feedback);
public record RoundResultsDto(int CorrectCount, int TotalPlayers, int CorrectAnswerIndex);
public record LeaderboardDto(List<LeaderboardEntry> Entries);
