using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.API.Data;

namespace Order.API.Controllers;

[Route("api/orders")]
[ApiController]
public class OrderController : ControllerBase
{
    private readonly OrderDbContext _context;

    public OrderController(OrderDbContext context)
    {
        _context = context;
    }

    // Admin: Tüm siparişleri getirir (Aggregator tarafından kullanılır)
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders()
    {
        var orders = await _context.Orders
            .Include("_orderItems")
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var result = orders.Select(MapToDto).ToList();
        return Ok(result);
    }

    // Kullanıcının kendi siparişleri
    [HttpGet("{buyerId}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrdersByBuyerId(string buyerId)
    {
        var orders = await _context.Orders
            .Include("_orderItems")
            .Where(o => o.BuyerId == buyerId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var result = orders.Select(MapToDto).ToList();
        return Ok(result);
    }

    // Admin: Sipariş durumunu güncelle
    [HttpPut("{orderId:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order is null) return NotFound("Sipariş bulunamadı.");

        var validStatuses = new[] { "Submitted", "Paid", "Shipped", "Delivered", "Cancelled" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest($"Geçersiz durum. Geçerli durumlar: {string.Join(", ", validStatuses)}");

        order.SetStatus(request.Status);
        await _context.SaveChangesAsync();
        return Ok(new { order.Id, order.OrderStatus });
    }

    // Admin: Tek sipariş detayı
    [HttpGet("detail/{orderId:guid}")]
    public async Task<ActionResult<OrderDto>> GetOrderDetail(Guid orderId)
    {
        var order = await _context.Orders
            .Include("_orderItems")
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound();
        return Ok(MapToDto(order));
    }

    private static OrderDto MapToDto(Order.API.Entities.Order o) => new()
    {
        Id = o.Id,
        BuyerId = o.BuyerId,
        OrderDate = o.OrderDate,
        OrderStatus = o.OrderStatus,
        TotalAmount = o.TotalAmount,
        Description = o.Description,
        OrderItems = o.OrderItems.Select(i => new OrderItemDto
        {
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            PictureUrl = i.PictureUrl,
            UnitPrice = i.UnitPrice,
            Units = i.Units
        }).ToList()
    };
}

public class OrderItemDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Units { get; set; }
}

public class OrderDto
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string? Description { get; set; }
    public List<OrderItemDto> OrderItems { get; set; } = new();
}


public record UpdateOrderStatusRequest(string Status);
