namespace Order.API.Entities;

public class Order
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    
    // Adres Bilgileri (Basit tutuyoruz)
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string EmailAddress { get; set; } = default!;
    public string AddressLine { get; set; } = default!;
    
    // Sipariş Tarihi
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Sipariş Durumu (Submitted, Paid, Cancelled vb.)
    public string OrderStatus { get; set; } = "Submitted";

    // Siparişin İçindeki Ürünler (İlişki)
    public List<OrderItem> OrderItems { get; set; } = new();
}