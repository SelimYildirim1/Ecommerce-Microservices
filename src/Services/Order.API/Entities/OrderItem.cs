namespace Order.API.Entities;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; } // Hangi ürün?
    public string ProductName { get; set; } = default!;
    public decimal Price { get; set; }
    public int Quantity { get; set; } // Kaç tane?
    
    // Hangi siparişe ait? (Foreign Key)
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;
}