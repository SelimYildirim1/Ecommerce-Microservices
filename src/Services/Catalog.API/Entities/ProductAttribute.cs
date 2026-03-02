namespace Catalog.API.Entities;

/// <summary>
/// Özellik tanımı. Örn: Renk, Beden, RAM, İşlemci, Kumaş Tipi...
/// Her sektör kendi özelliklerini tanımlar.
/// </summary>
public class ProductAttribute : BaseEntity
{
    /// <summary>Özellik adı. Örn: "Ekran Kartı", "Renk", "Beden"</summary>
    public string Name { get; set; } = default!;

    /// <summary>Kod tarafında kullanılacak kısa isim. Örn: "gpu", "color", "size"</summary>
    public string Code { get; set; } = default!;

    /// <summary>Veri tipi: "Text", "Number", "Select", "Color", "Boolean"</summary>
    public string DataType { get; set; } = default!;

    /// <summary>Eğer DataType = "Select" ise seçenekler. Örn: "Nvidia,AMD,Intel"</summary>
    public string? Options { get; set; }

    /// <summary>Bu özellik zorunlu mu?</summary>
    public bool IsRequired { get; set; }

    /// <summary>Bu özellik varyant oluşturur mu? (Renk=Evet, Ağırlık=Hayır)</summary>
    public bool IsVariant { get; set; }

    // Navigation
    public ICollection<CategoryAttribute> CategoryAttributes { get; set; } = new List<CategoryAttribute>();
}
