using Shopping.Aggregator.Models;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Shopping.Aggregator.Services;

public interface IIdentityService
{
    Task<List<UserDto>> GetAllUsersAsync(string? bearerToken = null);

    // Musteri yonetimi Identity.API'ye seffaf sekilde iletilir
    Task<ProxyResult> GetRawAsync(string path, string? bearerToken = null);
    Task<ProxyResult> PutAsync(string path, JsonElement? body, string? bearerToken = null);
}

public class IdentityService : IIdentityService
{
    private readonly HttpClient _httpClient;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public IdentityService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
    {
        _httpClient = httpClient;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<List<UserDto>> GetAllUsersAsync(string? bearerToken = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/users");
        ApplyAuth(request, bearerToken);
        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            return new List<UserDto>();

        var result = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        return result ?? new List<UserDto>();
    }

    public Task<ProxyResult> GetRawAsync(string path, string? bearerToken = null)
        => SendAsync(HttpMethod.Get, path, null, bearerToken);

    public Task<ProxyResult> PutAsync(string path, JsonElement? body, string? bearerToken = null)
        => SendAsync(HttpMethod.Put, path, body, bearerToken);

    private async Task<ProxyResult> SendAsync(
        HttpMethod method, string path, JsonElement? body, string? bearerToken)
    {
        using var request = new HttpRequestMessage(method, path);
        ApplyAuth(request, bearerToken);

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

    private void ApplyAuth(HttpRequestMessage request, string? bearerToken)
    {
        var token = bearerToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            var header = _httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(header) &&
                header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                token = header["Bearer ".Length..].Trim();
            }
        }

        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}
