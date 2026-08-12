namespace Core.Shared.Events;

/// <summary>
/// Ödeme başarılı olduğunda Payment.API tarafından yayımlanır.
/// Order.API dinleyip sipariş durumunu "Paid" yapar.
/// </summary>
public class PaymentSucceededEvent
{
    public Guid OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string Email { get; set; } = default!;
}
