using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Notification.API.Data;
using Notification.API.Entities;
using Notification.API.Services;

namespace Notification.API.Data;

public static class NotificationDbSeeder
{
    public static async Task SeedAsync(NotificationDbContext context, CancellationToken ct = default)
    {
        await context.Database.EnsureCreatedAsync(ct);

        var seeds = EmailTemplates.SeedDefinitions();
        var existing = await context.EmailTemplates.Select(t => t.Code).ToListAsync(ct);
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var seed in seeds)
        {
            if (existingSet.Contains(seed.Code)) continue;

            context.EmailTemplates.Add(new EmailTemplate
            {
                Code = seed.Code,
                Name = seed.Name,
                Subject = seed.Subject,
                BodyHtml = seed.BodyHtml,
                VariablesJson = JsonSerializer.Serialize(seed.Variables),
                IsActive = true
            });
        }

        if (context.ChangeTracker.HasChanges())
            await context.SaveChangesAsync(ct);
    }
}
