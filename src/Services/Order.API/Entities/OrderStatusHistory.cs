namespace Order.API.Entities;

public class OrderStatusHistory
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string Status { get; set; } = default!;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
