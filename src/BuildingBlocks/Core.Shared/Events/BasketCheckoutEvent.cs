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

    // Başlatıcı burada sorun çıkarmaz çünkü bu bir CLASS
    public List<OrderItemMessage> BasketItems { get; set; } = new();
}