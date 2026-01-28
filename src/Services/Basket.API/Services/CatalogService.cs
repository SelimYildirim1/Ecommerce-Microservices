using System.Text.Json;
using Basket.API.Models; // <-- DTO'yu buradan çekiyoruz

namespace Basket.API.Services;

public class CatalogService
{
    private readonly HttpClient _httpClient;

    public CatalogService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<CatalogProductDto?> GetProduct(string productId)
    {
        // Hata yönetimi: ID boşsa veya Guid formatında değilse null dön
        if (string.IsNullOrEmpty(productId)) return null;

        // Guid formatında mı kontrol et
        if (!Guid.TryParse(productId, out _))
        {
            return null;
        }

        try 
        {
            var response = await _httpClient.GetAsync($"/api/products/{productId}");

            if (!response.IsSuccessStatusCode)
            {
                return null; 
            }

            var responseString = await response.Content.ReadAsStringAsync();
            
            var options = new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            };
            
            return JsonSerializer.Deserialize<CatalogProductDto>(responseString, options);
        }
        catch
        {
            // Catalog API kapalıysa veya hata varsa null dön, akışı bozma
            return null;
        }
    }
}