namespace Shopping.Aggregator.Models;

// Admin paneline tek seferde döndürülen birleşik yanıt
public class AdminDashboardResponse
{
    public int TotalOrders { get; set; }
    public int TotalProducts { get; set; }
    public int TotalUsers { get; set; }
    public List<RecentOrderDto> RecentOrders { get; set; } = new();
}

public class RecentOrderDto
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public string UserEmail { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string OrderStatus { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public List<RecentOrderItemDto> Items { get; set; } = new();
}

public class RecentOrderItemDto
{
    public string ProductName { get; set; } = default!;
    public int Units { get; set; }
    public decimal UnitPrice { get; set; }
}
