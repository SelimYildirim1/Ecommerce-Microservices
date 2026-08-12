namespace Core.Shared.Events;

/// <summary>
/// Stok başarıyla ayrıldığında (Reserve) yayımlanır.
/// Payment.API bu eventi dinleyip ödemeyi çeker.
/// </summary>
public class StockReservedEvent
{
    public Guid OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string BuyerId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public decimal TotalPrice { get; set; }

    // Geriye dönük uyumluluk — yeni yayınlarda boş; mock ödeme kart kullanmaz
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }
    
    // Payment başarısız olursa Catalog servisi stokları iade edebilmeli.
    // Bu yüzden hangi ürünlerden ne kadar düştüğümüzü taşıyoruz.
    public List<OrderItemMessage> OrderItems { get; set; } = new();
}
