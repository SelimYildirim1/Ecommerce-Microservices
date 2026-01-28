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

    public string CardName { get; set; } = default!;
    public string CardNumber { get; set; } = default!;
    public string Expiration { get; set; } = default!;
    public string CVV { get; set; } = default!;
}