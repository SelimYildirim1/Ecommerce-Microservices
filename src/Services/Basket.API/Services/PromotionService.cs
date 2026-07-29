using System.Net.Http.Json;

namespace Basket.API.Services;

public record BasketLineDto(string ProductId, string? CategoryId, decimal Price, int Quantity);

public record DiscountResultDto(
    bool Valid,
    string? Code,
    string? Name,
    decimal DiscountAmount,
    string DiscountType,
    bool FreeShipping,
    string Message);

/// <summary>
/// Promotion.API istemcisi. Servis kapaliysa akis bozulmaz; indirim uygulanmaz.
/// </summary>
public class PromotionService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PromotionService> _logger;

    public PromotionService(HttpClient httpClient, ILogger<PromotionService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<DiscountResultDto?> ValidateCouponAsync(
        string code, string? userName, decimal subtotal, List<BasketLineDto> items)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/coupons/validate", new
            {
                code,
                userName,
                subtotal,
                items
            });

            if (!response.IsSuccessStatusCode) return null;

            return await response.Content.ReadFromJsonAsync<DiscountResultDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kupon doğrulama servisine ulaşılamadı.");
            return null;
        }
    }

    public async Task<DiscountResultDto?> GetApplicableCampaignAsync(
        decimal subtotal, List<BasketLineDto> items)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/campaigns/applicable", new
            {
                subtotal,
                items
            });

            if (!response.IsSuccessStatusCode) return null;

            var result = await response.Content.ReadFromJsonAsync<DiscountResultDto>();
            return result?.Valid == true ? result : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kampanya servisine ulaşılamadı.");
            return null;
        }
    }

    public async Task RedeemAsync(string code, string userName, string? orderId, decimal amount)
    {
        try
        {
            await _httpClient.PostAsJsonAsync("/api/coupons/redeem", new
            {
                code,
                userName,
                orderId,
                discountAmount = amount
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kupon kullanım kaydı yazılamadı: {Code}", code);
        }
    }
}
