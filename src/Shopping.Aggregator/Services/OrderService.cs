using Shopping.Aggregator.Models;
using System.Net.Http.Json;

namespace Shopping.Aggregator.Services;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllOrdersAsync();
    Task<OrderDto?> GetOrderDetailAsync(Guid orderId);
    Task<bool> UpdateOrderStatusAsync(Guid orderId, string status);
}

public class OrderService : IOrderService
{
    private readonly HttpClient _httpClient;

    public OrderService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<OrderDto>> GetAllOrdersAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<OrderDto>>("/api/orders/all");
        return result ?? new List<OrderDto>();
    }

    public async Task<OrderDto?> GetOrderDetailAsync(Guid orderId)
    {
        return await _httpClient.GetFromJsonAsync<OrderDto>($"/api/orders/detail/{orderId}");
    }

    public async Task<bool> UpdateOrderStatusAsync(Guid orderId, string status)
    {
        var response = await _httpClient.PutAsJsonAsync($"/api/orders/{orderId}/status", new { Status = status });
        return response.IsSuccessStatusCode;
    }
}
