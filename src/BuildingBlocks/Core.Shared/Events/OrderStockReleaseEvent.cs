namespace Core.Shared.Events;

/// <summary>
/// Sipariş iptal veya iade tamamlandığında stok iadesi için yayımlanır.
/// PaymentFailedEvent semantiğini bozmaz; Catalog aynı ledger mantığıyla dinler.
/// </summary>
public class OrderStockReleaseEvent
{
    public Guid OrderId { get; set; }
    public string Reason { get; set; } = default!;
    public string ReleaseType { get; set; } = "Cancel"; // Cancel | Refund | Return
    public List<OrderItemMessage> OrderItems { get; set; } = new();

    /// <summary>
    /// Ledger tekrar kontrolu icin kullanilan anahtar. Kismi iadelerde her talep
    /// kendi anahtarini gonderir; bos ise OrderId kullanilir (eski davranis).
    /// </summary>
    public string? ReferenceKey { get; set; }
}
