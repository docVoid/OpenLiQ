using Microsoft.EntityFrameworkCore;

namespace OpenLiQ.Api.Data;

/// <summary>
/// Entity Framework Core DbContext for OpenLiQ application.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) 
        : base(options)
    {
    }

    /// <summary>
    /// Configures the model on model creation.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Add your entity configurations here
        // Example:
        // modelBuilder.Entity<Game>()
        //     .HasKey(g => g.Id);
    }
}
