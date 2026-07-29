using Shopping.Aggregator.Models;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace Shopping.Aggregator.Services;

/// <summary>Catalog.API'den donen ham yaniti tasir; durum kodu ve hata mesaji korunur.</summary>
public record ProxyResult(int StatusCode, string? Content, string ContentType = "application/json")
{
    /// <summary>Alt servise ulasilamadiginda kullanilan bos yanit.</summary>
    public static ProxyResult Empty { get; } = new(503, null);
}

public interface ICatalogService
{
    Task<List<ProductDto>> GetAllProductsAsync();
    Task<List<ProductDetailDto>> GetAllProductsDetailAsync();
    Task<ProductDetailDto?> GetProductByIdAsync(Guid id);
    Task<List<CategoryTreeDto>> GetCategoriesAsync();
    Task<CategoryDetailDto?> GetCategoryByIdAsync(Guid id);
    Task<List<AttributeDto>> GetAttributesAsync();
    Task<List<BrandDto>> GetBrandsAsync();

    // Yazma islemleri Catalog.API'deki admin controller'lara seffaf sekilde iletilir
    Task<ProxyResult> GetRawAsync(string path);
    Task<ProxyResult> PostAsync(string path, JsonElement? body);
    Task<ProxyResult> PutAsync(string path, JsonElement? body);
    Task<ProxyResult> DeleteAsync(string path);
}

public class CatalogService : ICatalogService
{
    private readonly HttpClient _httpClient;

    public CatalogService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public Task<ProxyResult> GetRawAsync(string path)
        => SendAsync(HttpMethod.Get, path, null);

    public Task<ProxyResult> PostAsync(string path, JsonElement? body)
        => SendAsync(HttpMethod.Post, path, body);

    public Task<ProxyResult> PutAsync(string path, JsonElement? body)
        => SendAsync(HttpMethod.Put, path, body);

    public Task<ProxyResult> DeleteAsync(string path)
        => SendAsync(HttpMethod.Delete, path, null);

    private async Task<ProxyResult> SendAsync(HttpMethod method, string path, JsonElement? body)
    {
        using var request = new HttpRequestMessage(method, path);

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

    public async Task<List<ProductDto>> GetAllProductsAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<ProductDto>>("/api/products");
        return result ?? new List<ProductDto>();
    }

    // Admin tarafi pasif urun ve varyantlari da gormeli
    public async Task<List<ProductDetailDto>> GetAllProductsDetailAsync()
    {
        var result = await _httpClient
            .GetFromJsonAsync<List<ProductDetailDto>>("/api/products?includeInactive=true");
        return result ?? new List<ProductDetailDto>();
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(Guid id)
    {
        return await _httpClient
            .GetFromJsonAsync<ProductDetailDto>($"/api/products/{id}?includeInactive=true");
    }

    public async Task<List<CategoryTreeDto>> GetCategoriesAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<CategoryTreeDto>>("/api/admin/categories");
        return result ?? new List<CategoryTreeDto>();
    }

    public async Task<CategoryDetailDto?> GetCategoryByIdAsync(Guid id)
    {
        return await _httpClient.GetFromJsonAsync<CategoryDetailDto>($"/api/admin/categories/{id}");
    }

    public async Task<List<AttributeDto>> GetAttributesAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<AttributeDto>>("/api/admin/attributes");
        return result ?? new List<AttributeDto>();
    }

    public async Task<List<BrandDto>> GetBrandsAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<BrandDto>>("/api/admin/brands");
        return result ?? new List<BrandDto>();
    }
}
