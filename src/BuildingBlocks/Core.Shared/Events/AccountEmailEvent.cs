namespace Core.Shared.Events;

/// <summary>Identity / Order gibi servislerden Notification'a e-posta isteği.</summary>
public class AccountEmailEvent
{
    public string Email { get; set; } = default!;
    public string Subject { get; set; } = default!;
    public string HtmlBody { get; set; } = default!;
}

/// <summary>Sipariş kargoya verildiğinde müşteriye bildirim.</summary>
public class OrderShippedEvent
{
    public Guid OrderId { get; set; }
    public string Email { get; set; } = default!;
    public string? TrackingNumber { get; set; }
}
