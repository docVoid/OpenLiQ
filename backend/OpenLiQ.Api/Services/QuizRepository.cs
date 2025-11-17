namespace OpenLiQ.Api.Services;

using OpenLiQ.Api.Models;

public interface IQuizRepository
{
    List<QuizCatalog> GetAllQuizzes();
    QuizCatalog? GetQuizById(Guid id);
}

public class InMemoryQuizRepository : IQuizRepository
{
    private readonly List<QuizCatalog> _quizzes;

    public InMemoryQuizRepository()
    {
        _quizzes = new List<QuizCatalog>
        {
            // Catalog 1: Liebherr General
            new QuizCatalog
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Title = "Liebherr General",
                Description = "Test your knowledge about Liebherr company",
                Questions = new List<Question>
                {
                    new Question
                    {
                        Text = "In which year was Liebherr founded?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "1949", IsCorrect = true },
                            new Answer { Text = "1950", IsCorrect = false },
                            new Answer { Text = "1948", IsCorrect = false },
                            new Answer { Text = "1945", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "Who founded the company?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "Hans Liebherr", IsCorrect = true },
                            new Answer { Text = "Karl Liebherr", IsCorrect = false },
                            new Answer { Text = "Friedrich Liebherr", IsCorrect = false },
                            new Answer { Text = "Ernst Liebherr", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "Where is the Liebherr headquarters?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "Kirchdorf an der Iller, Germany", IsCorrect = true },
                            new Answer { Text = "Munich, Germany", IsCorrect = false },
                            new Answer { Text = "Stuttgart, Germany", IsCorrect = false },
                            new Answer { Text = "Berlin, Germany", IsCorrect = false }
                        }
                    }
                }
            },
            // Catalog 2: IT Nerd Knowledge
            new QuizCatalog
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Title = "IT Nerd Knowledge",
                Description = "Ultimate tech and programming trivia",
                Questions = new List<Question>
                {
                    new Question
                    {
                        Text = "Which programming language was created by Bjarne Stroustrup?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "C++", IsCorrect = true },
                            new Answer { Text = "C#", IsCorrect = false },
                            new Answer { Text = "Java", IsCorrect = false },
                            new Answer { Text = "Python", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "How much RAM can a 32-bit system theoretically address?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "4 GB", IsCorrect = true },
                            new Answer { Text = "2 GB", IsCorrect = false },
                            new Answer { Text = "8 GB", IsCorrect = false },
                            new Answer { Text = "16 GB", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "What does IP stand for?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "Internet Protocol", IsCorrect = true },
                            new Answer { Text = "Internal Process", IsCorrect = false },
                            new Answer { Text = "Integrated Processor", IsCorrect = false },
                            new Answer { Text = "Information Policy", IsCorrect = false }
                        }
                    }
                }
            },
            // Catalog 3: Fun Facts
            new QuizCatalog
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Title = "Fun Facts",
                Description = "Random fun and quirky facts",
                Questions = new List<Question>
                {
                    new Question
                    {
                        Text = "What is the only mammal that can't jump?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "Elephant", IsCorrect = true },
                            new Answer { Text = "Whale", IsCorrect = false },
                            new Answer { Text = "Hippo", IsCorrect = false },
                            new Answer { Text = "Rhino", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "How many hearts does an octopus have?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "3", IsCorrect = true },
                            new Answer { Text = "1", IsCorrect = false },
                            new Answer { Text = "5", IsCorrect = false },
                            new Answer { Text = "2", IsCorrect = false }
                        }
                    },
                    new Question
                    {
                        Text = "What is the smallest country in the world?",
                        TimeLimitSeconds = 30,
                        Answers = new List<Answer>
                        {
                            new Answer { Text = "Vatican City", IsCorrect = true },
                            new Answer { Text = "Monaco", IsCorrect = false },
                            new Answer { Text = "Liechtenstein", IsCorrect = false },
                            new Answer { Text = "Andorra", IsCorrect = false }
                        }
                    }
                }
            }
        };
    }

    public List<QuizCatalog> GetAllQuizzes()
    {
        return _quizzes;
    }

    public QuizCatalog? GetQuizById(Guid id)
    {
        return _quizzes.FirstOrDefault(q => q.Id == id);
    }
}
