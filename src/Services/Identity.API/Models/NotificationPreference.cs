namespace Identity.API.Models;

public class NotificationPreference
{
    public int Id { get; set; }
    public string UserId { get; set; } = default!;
    public ApplicationUser User { get; set; } = default!;

    public bool OrderUpdates { get; set; } = true;
    public bool Campaigns { get; set; } = true;
    public bool Newsletter { get; set; } = true;
    public bool Sms { get; set; } = false;

    /// <summary>Stok gelince / tükeniyor bildirimleri.</summary>
    public bool StockAlerts { get; set; } = true;

    /// <summary>İndirim ve fiyat düşüşü bildirimleri.</summary>
    public bool PriceDrops { get; set; } = true;
}
