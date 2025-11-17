namespace OpenLiQ.Api.Models;

public class QuizCatalog
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Question> Questions { get; set; } = new();
}
