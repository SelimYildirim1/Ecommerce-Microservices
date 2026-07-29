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
    
    // Kart Bilgileri (geriye dönük; yeni yayınlarda boş)
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }
}
