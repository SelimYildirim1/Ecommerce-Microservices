namespace Shipping.API.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>Kargo firmasi.</summary>
public class Carrier : BaseEntity
{
    public string Name { get; set; } = default!;

    /// <summary>Mock adaptor secimi icin kisa kod: aras, yurtici, mng, ptt.</summary>
    public string Code { get; set; } = default!;

    public string? LogoUrl { get; set; }

    /// <summary>Takip linki sablonu; {trackingNumber} yer tutucusu ile.</summary>
    public string? TrackingUrlTemplate { get; set; }

    /// <summary>Tahmini teslim suresi (gun).</summary>
    public int EstimatedDays { get; set; } = 3;

    public bool IsActive { get; set; } = true;

    public ICollection<ShippingRate> Rates { get; set; } = new List<ShippingRate>();
}

/// <summary>
/// Kargo fiyat kurali. Desi ve sepet tutari araliklarina gore ucret belirler.
/// Daha dar araliga sahip kural once uygulanir.
/// </summary>
public class ShippingRate : BaseEntity
{
    public Guid CarrierId { get; set; }
    public Carrier Carrier { get; set; } = default!;

    public decimal MinDesi { get; set; }
    public decimal MaxDesi { get; set; } = 999;

    public decimal MinBasketAmount { get; set; }

    /// <summary>0 = ust sinir yok.</summary>
    public decimal MaxBasketAmount { get; set; }

    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Magaza geneli kargo ayarlari. Tek satir tutulur.</summary>
public class ShippingSettings : BaseEntity
{
    /// <summary>Bu tutarin uzerinde kargo ucretsiz. 0 = kapali.</summary>
    public decimal FreeShippingThreshold { get; set; }

    /// <summary>Hicbir kural eslesmezse uygulanacak ucret.</summary>
    public decimal DefaultPrice { get; set; } = 49.90m;

    /// <summary>Urun basina varsayilan desi (urun bazli desi henuz yok).</summary>
    public decimal DefaultDesiPerItem { get; set; } = 1;
}

public enum ShipmentStatus
{
    Pending = 0,
    Preparing = 1,
    Shipped = 2,
    InTransit = 3,
    Delivered = 4,
    Returned = 5,
    Cancelled = 6
}

/// <summary>Siparise bagli kargo gonderisi.</summary>
public class Shipment : BaseEntity
{
    public string OrderId { get; set; } = default!;
    public string? UserName { get; set; }

    public Guid? CarrierId { get; set; }
    public Carrier? Carrier { get; set; }

    public string? TrackingNumber { get; set; }
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Pending;

    public decimal ShippingCost { get; set; }
    public string? RecipientName { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }

    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
}
