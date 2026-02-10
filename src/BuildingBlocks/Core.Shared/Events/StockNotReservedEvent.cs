namespace Core.Shared.Events;

/// <summary>
/// Stok ayırma işlemi başarısız olduğunda (yetersiz stok) yayımlanır.
/// Order.API veya Notification.API bu eventi dinleyip kullanıcıya bilgi verir, sipariş durumunu günceller.
/// </summary>
public class StockNotReservedEvent
{
    public Guid OrderId { get; set; }
    public string BuyerId { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string Reason { get; set; } = default!;
}
