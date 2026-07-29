namespace Basket.API.Entities;

public class BasketCheckout
{
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    public string AddressLine { get; set; } = default!;

    // Geriye dönük uyumluluk: eski istemciler gönderebilir; toplanmamalı / loglanmamalı.
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }

    // --- Opsiyonel: kupon ve kargo (gonderilmezse eski davranis korunur) ---

    /// <summary>Uygulanacak kupon kodu.</summary>
    public string? CouponCode { get; set; }

    /// <summary>Secilen kargo firmasi. Bos ise kargo ucreti hesaplanmaz.</summary>
    public Guid? ShippingCarrierId { get; set; }
}

/// <summary>Sepet ozeti istegi.</summary>
public class BasketSummaryRequest
{
    public string UserName { get; set; } = default!;
    public string? CouponCode { get; set; }
    public Guid? ShippingCarrierId { get; set; }
}

/// <summary>Sepet ozeti: ara toplam, indirim, kargo ve genel toplam.</summary>
public class BasketSummary
{
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? AppliedCouponCode { get; set; }
    public string? AppliedCampaignName { get; set; }
    public decimal ShippingCost { get; set; }
    public bool FreeShipping { get; set; }
    public decimal Total { get; set; }
    public string? Message { get; set; }
}
