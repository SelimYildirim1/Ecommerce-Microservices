using Shopping.Aggregator.Models;
using System.Net.Http.Json;

namespace Shopping.Aggregator.Services;

public interface ICatalogService
{
    Task<List<ProductDto>> GetAllProductsAsync();
    Task<List<ProductDetailDto>> GetAllProductsDetailAsync();
    Task<ProductDetailDto?> GetProductByIdAsync(Guid id);
    Task<List<CategoryTreeDto>> GetCategoriesAsync();
    Task<CategoryDetailDto?> GetCategoryByIdAsync(Guid id);
    Task<List<AttributeDto>> GetAttributesAsync();
    Task<List<BrandDto>> GetBrandsAsync();
}

public class CatalogService : ICatalogService
{
    private readonly HttpClient _httpClient;

    public CatalogService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<ProductDto>> GetAllProductsAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<ProductDto>>("/api/products");
        return result ?? new List<ProductDto>();
    }

    public async Task<List<ProductDetailDto>> GetAllProductsDetailAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<ProductDetailDto>>("/api/products");
        return result ?? new List<ProductDetailDto>();
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(Guid id)
    {
        return await _httpClient.GetFromJsonAsync<ProductDetailDto>($"/api/products/{id}");
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
