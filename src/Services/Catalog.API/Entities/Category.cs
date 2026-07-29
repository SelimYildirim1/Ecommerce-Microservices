namespace Catalog.API.Entities;

/// <summary>
/// Ağaç yapısında kategori. ParentId ile alt kategori mantığı sağlanır.
/// Örn: Elektronik > Bilgisayar > Dizüstü
/// </summary>
public class Category : BaseEntity
{
    public string Name { get; set; } = default!;

    /// <summary>Üst kategori ID'si. null ise kök kategoridir.</summary>
    public Guid? ParentId { get; set; }

    /// <summary>Vitrindeki kategori görseli. Boşsa kategori görsel şeridinde gösterilmez.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Vitrinde ve menüde sıralama; küçük olan önce gelir.</summary>
    public int SortOrder { get; set; }

    // Navigation
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();

    /// <summary>Bu kategorideki ürünlerin sahip olması gereken özellikler</summary>
    public ICollection<CategoryAttribute> CategoryAttributes { get; set; } = new List<CategoryAttribute>();

    public ICollection<Product> Products { get; set; } = new List<Product>();
}
