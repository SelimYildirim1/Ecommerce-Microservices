namespace Core.Shared.Events;

/// <summary>
/// Sipariş oluşturulduğunda yayımlanır.
/// Payment.API ödeme alır; Catalog.API OrderItems ile stok düşer.
/// </summary>
public class OrderCreatedEvent
{
    public Guid OrderId { get; set; }
    public string BuyerId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public decimal TotalPrice { get; set; }

    public List<OrderItemMessage> OrderItems { get; set; } = new();

    // Geriye dönük uyumluluk — yeni yayınlarda boş
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }
}