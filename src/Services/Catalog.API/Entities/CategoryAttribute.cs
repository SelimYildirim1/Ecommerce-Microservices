namespace Catalog.API.Entities;

/// <summary>
/// Kategori ile Özellik arasındaki many-to-many ilişki tablosu.
/// Hangi kategoride hangi özellikler olacağını belirler.
/// Örn: "Bilgisayar" kategorisinde RAM, İşlemci, Ekran Kartı özellikleri olur.
/// </summary>
/// <summary>
/// Kategori ile Özellik arasındaki many-to-many ilişki tablosu.
/// Hangi kategoride hangi özellikler olacağını belirler.
/// Örn: "Bilgisayar" kategorisinde RAM, İşlemci, Ekran Kartı özellikleri olur.
/// </summary>
public class CategoryAttribute : BaseEntity
{
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = default!;

    public Guid ProductAttributeId { get; set; }
    public ProductAttribute ProductAttribute { get; set; } = default!;

    /// <summary>Kategori içinde sıralama</summary>
    public int SortOrder { get; set; }

    /// <summary>Sol menüde filtre olarak görünsün mü?</summary>
    public bool IsFilterable { get; set; }
}
