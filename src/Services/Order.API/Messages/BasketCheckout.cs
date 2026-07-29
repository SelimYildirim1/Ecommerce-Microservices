namespace Basket.API.Entities; // Namespace AYNI kalsın

// DİKKAT: Sınıf ismini 'BasketCheckoutEvent'ten 'BasketCheckout'a çevirdik!
public class BasketCheckout 
{
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    
    public string AddressLine { get; set; } = default!;
    public string Country { get; set; } = default!;
    public string State { get; set; } = default!;
    public string ZipCode { get; set; } = default!;

    // Geriye dönük uyumluluk — yeni istemciler göndermez
    public string? CardName { get; set; }
    public string? CardNumber { get; set; }
    public string? Expiration { get; set; }
    public string? CVV { get; set; }
}