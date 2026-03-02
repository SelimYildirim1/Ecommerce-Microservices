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

    // Navigation
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}
