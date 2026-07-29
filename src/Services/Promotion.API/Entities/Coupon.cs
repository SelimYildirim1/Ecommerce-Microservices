namespace Promotion.API.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public enum DiscountType
{
    /// <summary>Yuzde indirim (Value = 10 → %10)</summary>
    Percentage = 0,

    /// <summary>Sabit tutar indirimi (Value = 50 → 50 TL)</summary>
    FixedAmount = 1,

    /// <summary>Kargo bedava</summary>
    FreeShipping = 2
}

/// <summary>Kullanicinin kod girerek uyguladigi indirim.</summary>
public class Coupon : BaseEntity
{
    public string Code { get; set; } = default!;
    public string? Description { get; set; }

    public DiscountType DiscountType { get; set; }
    public decimal Value { get; set; }

    /// <summary>Kuponun gecerli olmasi icin gereken minimum sepet tutari.</summary>
    public decimal MinBasketAmount { get; set; }

    /// <summary>Yuzde indirimlerde uygulanacak ust sinir. 0 = sinirsiz.</summary>
    public decimal MaxDiscountAmount { get; set; }

    /// <summary>Toplam kullanim hakki. 0 = sinirsiz.</summary>
    public int UsageLimit { get; set; }

    /// <summary>Kullanici basina kullanim hakki. 0 = sinirsiz.</summary>
    public int PerUserLimit { get; set; }

    public int UsedCount { get; set; }

    public DateTime ValidFrom { get; set; } = DateTime.UtcNow;
    public DateTime ValidTo { get; set; } = DateTime.UtcNow.AddYears(1);

    public bool IsActive { get; set; } = true;

    /// <summary>Virgulle ayrilmis kategori Id listesi. Bos = tum kategoriler.</summary>
    public string? CategoryIds { get; set; }

    /// <summary>Virgulle ayrilmis urun Id listesi. Bos = tum urunler.</summary>
    public string? ProductIds { get; set; }

    public ICollection<CouponUsage> Usages { get; set; } = new List<CouponUsage>();
}

public class CouponUsage : BaseEntity
{
    public Guid CouponId { get; set; }
    public Coupon Coupon { get; set; } = default!;

    public string UserName { get; set; } = default!;
    public string? OrderId { get; set; }
    public decimal DiscountAmount { get; set; }
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Kod gerektirmeyen, kosullari saglandiginda otomatik uygulanan kampanya.</summary>
public class Campaign : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    public DiscountType DiscountType { get; set; }
    public decimal Value { get; set; }
    public decimal MinBasketAmount { get; set; }
    public decimal MaxDiscountAmount { get; set; }

    public DateTime ValidFrom { get; set; } = DateTime.UtcNow;
    public DateTime ValidTo { get; set; } = DateTime.UtcNow.AddYears(1);

    public bool IsActive { get; set; } = true;

    public string? CategoryIds { get; set; }
    public string? ProductIds { get; set; }

    /// <summary>Birden fazla kampanya uyarsa buyuk oncelikli olan secilir.</summary>
    public int Priority { get; set; }
}
