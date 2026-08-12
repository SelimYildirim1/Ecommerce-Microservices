namespace Catalog.API.Entities;

/// <summary>Arama sorgusu logu — popüler aramalar için.</summary>
public class SearchQueryLog : BaseEntity
{
    public string Query { get; set; } = default!;
    public int HitCount { get; set; } = 1;
    public DateTime LastSearchedAt { get; set; } = DateTime.UtcNow;
}
