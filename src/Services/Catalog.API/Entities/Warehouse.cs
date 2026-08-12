namespace Catalog.API.Entities;

/// <summary>Fiziksel veya sanal depo. Varyant stoku depo bazında tutulabilir.</summary>
public class Warehouse : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }

    public ICollection<ProductVariantStock> Stocks { get; set; } = new List<ProductVariantStock>();
}

/// <summary>Varyantın belirli bir depodaki stok miktarı.</summary>
public class ProductVariantStock : BaseEntity
{
    public Guid ProductVariantId { get; set; }
    public ProductVariant ProductVariant { get; set; } = default!;

    public Guid WarehouseId { get; set; }
    public Warehouse Warehouse { get; set; } = default!;

    public int Quantity { get; set; }
}
