namespace Catalog.API.Entities;

/// <summary>
/// Ürün görselleri. Bir ürünün birden fazla görseli olabilir.
/// </summary>
public class ProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    public string Url { get; set; } = default!;

    /// <summary>Ana görsel mi?</summary>
    public bool IsPrimary { get; set; }

    /// <summary>Sıralama</summary>
    public int SortOrder { get; set; }

    /// <summary>image | video</summary>
    public string MediaType { get; set; } = "image";
}
