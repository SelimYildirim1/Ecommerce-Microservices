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

    // Adres detayi (opsiyonel)
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? ZipCode { get; set; }

    // Fatura (opsiyonel)
    public string? InvoiceType { get; set; }
    public string? TaxId { get; set; }
    public string? TaxOffice { get; set; }
    public string? CompanyName { get; set; }

    public bool? BillingSameAsShipping { get; set; }
    public string? BillingAddressLine { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingState { get; set; }
    public string? BillingCountry { get; set; }
    public string? BillingZipCode { get; set; }

    /// <summary>card | bank_transfer | cash_on_delivery</summary>
    public string? PaymentMethod { get; set; }

    public string? OrderNote { get; set; }
    public bool GiftWrap { get; set; }
    public string? GiftMessage { get; set; }
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
