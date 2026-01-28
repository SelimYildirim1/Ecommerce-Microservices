using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Order.API.Data;

namespace Order.API.Controllers;

// Ocelot downstream path: /api/orders/{userName}
// Bu yüzden route'u sabit "api/orders" yapıyoruz.
[Route("api/orders")]
[ApiController]
public class OrderController : ControllerBase
{
    private readonly OrderDbContext _context;

    public OrderController(OrderDbContext context)
    {
        _context = context;
    }

    // Kullanıcının sadece kendi siparişlerini görebilmesi için
    // username (bizde aslında userId) üzerinden filtreliyoruz.
    [HttpGet("{userName}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrdersByUserName(string userName)
    {
        // Veritabanından kullanıcı adına göre siparişleri çekiyoruz
        var orders = await _context.Orders
            .Include(o => o.OrderItems)
            .Where(o => o.UserName == userName)
            .OrderByDescending(o => o.CreatedDate)
            .ToListAsync();

        // Entity -> DTO map'liyoruz
        var result = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            OrderDate = o.CreatedDate,
            // Sipariş durumu artık entity'den okunuyor
            OrderStatus = o.OrderStatus,
            TotalPrice = o.TotalPrice,
            OrderItems = o.OrderItems.Select(i => new OrderItemDto
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                // Şu an veritabanında resim alanı yok; frontend için boş geçiyoruz.
                PictureUrl = null,
                Price = i.Price,
                Units = i.Quantity
            }).ToList()
        }).ToList();

        return Ok(result);
    }
}

public class OrderItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal Price { get; set; }
    public int Units { get; set; }
}

public class OrderDto
{
    public Guid Id { get; set; }
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = default!;
    public decimal TotalPrice { get; set; }
    public List<OrderItemDto> OrderItems { get; set; } = new();
}

