namespace Core.Shared.Events;

public class OrderItemMessage
{
    public string ProductId { get; set; } = default!;
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}