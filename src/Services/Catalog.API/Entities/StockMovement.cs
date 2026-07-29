namespace Catalog.API.Entities;

/// <summary>Stok hareketinin nedeni.</summary>
public enum StockMovementType
{
    /// <summary>Manuel giris (mal kabul).</summary>
    In = 0,

    /// <summary>Manuel cikis (fire, numune).</summary>
    Out = 1,

    /// <summary>Siparis nedeniyle dusulen stok.</summary>
    Sale = 2,

    /// <summary>Iade veya odeme basarisizligi sonrasi geri eklenen stok.</summary>
    Return = 3,

    /// <summary>Sayim farki duzeltmesi.</summary>
    Adjustment = 4
}

/// <summary>
/// Varyant bazli stok hareket kaydi. Stok her degistiginde bir satir yazilir;
/// boylece "stok neden dustu" sorusu izlenebilir olur.
/// </summary>
public class StockMovement : BaseEntity
{
    public Guid ProductVariantId { get; set; }
    public ProductVariant ProductVariant { get; set; } = default!;

    public Guid ProductId { get; set; }

    public StockMovementType Type { get; set; }

    /// <summary>Pozitif giris, negatif cikis.</summary>
    public int Quantity { get; set; }

    public int PreviousStock { get; set; }
    public int NewStock { get; set; }

    /// <summary>Iliskili siparis/iade numarasi gibi serbest referans.</summary>
    public string? Reference { get; set; }

    public string? Note { get; set; }

    /// <summary>Islemi yapan admin veya "system".</summary>
    public string CreatedBy { get; set; } = "system";
}
