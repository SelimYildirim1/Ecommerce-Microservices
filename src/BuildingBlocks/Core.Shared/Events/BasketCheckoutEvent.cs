namespace Core.Shared.Events;

// Interface değil, CLASS olmalı!
public class BasketCheckoutEvent
{
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    public string AddressLine { get; set; } = default!;
    
    // Geriye dönük uyumluluk — yeni yayınlarda boş bırakılır; PCI için toplanmaz.
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }

    // Kupon ve kargo kirilimi (opsiyonel; eski mesajlarda gelmez, 0 kalir)
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? CouponCode { get; set; }
    public decimal ShippingCost { get; set; }
    public Guid? ShippingCarrierId { get; set; }

    // Adres detayi (opsiyonel; eski mesajlarda gelmez)
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? ZipCode { get; set; }

    // Fatura (opsiyonel)
    public string? InvoiceType { get; set; }
    public string? TaxId { get; set; }
    public string? TaxOffice { get; set; }
    public string? CompanyName { get; set; }

    // Fatura adresi (opsiyonel)
    public bool? BillingSameAsShipping { get; set; }
    public string? BillingAddressLine { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingState { get; set; }
    public string? BillingCountry { get; set; }
    public string? BillingZipCode { get; set; }

    /// <summary>card | bank_transfer | cash_on_delivery</summary>
    public string? PaymentMethod { get; set; }

    /// <summary>Basket tarafinda uretilirse consumer aynisini kullanir.</summary>
    public string? OrderNumber { get; set; }

    public string? OrderNote { get; set; }
    public bool GiftWrap { get; set; }
    public string? GiftMessage { get; set; }

    public List<OrderItemMessage> BasketItems { get; set; } = new();
}