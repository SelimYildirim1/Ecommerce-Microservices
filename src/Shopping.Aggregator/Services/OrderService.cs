using Shopping.Aggregator.Models;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Shopping.Aggregator.Services;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllOrdersAsync();
    Task<OrderDto?> GetOrderDetailAsync(Guid orderId);
    Task<bool> UpdateOrderStatusAsync(Guid orderId, string status);

    // Iade akisi Order.API'ye seffaf sekilde iletilir
    Task<ProxyResult> GetRawAsync(string path);
    Task<ProxyResult> PostAsync(string path, JsonElement? body);
    Task<ProxyResult> PutAsync(string path, JsonElement? body);
}

public class OrderService : IOrderService
{
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public OrderService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
    {
        _httpClient = httpClient;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<List<OrderDto>> GetAllOrdersAsync()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/orders/all");
        ApplyIncomingAuth(request);
        using var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<List<OrderDto>>();
        return result ?? new List<OrderDto>();
    }

    public async Task<OrderDto?> GetOrderDetailAsync(Guid orderId)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/orders/detail/{orderId}");
        ApplyIncomingAuth(request);
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<OrderDto>();
    }

    public async Task<bool> UpdateOrderStatusAsync(Guid orderId, string status)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/api/orders/{orderId}/status")
        {
            Content = JsonContent.Create(new { Status = status })
        };
        ApplyIncomingAuth(request);
        using var response = await _httpClient.SendAsync(request);
        return response.IsSuccessStatusCode;
    }

    public Task<ProxyResult> GetRawAsync(string path)
        => SendAsync(HttpMethod.Get, path, null);

    public Task<ProxyResult> PostAsync(string path, JsonElement? body)
        => SendAsync(HttpMethod.Post, path, body);

    public Task<ProxyResult> PutAsync(string path, JsonElement? body)
        => SendAsync(HttpMethod.Put, path, body);

    private async Task<ProxyResult> SendAsync(HttpMethod method, string path, JsonElement? body)
    {
        using var request = new HttpRequestMessage(method, path);
        ApplyIncomingAuth(request);

        if (body.HasValue)
        {
            request.Content = new StringContent(
                body.Value.GetRawText(), Encoding.UTF8, "application/json");
        }

        using var response = await _httpClient.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        return new ProxyResult(
            (int)response.StatusCode,
            string.IsNullOrWhiteSpace(content) ? null : content,
            response.Content.Headers.ContentType?.MediaType ?? "application/json");
    }

    private void ApplyIncomingAuth(HttpRequestMessage request)
    {
        var auth = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(auth))
            request.Headers.TryAddWithoutValidation("Authorization", auth);
    }
}
