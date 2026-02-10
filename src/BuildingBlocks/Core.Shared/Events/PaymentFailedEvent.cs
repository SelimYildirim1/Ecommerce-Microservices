namespace Core.Shared.Events;

/// <summary>
/// Ödeme başarısız olduğunda Payment.API tarafından yayımlanır.
/// Catalog.API dinleyip düşülen stoğu geri ekler (Compensating Transaction).
/// </summary>
public class PaymentFailedEvent
{
    public Guid OrderId { get; set; }
    public string Email { get; set; } = default!;
    public string Reason { get; set; } = default!;
    public List<OrderItemMessage> OrderItems { get; set; } = new();
}
