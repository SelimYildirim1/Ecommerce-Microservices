namespace Catalog.API.Entities;

/// <summary>
/// Anahtar-deger tabanli site ayari. Yeni ayar eklemek migration
/// gerektirmez; grup alani panelde sekmelere ayirmak icin kullanilir.
/// </summary>
public class SiteSetting : BaseEntity
{
    public string Key { get; set; } = default!;
    public string? Value { get; set; }

    /// <summary>Panel sekmesi: general, commerce, shipping, email, social.</summary>
    public string Group { get; set; } = "general";

    public string? Description { get; set; }
}

/// <summary>Anasayfa slider/banner kaydi.</summary>
public class Banner : BaseEntity
{
    public string Title { get; set; } = default!;
    public string? Subtitle { get; set; }
    public string ImageUrl { get; set; } = default!;
    public string? LinkUrl { get; set; }

    /// <summary>home-slider, home-strip, category-top, mega-menu gibi yerlesim adi.</summary>
    public string Placement { get; set; } = "home-slider";

    /// <summary>Mega menu tanitim karti icin bagli kategori (opsiyonel).</summary>
    public Guid? CategoryId { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }

    public Category? Category { get; set; }
}

/// <summary>Hakkimizda, mesafeli satis sozlesmesi gibi statik sayfalar.</summary>
public class StaticPage : BaseEntity
{
    public string Slug { get; set; } = default!;
    public string Title { get; set; } = default!;
    public string Content { get; set; } = string.Empty;

    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }

    public bool IsPublished { get; set; } = true;

    /// <summary>Footer menusunde gosterilsin mi?</summary>
    public bool ShowInFooter { get; set; }

    public int SortOrder { get; set; }
}
