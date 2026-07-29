using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Order.API.Security;

namespace Order.API.Controllers;

[Route("api/orders")]
[ApiController]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly OrderDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public OrderController(OrderDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    // Admin: Tüm siparişleri getirir (Aggregator tarafından kullanılır)
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders()
    {
        var orders = await _context.Orders
            .Include(nameof(Order.API.Entities.Order.OrderItems))
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var result = orders.Select(MapToDto).ToList();
        return Ok(result);
    }

    // Kullanıcının kendi siparişleri (Admin herkese bakabilir)
    [HttpGet("{buyerId}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrdersByBuyerId(string buyerId)
    {
        if (!CallerIdentity.CanAccessBuyer(User, buyerId))
            return Forbid();

        var orders = await _context.Orders
            .Include(nameof(Order.API.Entities.Order.OrderItems))
            .Where(o => o.BuyerId == buyerId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var result = orders.Select(MapToDto).ToList();
        return Ok(result);
    }

    // Admin: Sipariş durumunu güncelle
    [HttpPut("{orderId:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order is null) return NotFound("Sipariş bulunamadı.");

        var validStatuses = new[] { "Submitted", "Paid", "Shipped", "Delivered", "Cancelled", "Returned" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest($"Geçersiz durum. Geçerli durumlar: {string.Join(", ", validStatuses)}");

        order.SetStatus(request.Status);
        await _context.SaveChangesAsync();

        if (request.Status == "Shipped" && !string.IsNullOrWhiteSpace(order.EmailAddress))
        {
            await _publishEndpoint.Publish(new OrderShippedEvent
            {
                OrderId = order.Id,
                Email = order.EmailAddress,
                TrackingNumber = null
            });
        }

        return Ok(new { order.Id, order.OrderStatus });
    }

    // Tek sipariş detayı — sahibi veya Admin
    [HttpGet("detail/{orderId:guid}")]
    public async Task<ActionResult<OrderDto>> GetOrderDetail(Guid orderId)
    {
        var order = await _context.Orders
            .Include(nameof(Order.API.Entities.Order.OrderItems))
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound();

        if (!CallerIdentity.CanAccessBuyer(User, order.BuyerId))
            return Forbid();

        return Ok(MapToDto(order));
    }

    private static OrderDto MapToDto(Order.API.Entities.Order o) => new()
    {
        Id = o.Id,
        BuyerId = o.BuyerId,
        OrderDate = o.OrderDate,
        OrderStatus = o.OrderStatus,
        TotalAmount = o.TotalAmount,
        TotalPrice = o.TotalAmount,
        DiscountAmount = o.DiscountAmount,
        CouponCode = o.CouponCode,
        ShippingCost = o.ShippingCost,
        Description = o.Description,
        FirstName = o.FirstName,
        LastName = o.LastName,
        EmailAddress = o.EmailAddress,
        AddressLine = o.Address?.Street,
        City = o.Address?.City,
        OrderItems = o.OrderItems.Select(i => new OrderItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            PictureUrl = i.PictureUrl,
            UnitPrice = i.UnitPrice,
            Price = i.UnitPrice,
            Units = i.Units,
            SelectedAttributes = i.SelectedAttributes
        }).ToList()
    };
}

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }

    /// <summary>UnitPrice ile ayni deger; magaza istemcisi bu adi bekliyor.</summary>
    public decimal Price { get; set; }

    public int Units { get; set; }
    public string? SelectedAttributes { get; set; }
}

public class OrderDto
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = default!;
    public decimal TotalAmount { get; set; }

    /// <summary>TotalAmount ile ayni deger; magaza istemcisi bu adi bekliyor.</summary>
    public decimal TotalPrice { get; set; }

    public decimal DiscountAmount { get; set; }
    public string? CouponCode { get; set; }
    public decimal ShippingCost { get; set; }

    public string? Description { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? EmailAddress { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }

    public List<OrderItemDto> OrderItems { get; set; } = new();
}


public record UpdateOrderStatusRequest(string Status);
