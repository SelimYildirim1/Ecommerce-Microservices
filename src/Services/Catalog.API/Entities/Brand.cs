namespace Catalog.API.Entities;

/// <summary>
/// Marka. Örn: Apple, Samsung, Nike, Zara...
/// </summary>
public class Brand : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }

    /// <summary>URL dostu ad. Boş bırakılırsa Name'den üretilir.</summary>
    public string? Slug { get; set; }

    /// <summary>
    /// Slug degistiginde onceki deger burada saklanir. Eski baglantilar
    /// by-slug ucundan yine bulunur ve vitrin kalici yonlendirme dondurur.
    /// </summary>
    public string? LegacySlug { get; set; }
    public string? Description { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }

    // Navigation
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
