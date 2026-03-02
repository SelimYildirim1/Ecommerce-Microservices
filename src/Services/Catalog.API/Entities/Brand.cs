namespace Catalog.API.Entities;

/// <summary>
/// Marka. Örn: Apple, Samsung, Nike, Zara...
/// </summary>
public class Brand : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }

    // Navigation
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
