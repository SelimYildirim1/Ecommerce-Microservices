using Microsoft.EntityFrameworkCore;
using Notification.API.Entities;

namespace Notification.API.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options)
    {
    }

    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmailTemplate>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Code).IsRequired().HasMaxLength(80);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(150);
            entity.Property(t => t.Subject).IsRequired().HasMaxLength(300);
            entity.Property(t => t.BodyHtml).IsRequired();
            entity.Property(t => t.VariablesJson).IsRequired().HasMaxLength(1000);
            entity.HasIndex(t => t.Code).IsUnique();
        });
    }
}
