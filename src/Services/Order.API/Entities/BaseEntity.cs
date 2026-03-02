namespace Order.API.Entities;

/// <summary>
/// Tüm entity'lerin ortak alanlarını barındıran temel sınıf.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
