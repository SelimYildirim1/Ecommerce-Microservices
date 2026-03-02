using Microsoft.AspNetCore.Mvc;
using Shopping.Aggregator.Models;
using Shopping.Aggregator.Services;

namespace Shopping.Aggregator.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AggregatorController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ICatalogService _catalogService;
    private readonly IIdentityService _identityService;
    private readonly ILogger<AggregatorController> _logger;

    public AggregatorController(
        IOrderService orderService,
        ICatalogService catalogService,
        IIdentityService identityService,
        ILogger<AggregatorController> logger)
    {
        _orderService = orderService;
        _catalogService = catalogService;
        _identityService = identityService;
        _logger = logger;
    }

    /// <summary>
    /// Admin paneli için tüm verileri tek seferde toplar ve döndürür.
    /// Order API + Catalog API + Identity API'ye paralel istek atar.
    /// </summary>
    [HttpGet("admin-dashboard")]
    public async Task<ActionResult<AdminDashboardResponse>> GetAdminDashboard()
    {
        _logger.LogInformation("Admin dashboard aggregation başlatıldı.");

        // 3 servise PARALEL istek at (sırayla değil, aynı anda!)
        var ordersTask = _orderService.GetAllOrdersAsync();
        var productsTask = _catalogService.GetAllProductsAsync();
        var usersTask = _identityService.GetAllUsersAsync();

        await Task.WhenAll(ordersTask, productsTask, usersTask);

        var orders = ordersTask.Result;
        var products = productsTask.Result;
        var users = usersTask.Result;

        // Kullanıcıları hızlı lookup için dictionary'e al
        var userMap = users.ToDictionary(u => u.UserName, u => u.Email);

        // Son 5 siparişi birleştir
        var recentOrders = orders
            .OrderByDescending(o => o.OrderDate)
            .Take(5)
            .Select(o => new RecentOrderDto
            {
                Id = o.Id,
                BuyerId = o.BuyerId,
                UserEmail = userMap.TryGetValue(o.BuyerId, out var email) ? email : "Bilinmiyor",
                TotalAmount = o.TotalAmount,
                OrderStatus = o.OrderStatus,
                OrderDate = o.OrderDate,
                Items = o.OrderItems.Select(i => new RecentOrderItemDto
                {
                    ProductName = i.ProductName,
                    Units = i.Units,
                    UnitPrice = i.UnitPrice
                }).ToList()
            }).ToList();

        var response = new AdminDashboardResponse
        {
            TotalOrders = orders.Count,
            TotalProducts = products.Count,
            TotalUsers = users.Count,
            RecentOrders = recentOrders
        };

        _logger.LogInformation(
            "Dashboard hazır: {Orders} sipariş, {Products} ürün, {Users} kullanıcı.",
            response.TotalOrders, response.TotalProducts, response.TotalUsers);

        return Ok(response);
    }
}
