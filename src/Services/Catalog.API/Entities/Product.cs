namespace Catalog.API.Entities;

/// <summary>
/// Vitrindeki ürün. Fiyat ve stok bilgisi varyantlarda tutulur.
/// Product sadece "ne satıyoruz" sorusuna cevap verir.
/// </summary>
public class Product : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;

    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = default!;

    public Guid BrandId { get; set; }
    public Brand Brand { get; set; } = default!;

    /// <summary>Ürün aktif mi? (Soft delete)</summary>
    public bool IsActive { get; set; } = true;

    // --- SEO ---
    /// <summary>URL dostu ad. Bos birakilirsa Name'den uretilir.</summary>
    public string? Slug { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }

    // Navigation
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductReview> Reviews { get; set; } = new List<ProductReview>();
}
