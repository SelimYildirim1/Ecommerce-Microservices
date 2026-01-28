namespace Core.Shared.Events;

// BasketCheckoutEvent interface'ini implement eden somut sınıf
// MassTransit'in anonim tiplerle yaşadığı sorunları önlemek için
public class BasketCheckoutEventMessage : BasketCheckoutEvent
{
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    
    // Adres Bilgileri
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    public string AddressLine { get; set; } = default!;
    
    // Kart Bilgileri (Payment için gerekli)
    public string CardName { get; set; } = default!;
    public string CardNumber { get; set; } = default!;
    public string Expiration { get; set; } = default!;
    public string CVV { get; set; } = default!;
}
