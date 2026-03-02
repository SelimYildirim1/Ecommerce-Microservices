using Microsoft.AspNetCore.Mvc;
using Shopping.Aggregator.Models;
using Shopping.Aggregator.Services;

namespace Shopping.Aggregator.Controllers;

[Route("api/aggregator/admin")]
[ApiController]
public class AdminController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ICatalogService _catalogService;
    private readonly IIdentityService _identityService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IOrderService orderService,
        ICatalogService catalogService,
        IIdentityService identityService,
        ILogger<AdminController> logger)
    {
        _orderService = orderService;
        _catalogService = catalogService;
        _identityService = identityService;
        _logger = logger;
    }

    /// <summary>Dashboard özet verileri - paralel istek</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        var ordersTask = SafeCall(() => _orderService.GetAllOrdersAsync(), new List<OrderDto>());
        var productsTask = SafeCall(() => _catalogService.GetAllProductsDetailAsync(), new List<ProductDetailDto>());
        var usersTask = SafeCall(() => _identityService.GetAllUsersAsync(), new List<UserDto>());

        await Task.WhenAll(ordersTask, productsTask, usersTask);

        var orders = ordersTask.Result;
        var products = productsTask.Result;
        var users = usersTask.Result;

        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        // Son 7 günlük satış grafiği verisi
        var dailySales = Enumerable.Range(0, 7)
            .Select(i => sevenDaysAgo.AddDays(i).Date)
            .Select(date => new DailySalesDto
            {
                Date = date.ToString("yyyy-MM-dd"),
                TotalSales = orders
                    .Where(o => o.OrderDate.Date == date && o.OrderStatus == "Paid")
                    .Sum(o => o.TotalAmount),
                OrderCount = orders.Count(o => o.OrderDate.Date == date)
            }).ToList();

        // Stok alarmı veren ürünler (varyant bazında stok < 10)
        var lowStockProducts = products
            .Where(p => p.IsActive && p.Variants.Any(v => v.IsActive && v.StockQuantity < 10))
            .Select(p => new LowStockProductDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Variants = p.Variants
                    .Where(v => v.IsActive && v.StockQuantity < 10)
                    .Select(v => new LowStockVariantDto
                    {
                        VariantId = v.Id,
                        Sku = v.Sku,
                        StockQuantity = v.StockQuantity
                    }).ToList()
            }).Take(10).ToList();

        // Son 5 sipariş
        var userMap = users.ToDictionary(u => u.UserName, u => u.Email);
        var recentOrders = orders
            .OrderByDescending(o => o.OrderDate)
            .Take(5)
            .Select(o => new DashboardOrderDto
            {
                Id = o.Id,
                BuyerId = o.BuyerId,
                UserEmail = userMap.TryGetValue(o.BuyerId, out var email) ? email : "Bilinmiyor",
                TotalAmount = o.TotalAmount,
                OrderStatus = o.OrderStatus,
                OrderDate = o.OrderDate
            }).ToList();

        return Ok(new DashboardSummaryResponse
        {
            TotalSales = orders.Where(o => o.OrderStatus == "Paid").Sum(o => o.TotalAmount),
            ActiveOrders = orders.Count(o => o.OrderStatus is "Submitted" or "Paid"),
            TotalProducts = products.Count,
            NewUsers = users.Count,
            DailySales = dailySales,
            RecentOrders = recentOrders,
            LowStockProducts = lowStockProducts
        });
    }

    /// <summary>Sipariş listesi</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _orderService.GetAllOrdersAsync();
        return Ok(orders.OrderByDescending(o => o.OrderDate));
    }

    /// <summary>Sipariş detayı</summary>
    [HttpGet("orders/{orderId:guid}")]
    public async Task<IActionResult> GetOrderDetail(Guid orderId)
    {
        var order = await _orderService.GetOrderDetailAsync(orderId);
        if (order is null) return NotFound();
        return Ok(order);
    }

    /// <summary>Sipariş durumu güncelle</summary>
    [HttpPut("orders/{orderId:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid orderId, [FromBody] UpdateStatusRequest req)
    {
        var success = await _orderService.UpdateOrderStatusAsync(orderId, req.Status);
        if (!success) return BadRequest("Durum güncellenemedi.");
        return Ok(new { orderId, req.Status });
    }

    /// <summary>Ürün listesi (detaylı)</summary>
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts()
    {
        var products = await _catalogService.GetAllProductsDetailAsync();
        return Ok(products);
    }

    /// <summary>Ürün detayı</summary>
    [HttpGet("products/{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        var product = await _catalogService.GetProductByIdAsync(id);
        if (product is null) return NotFound();
        return Ok(product);
    }

    /// <summary>Kategori ağacı</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _catalogService.GetCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>Kategori detayı (attribute'larıyla)</summary>
    [HttpGet("categories/{id:guid}")]
    public async Task<IActionResult> GetCategory(Guid id)
    {
        var category = await _catalogService.GetCategoryByIdAsync(id);
        if (category is null) return NotFound();
        return Ok(category);
    }

    /// <summary>Tüm attribute'lar</summary>
    [HttpGet("attributes")]
    public async Task<IActionResult> GetAttributes()
    {
        var attrs = await _catalogService.GetAttributesAsync();
        return Ok(attrs);
    }

    /// <summary>Tüm markalar</summary>
    [HttpGet("brands")]
    public async Task<IActionResult> GetBrands()
    {
        var brands = await _catalogService.GetBrandsAsync();
        return Ok(brands);
    }

    /// <summary>Servis çağrısı başarısız olursa varsayılan değer döner</summary>
    private async Task<T> SafeCall<T>(Func<Task<T>> call, T fallback)
    {
        try
        {
            return await call();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Servis çağrısı başarısız, varsayılan değer kullanılıyor.");
            return fallback;
        }
    }
}

// Dashboard DTOs
public record UpdateStatusRequest(string Status);

public class DashboardSummaryResponse
{
    public decimal TotalSales { get; set; }
    public int ActiveOrders { get; set; }
    public int TotalProducts { get; set; }
    public int NewUsers { get; set; }
    public List<DailySalesDto> DailySales { get; set; } = new();
    public List<DashboardOrderDto> RecentOrders { get; set; } = new();
    public List<LowStockProductDto> LowStockProducts { get; set; } = new();
}

public class DailySalesDto
{
    public string Date { get; set; } = default!;
    public decimal TotalSales { get; set; }
    public int OrderCount { get; set; }
}

public class DashboardOrderDto
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public string UserEmail { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string OrderStatus { get; set; } = default!;
    public DateTime OrderDate { get; set; }
}

public class LowStockProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public List<LowStockVariantDto> Variants { get; set; } = new();
}

public class LowStockVariantDto
{
    public Guid VariantId { get; set; }
    public string Sku { get; set; } = default!;
    public int StockQuantity { get; set; }
}
