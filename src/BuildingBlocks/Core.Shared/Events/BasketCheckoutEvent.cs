namespace Core.Shared.Events;

// Interface değil, CLASS olmalı!
public class BasketCheckoutEvent
{
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    public string AddressLine { get; set; } = default!;
    
    // Kart Bilgileri
    public string CardName { get; set; } = default!;
    public string CardNumber { get; set; } = default!;
    public string Expiration { get; set; } = default!;
    public string CVV { get; set; } = default!;

    // Başlatıcı burada sorun çıkarmaz çünkü bu bir CLASS
    public List<OrderItemMessage> BasketItems { get; set; } = new();
}