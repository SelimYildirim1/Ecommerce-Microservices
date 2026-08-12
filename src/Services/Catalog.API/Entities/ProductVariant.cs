using System.Text.Json;

namespace Catalog.API.Entities;

/// <summary>
/// Satılan mal. Her varyant ayrı bir SKU, fiyat ve stok bilgisine sahiptir.
/// Dinamik özellikler PostgreSQL JSONB kolonu (Specifics) ile tutulur.
/// 
/// Örnek Specifics (Kıyafet):  { "color": "Red", "size": "XL", "fabric": "Cotton" }
/// Örnek Specifics (Teknoloji): { "ram": "16GB", "cpu": "M2", "storage": "512GB" }
/// </summary>
public class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    /// <summary>Stok Takip Birimi (Stock Keeping Unit). Örn: "TSHIRT-RED-XL"</summary>
    public string Sku { get; set; } = default!;

    public decimal Price { get; set; }

    /// <summary>İndirim öncesi fiyat. Price'dan yüksekse ürün "indirimli" sayılır.</summary>
    public decimal? CompareAtPrice { get; set; }

    public int StockQuantity { get; set; }

    /// <summary>
    /// 🔥 SİHİRLİ ALAN: Tüm dinamik özellik verileri burada durur.
    /// PostgreSQL JSONB kolonu olarak saklanır.
    /// Sektörden bağımsız, esnek yapı sağlar.
    /// </summary>
    public JsonDocument? Specifics { get; set; }

    /// <summary>Varyant aktif mi? (Soft delete için)</summary>
    public bool IsActive { get; set; } = true;
}
