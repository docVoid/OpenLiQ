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

    // Simple in-memory quiz library
    private Dictionary<string, List<Question>> _quizLibrary = new()
    {
        ["liebherr"] = new List<Question>
        {
            new Question("Wann wurde Liebherr gegründet?", new[] {"1949","1955","1898","1990"}, 0),
            new Question("Welches Produkt ist typisch für Liebherr?", new[] {"Waschmaschinen","Fahrräder","Smartphones","Kühlschränke"}, 3),
            new Question("In welchem Land hat Liebherr seinen Hauptsitz?", new[] {"Schweiz","Deutschland","Österreich","Italien"}, 1),
            new Question("Liebherr ist bekannt für ?", new[] {"Lebensmittel","Baumaschinen","Software","Bekleidung"}, 1),
            new Question("Welche Liebherr Geselschaft ist die größter der Gruppe?", new[] {"Ehingen","Oberopfingen","Roßtock","Bulle"}, 0),
        },
        ["it"] = new List<Question>
        {
            new Question("Was bedeutet CPU?", new[] {"Central Processing Unit","Computer Personal Unit","Central Print Unit","Control Processing Unit"}, 0),
            new Question("Was ist HTML?", new[] {"Programmiersprache","Stylesheet","Markup Language","Datenbank"}, 2),
            new Question("Welches Protokoll nutzt das Web?", new[] {"FTP","SSH","HTTP","SMTP"}, 2),
            new Question("Was ist Git?", new[] {"Versionskontrolle","Programmiersprache","Editor","Betriebssystem"}, 0),
            new Question("Welche Sprache läuft im Browser?", new[] {"Java","C#","JavaScript","Python"}, 2),
        }
    };

    public bool SelectQuiz(string pin, string quizId)
    {
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (!_quizLibrary.TryGetValue(quizId, out var questions)) return false;
            session.SelectedQuizId = quizId;
            // clone questions into session
            session.Questions = questions.Select(q => new Question(q.Text, q.Options.ToArray(), q.CorrectIndex)).ToList();
            // reset scores and answers
            session.Scores = session.Players.ToDictionary(p => p.ConnectionId, p => 0);
            session.CurrentAnswers = session.Players.ToDictionary(p => p.ConnectionId, p => -1);
            session.CurrentQuestionIndex = -1;
            session.CurrentState = GameState.Lobby;
            return true;
        }
    }

    public Question? GetCurrentQuestion(string pin)
    {
        if (!_games.TryGetValue(pin, out var session)) return null;
        if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.Questions.Count) return null;
        return session.Questions[session.CurrentQuestionIndex];
    }

    public bool AdvanceQuestion(string pin)
    {
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            session.CurrentQuestionIndex++;
            // reset current answers for next question
            session.CurrentAnswers = session.Players.ToDictionary(p => p.ConnectionId, p => -1);

            if (session.CurrentQuestionIndex >= session.Questions.Count)
            {
                // game ended
                session.CurrentState = GameState.Lobby;
                return false;
            }

            session.CurrentState = GameState.InGame;
            return true;
        }
    }

    public bool SubmitAnswer(string pin, string connectionId, int selectedIndex)
    {
        if (!_games.TryGetValue(pin, out var session)) return false;

        lock (session)
        {
            if (session.CurrentQuestionIndex < 0 || session.CurrentQuestionIndex >= session.Questions.Count) return false;
            session.CurrentAnswers[connectionId] = selectedIndex;
            // if correct, increment score
            var q = session.Questions[session.CurrentQuestionIndex];
            if (selectedIndex == q.CorrectIndex)
            {
                if (!session.Scores.ContainsKey(connectionId)) session.Scores[connectionId] = 0;
                session.Scores[connectionId] += 1;
            }
            return true;
        }
    }

    public List<PlayerScoreDto> GetScores(string pin)
    {
        if (!_games.TryGetValue(pin, out var session)) return new List<PlayerScoreDto>();
        lock (session)
        {
            return session.Players.Select(p => new PlayerScoreDto(p.Nickname, session.Scores.ContainsKey(p.ConnectionId) ? session.Scores[p.ConnectionId] : 0)).ToList();
        }
    }

    public List<PlayerScoreDto> EndGame(string pin)
    {
        if (!_games.TryGetValue(pin, out var session)) return new List<PlayerScoreDto>();
        lock (session)
        {
            session.CurrentState = GameState.Lobby;
            // return final scores
            return GetScores(pin);
        }
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
