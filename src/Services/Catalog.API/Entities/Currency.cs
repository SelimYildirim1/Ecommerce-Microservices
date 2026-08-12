namespace Catalog.API.Entities;

/// <summary>
/// Mağaza para birimi. RateToBase: 1 birim bu para = RateToBase birim varsayılan (base) para.
/// Örn. TRY RateToBase=1, USD RateToBase≈34.5 → fiyat_usd = fiyat_try / 34.5
/// </summary>
public class Currency : BaseEntity
{
    public string Code { get; set; } = default!;
    public string Symbol { get; set; } = default!;
    public string Name { get; set; } = default!;
    public decimal RateToBase { get; set; } = 1m;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}
