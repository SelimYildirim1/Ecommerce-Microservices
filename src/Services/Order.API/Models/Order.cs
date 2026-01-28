namespace Order.API.Models;

public class Order
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }

    // Kişisel Bilgiler
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;

    // Adres Bilgileri
    public string AddressLine { get; set; } = default!;
    public string Country { get; set; } = default!;
    public string State { get; set; } = default!;
    public string ZipCode { get; set; } = default!;

    // Ödeme Durumu (İleride kullanacağız)
    public string PaymentStatus { get; set; } = "Pending"; 

    public DateTime CreatedDate { get; set; }
}