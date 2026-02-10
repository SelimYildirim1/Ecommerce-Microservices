namespace Core.Shared.Events;

/// <summary>
/// Stok başarıyla ayrıldığında (Reserve) yayımlanır.
/// Payment.API bu eventi dinleyip ödemeyi çeker.
/// </summary>
public class StockReservedEvent
{
    public Guid OrderId { get; set; }
    public string BuyerId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public decimal TotalPrice { get; set; }

    // Ödeme için gerekli bilgiler
    public string CardName { get; set; } = default!;
    public string CardNumber { get; set; } = default!;
    public string Expiration { get; set; } = default!;
    public string CVV { get; set; } = default!;
    
    // Payment başarısız olursa Catalog servisi stokları iade edebilmeli.
    // Bu yüzden hangi ürünlerden ne kadar düştüğümüzü taşıyoruz.
    public List<OrderItemMessage> OrderItems { get; set; } = new();
}
