using Microsoft.AspNetCore.Mvc;
using Shopping.Aggregator.Models;
using Shopping.Aggregator.Services;

namespace Shopping.Aggregator.Controllers;

/// <summary>
/// Panel raporlari. Veriyi Order, Catalog ve Identity servislerinden toplayip
/// birlestirir; alt servislerin sozlesmeleri degismez.
/// </summary>
[Route("api/aggregator/admin/reports")]
[ApiController]
public class ReportsController : ControllerBase
{
    /// <summary>Ciro sayilirken kabul edilen siparis durumlari.</summary>
    private static readonly string[] RevenueStatuses = { "Paid", "Shipped", "Delivered" };

    private readonly IOrderService _orderService;
    private readonly ICatalogService _catalogService;
    private readonly IIdentityService _identityService;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        IOrderService orderService,
        ICatalogService catalogService,
        IIdentityService identityService,
        ILogger<ReportsController> logger)
    {
        _orderService = orderService;
        _catalogService = catalogService;
        _identityService = identityService;
        _logger = logger;
    }

    /// <summary>Satis raporu: gunluk ciro, durum dagilimi, ortalama sepet.</summary>
    [HttpGet("sales")]
    public async Task<IActionResult> Sales([FromQuery] int days = 30)
    {
        var range = Math.Clamp(days, 1, 365);
        var orders = await SafeCall(() => _orderService.GetAllOrdersAsync(), new List<OrderDto>());

        var from = DateTime.UtcNow.Date.AddDays(-(range - 1));
        var scoped = orders.Where(o => o.OrderDate.Date >= from).ToList();
        var revenueOrders = scoped.Where(o => RevenueStatuses.Contains(o.OrderStatus)).ToList();

        var daily = Enumerable.Range(0, range)
            .Select(i => from.AddDays(i))
            .Select(date => new
            {
                date = date.ToString("yyyy-MM-dd"),
                revenue = revenueOrders.Where(o => o.OrderDate.Date == date).Sum(o => o.TotalAmount),
                orderCount = scoped.Count(o => o.OrderDate.Date == date)
            })
            .ToList();

        var byStatus = scoped
            .GroupBy(o => o.OrderStatus)
            .Select(g => new { status = g.Key, count = g.Count(), total = g.Sum(o => o.TotalAmount) })
            .OrderByDescending(x => x.count)
            .ToList();

        return Ok(new
        {
            days = range,
            totalRevenue = revenueOrders.Sum(o => o.TotalAmount),
            totalOrders = scoped.Count,
            paidOrders = revenueOrders.Count,
            averageOrderValue = revenueOrders.Count > 0
                ? Math.Round(revenueOrders.Average(o => o.TotalAmount), 2)
                : 0m,
            totalDiscount = scoped.Sum(o => o.DiscountAmount),
            totalShipping = scoped.Sum(o => o.ShippingCost),
            daily,
            byStatus
        });
    }

    /// <summary>Urun performansi: en cok satan ve hic satmayan urunler.</summary>
    [HttpGet("products")]
    public async Task<IActionResult> Products([FromQuery] int days = 30, [FromQuery] int top = 20)
    {
        var range = Math.Clamp(days, 1, 365);
        var limit = Math.Clamp(top, 1, 100);

        var ordersTask = SafeCall(() => _orderService.GetAllOrdersAsync(), new List<OrderDto>());
        var productsTask = SafeCall(() => _catalogService.GetAllProductsDetailAsync(), new List<ProductDetailDto>());

        await Task.WhenAll(ordersTask, productsTask);

        var from = DateTime.UtcNow.Date.AddDays(-(range - 1));

        var lines = ordersTask.Result
            .Where(o => o.OrderDate.Date >= from && RevenueStatuses.Contains(o.OrderStatus))
            .SelectMany(o => o.OrderItems)
            .ToList();

        var bestSellers = lines
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new
            {
                productId = g.Key.ProductId,
                productName = g.Key.ProductName,
                unitsSold = g.Sum(i => i.Units),
                revenue = g.Sum(i => i.UnitPrice * i.Units),
                orderCount = g.Count()
            })
            .OrderByDescending(x => x.unitsSold)
            .Take(limit)
            .ToList();

        // Siparis kalemleri varyant kimligi tasiyor; hem urun hem varyant eslesmesi denenir
        var soldIds = lines.Select(i => i.ProductId).ToHashSet();

        var neverSold = productsTask.Result
            .Where(p => p.IsActive)
            .Where(p => !soldIds.Contains(p.Id) && !p.Variants.Any(v => soldIds.Contains(v.Id)))
            .Select(p => new
            {
                productId = p.Id,
                productName = p.Name,
                categoryName = p.CategoryName,
                stock = p.Variants.Where(v => v.IsActive).Sum(v => v.StockQuantity)
            })
            .OrderByDescending(x => x.stock)
            .Take(limit)
            .ToList();

        return Ok(new
        {
            days = range,
            totalUnitsSold = lines.Sum(i => i.Units),
            distinctProductsSold = bestSellers.Count,
            bestSellers,
            neverSold
        });
    }

    /// <summary>Musteri raporu: en cok harcayanlar ve yeni uyeler.</summary>
    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] int days = 30, [FromQuery] int top = 20)
    {
        var range = Math.Clamp(days, 1, 365);
        var limit = Math.Clamp(top, 1, 100);

        var ordersTask = SafeCall(() => _orderService.GetAllOrdersAsync(), new List<OrderDto>());
        var usersTask = SafeCall(() => _identityService.GetAllUsersAsync(), new List<UserDto>());

        await Task.WhenAll(ordersTask, usersTask);

        var orders = ordersTask.Result;
        var users = usersTask.Result;
        var from = DateTime.UtcNow.Date.AddDays(-(range - 1));

        // Siparislerdeki BuyerId kullanici adi ya da kullanici kimligi olabiliyor
        var userLookup = new Dictionary<string, UserDto>();
        foreach (var user in users)
        {
            userLookup[user.Id] = user;
            userLookup[user.UserName] = user;
        }

        var topCustomers = orders
            .Where(o => RevenueStatuses.Contains(o.OrderStatus))
            .GroupBy(o => o.BuyerId)
            .Select(g =>
            {
                userLookup.TryGetValue(g.Key, out var user);

                return new
                {
                    buyerId = g.Key,
                    userName = user?.UserName ?? g.Key,
                    email = user?.Email ?? g.First().EmailAddress ?? "Bilinmiyor",
                    orderCount = g.Count(),
                    totalSpent = g.Sum(o => o.TotalAmount),
                    lastOrderDate = g.Max(o => o.OrderDate)
                };
            })
            .OrderByDescending(x => x.totalSpent)
            .Take(limit)
            .ToList();

        var newUsers = users
            .Where(u => u.CreatedAt.Date >= from)
            .OrderByDescending(u => u.CreatedAt)
            .Take(limit)
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.Email,
                u.CreatedAt,
                u.IsBlocked
            })
            .ToList();

        var buyerIds = orders.Select(o => o.BuyerId).ToHashSet();

        return Ok(new
        {
            days = range,
            totalCustomers = users.Count,
            newCustomers = users.Count(u => u.CreatedAt.Date >= from),
            blockedCustomers = users.Count(u => u.IsBlocked),
            purchasingCustomers = buyerIds.Count,
            topCustomers,
            newUsers
        });
    }

    /// <summary>Stok raporu: Catalog.API'nin stok ozetini oldugu gibi aktarir.</summary>
    [HttpGet("stock")]
    public Task<IActionResult> Stock([FromQuery] bool lowStockOnly = false) =>
        ProxyCatalog($"/api/admin/stock/summary?lowStockOnly={lowStockOnly.ToString().ToLowerInvariant()}");

    /// <summary>Iade raporu: neden ve duruma gore kirilim.</summary>
    [HttpGet("returns")]
    public async Task<IActionResult> Returns([FromQuery] int days = 90)
    {
        var range = Math.Clamp(days, 1, 365);

        var result = await _orderService.GetRawAsync("/api/orders/returns");

        if (result.Content is null)
            return StatusCode(result.StatusCode);

        List<ReturnSummaryRow> rows;
        try
        {
            rows = System.Text.Json.JsonSerializer.Deserialize<List<ReturnSummaryRow>>(
                result.Content,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? new List<ReturnSummaryRow>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "İade raporu ayrıştırılamadı.");
            return Ok(new { days = range, totalRequests = 0, totalRefunded = 0m });
        }

        var from = DateTime.UtcNow.Date.AddDays(-(range - 1));
        var scoped = rows.Where(r => r.RequestedAt.Date >= from).ToList();

        return Ok(new
        {
            days = range,
            totalRequests = scoped.Count,
            pendingRequests = scoped.Count(r => r.StatusName == "Onay bekliyor"),
            totalRefunded = scoped
                .Where(r => r.StatusName == "İadesi yapıldı")
                .Sum(r => r.RefundAmount),
            byStatus = scoped
                .GroupBy(r => r.StatusName)
                .Select(g => new { status = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToList(),
            byReason = scoped
                .GroupBy(r => r.ReasonName)
                .Select(g => new { reason = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToList()
        });
    }

    /// <summary>
    /// Panel bildirim merkezi: dikkat bekleyen is sayilari.
    /// Alt servislerden biri kapaliysa o baslik sifir gorunur, panel calismaya devam eder.
    /// </summary>
    [HttpGet("~/api/aggregator/admin/notifications")]
    public async Task<IActionResult> Notifications()
    {
        var ordersTask = SafeCall(() => _orderService.GetAllOrdersAsync(), new List<OrderDto>());
        var productsTask = SafeCall(() => _catalogService.GetAllProductsDetailAsync(), new List<ProductDetailDto>());
        var returnsTask = SafeCall(() => _orderService.GetRawAsync("/api/orders/returns?status=Pending"), ProxyResult.Empty);
        var reviewsTask = SafeCall(() => _catalogService.GetRawAsync("/api/admin/reviews?approved=false"), ProxyResult.Empty);

        await Task.WhenAll(ordersTask, productsTask, returnsTask, reviewsTask);

        var orders = ordersTask.Result;
        var newOrders = orders.Count(o => o.OrderStatus == "Submitted");

        var lowStock = productsTask.Result
            .Where(p => p.IsActive)
            .SelectMany(p => p.Variants.Where(v => v.IsActive && v.StockQuantity < 10))
            .Count();

        var outOfStock = productsTask.Result
            .Where(p => p.IsActive)
            .SelectMany(p => p.Variants.Where(v => v.IsActive && v.StockQuantity <= 0))
            .Count();

        var pendingReturns = CountArray(returnsTask.Result.Content);
        var pendingReviews = CountArray(reviewsTask.Result.Content);

        var items = new List<object>();

        if (newOrders > 0)
            items.Add(new { type = "orders", title = $"{newOrders} yeni sipariş bekliyor", href = "/orders", count = newOrders, severity = "info" });

        if (pendingReturns > 0)
            items.Add(new { type = "returns", title = $"{pendingReturns} iade talebi onay bekliyor", href = "/returns", count = pendingReturns, severity = "warning" });

        if (pendingReviews > 0)
            items.Add(new { type = "reviews", title = $"{pendingReviews} yorum onay bekliyor", href = "/reviews", count = pendingReviews, severity = "info" });

        if (outOfStock > 0)
            items.Add(new { type = "stock", title = $"{outOfStock} varyantın stoğu tükendi", href = "/stock", count = outOfStock, severity = "danger" });

        if (lowStock > outOfStock)
            items.Add(new { type = "stock", title = $"{lowStock - outOfStock} varyantın stoğu kritik", href = "/stock", count = lowStock - outOfStock, severity = "warning" });

        return Ok(new
        {
            total = newOrders + pendingReturns + pendingReviews + lowStock,
            newOrders,
            pendingReturns,
            pendingReviews,
            lowStock,
            outOfStock,
            items
        });
    }

    /// <summary>JSON dizisindeki eleman sayisi; icerik yoksa sifir.</summary>
    private static int CountArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return 0;

        try
        {
            using var document = System.Text.Json.JsonDocument.Parse(json);

            return document.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array
                ? document.RootElement.GetArrayLength()
                : 0;
        }
        catch
        {
            return 0;
        }
    }

    private async Task<IActionResult> ProxyCatalog(string path)
    {
        try
        {
            var result = await _catalogService.GetRawAsync(path);

            if (result.Content is null) return StatusCode(result.StatusCode);

            return new ContentResult
            {
                StatusCode = result.StatusCode,
                Content = result.Content,
                ContentType = result.ContentType
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Catalog servisine ulaşılamadı.");
            return StatusCode(StatusCodes.Status502BadGateway, "Servise ulaşılamadı.");
        }
    }

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

    /// <summary>Iade raporunun ihtiyac duydugu alanlar.</summary>
    private sealed class ReturnSummaryRow
    {
        public string StatusName { get; set; } = string.Empty;
        public string ReasonName { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public DateTime RequestedAt { get; set; }
    }
}
