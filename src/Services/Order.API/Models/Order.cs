namespace Order.API.Models;

public class Order
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public decimal TotalAmount { get; set; }

    // Adres Bilgileri
    public string Street { get; set; } = default!;
    public string City { get; set; } = default!;
    public string Country { get; set; } = default!;
    public string State { get; set; } = default!;
    public string ZipCode { get; set; } = default!;

    public string OrderStatus { get; set; } = "Submitted";
    public string? Description { get; set; }

    public DateTime OrderDate { get; set; }
}
