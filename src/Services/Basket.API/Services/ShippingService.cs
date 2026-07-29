using System.Net.Http.Json;

namespace Basket.API.Services;

public record ShippingOptionDto(
    Guid CarrierId,
    string CarrierName,
    string CarrierCode,
    string? LogoUrl,
    decimal Price,
    bool IsFree,
    int EstimatedDays,
    string? Note);

/// <summary>
/// Shipping.API istemcisi. Servis kapaliysa kargo ucreti 0 kabul edilir,
/// checkout akisi durmaz.
/// </summary>
public class ShippingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ShippingService> _logger;

    public ShippingService(HttpClient httpClient, ILogger<ShippingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<List<ShippingOptionDto>> GetQuotesAsync(decimal subtotal, int itemCount)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/api/shipping/quote", new
            {
                subtotal,
                itemCount
            });

            if (!response.IsSuccessStatusCode) return new List<ShippingOptionDto>();

            return await response.Content.ReadFromJsonAsync<List<ShippingOptionDto>>()
                   ?? new List<ShippingOptionDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Kargo servisine ulaşılamadı.");
            return new List<ShippingOptionDto>();
        }
    }

    public async Task CreateShipmentAsync(
        string orderId, string? userName, Guid? carrierId, decimal cost,
        string? recipientName, string? addressLine)
    {
        try
        {
            await _httpClient.PostAsJsonAsync("/api/admin/shipping/shipments", new
            {
                orderId,
                userName,
                carrierId,
                shippingCost = cost,
                recipientName,
                addressLine
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gönderi kaydı oluşturulamadı: {OrderId}", orderId);
        }
    }
}
