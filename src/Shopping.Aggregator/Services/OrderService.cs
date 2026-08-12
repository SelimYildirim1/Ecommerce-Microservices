using Shopping.Aggregator.Models;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Shopping.Aggregator.Services;

public record BinaryProxyResult(int StatusCode, byte[]? Content, string ContentType, string? FileName);

public interface IOrderService
{
    Task<List<OrderDto>> GetAllOrdersAsync(
        DateTime? from = null,
        DateTime? to = null,
        string? status = null,
        string? search = null);
    Task<OrderDto?> GetOrderDetailAsync(Guid orderId);
    Task<bool> UpdateOrderStatusAsync(Guid orderId, string status, string? trackingNumber = null);

    // Iade akisi Order.API'ye seffaf sekilde iletilir
    Task<ProxyResult> GetRawAsync(string path);
    Task<ProxyResult> PostAsync(string path, JsonElement? body);
    Task<ProxyResult> PutAsync(string path, JsonElement? body);
    Task<BinaryProxyResult> GetBinaryAsync(string path);
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

    public async Task<List<OrderDto>> GetAllOrdersAsync(
        DateTime? from = null,
        DateTime? to = null,
        string? status = null,
        string? search = null)
    {
        var qs = new List<string>();
        if (from.HasValue) qs.Add($"from={Uri.EscapeDataString(from.Value.ToString("o"))}");
        if (to.HasValue) qs.Add($"to={Uri.EscapeDataString(to.Value.ToString("o"))}");
        if (!string.IsNullOrWhiteSpace(status)) qs.Add($"status={Uri.EscapeDataString(status)}");
        if (!string.IsNullOrWhiteSpace(search)) qs.Add($"search={Uri.EscapeDataString(search)}");
        var path = qs.Count == 0 ? "/api/orders/all" : $"/api/orders/all?{string.Join("&", qs)}";

        using var request = new HttpRequestMessage(HttpMethod.Get, path);
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

    public async Task<bool> UpdateOrderStatusAsync(Guid orderId, string status, string? trackingNumber = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/api/orders/{orderId}/status")
        {
            Content = JsonContent.Create(new { Status = status, TrackingNumber = trackingNumber })
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

    public async Task<BinaryProxyResult> GetBinaryAsync(string path)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        ApplyIncomingAuth(request);
        using var response = await _httpClient.SendAsync(request);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
        string? fileName = null;
        if (response.Content.Headers.ContentDisposition?.FileNameStar is { Length: > 0 } star)
            fileName = star;
        else if (response.Content.Headers.ContentDisposition?.FileName is { Length: > 0 } name)
            fileName = name.Trim('"');

        return new BinaryProxyResult(
            (int)response.StatusCode,
            bytes.Length == 0 ? null : bytes,
            contentType,
            fileName);
    }

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
