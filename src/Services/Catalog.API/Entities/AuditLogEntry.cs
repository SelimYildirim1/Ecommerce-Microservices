namespace Catalog.API.Entities;

/// <summary>Admin panelinde yapilan degisikliklerin denetim kaydi.</summary>
public class AuditLogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }

    /// <summary>HTTP metodu + controller/action ozeti (ornek: PUT Products).</summary>
    public string Action { get; set; } = string.Empty;

    public string? EntityType { get; set; }
    public string? EntityId { get; set; }

    public string? OldValues { get; set; }
    public string? NewValues { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
