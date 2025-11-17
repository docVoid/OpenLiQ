namespace OpenLiQ.Api.Models;

public class Question
{
    public string Text { get; set; } = string.Empty;
    public int TimeLimitSeconds { get; set; } = 30;
    public List<Answer> Answers { get; set; } = new();
}
