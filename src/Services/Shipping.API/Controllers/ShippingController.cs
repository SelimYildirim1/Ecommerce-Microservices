using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shipping.API.Data;
using Shipping.API.Entities;
using Shipping.API.Models;

namespace Shipping.API.Controllers;

/// <summary>Magaza tarafi: checkout'ta kargo secenekleri.</summary>
[Route("api/shipping")]
[ApiController]
public class ShippingController : ControllerBase
{
    private readonly ShippingDbContext _context;

    public ShippingController(ShippingDbContext context)
    {
        _context = context;
    }

    [HttpPost("quote")]
    public async Task<ActionResult<List<ShippingOptionDto>>> Quote(
        [FromBody] ShippingQuoteRequest request)
    {
        var settings = await _context.Settings.AsNoTracking().FirstOrDefaultAsync()
                       ?? new ShippingSettings();

        var carriers = await _context.Carriers
            .AsNoTracking()
            .Include(c => c.Rates)
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync();

        var desi = request.Desi
                   ?? settings.DefaultDesiPerItem * Math.Max(1, request.ItemCount);

        var freeThresholdMet =
            settings.FreeShippingThreshold > 0 && request.Subtotal >= settings.FreeShippingThreshold;

        var options = carriers.Select(carrier =>
        {
            var price = ResolvePrice(carrier, desi, request.Subtotal, settings.DefaultPrice);
            var isFree = freeThresholdMet || price <= 0;

            return new ShippingOptionDto(
                carrier.Id,
                carrier.Name,
                carrier.Code,
                carrier.LogoUrl,
                isFree ? 0 : price,
                isFree,
                carrier.EstimatedDays,
                isFree && freeThresholdMet
                    ? $"{settings.FreeShippingThreshold:N0} TL üzeri kargo bedava"
                    : null);
        }).ToList();

        return Ok(options);
    }

    [HttpGet("settings")]
    public async Task<ActionResult<ShippingSettingsDto>> GetSettings()
    {
        var settings = await _context.Settings.AsNoTracking().FirstOrDefaultAsync()
                       ?? new ShippingSettings();

        return Ok(new ShippingSettingsDto(
            settings.FreeShippingThreshold, settings.DefaultPrice, settings.DefaultDesiPerItem));
    }

    [HttpGet("track/{trackingNumber}")]
    public async Task<ActionResult<ShipmentDto>> Track(string trackingNumber)
    {
        var shipment = await _context.Shipments
            .AsNoTracking()
            .Include(s => s.Carrier)
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingNumber);

        if (shipment is null) return NotFound("Takip numarası bulunamadı.");

        return Ok(ShipmentMapper.Map(shipment));
    }

    /// <summary>
    /// Desi ve sepet tutarina uyan en dusuk ucretli kural secilir.
    /// Kural yoksa varsayilan ucret uygulanir.
    /// </summary>
    internal static decimal ResolvePrice(
        Carrier carrier, decimal desi, decimal subtotal, decimal defaultPrice)
    {
        var match = carrier.Rates
            .Where(r => r.IsActive)
            .Where(r => desi >= r.MinDesi && desi <= r.MaxDesi)
            .Where(r => subtotal >= r.MinBasketAmount)
            .Where(r => r.MaxBasketAmount <= 0 || subtotal <= r.MaxBasketAmount)
            .OrderBy(r => r.Price)
            .FirstOrDefault();

        return match?.Price ?? defaultPrice;
    }
}

internal static class ShipmentMapper
{
    public static ShipmentDto Map(Shipment s)
    {
        var trackingUrl = BuildTrackingUrl(s);

        return new ShipmentDto(
            s.Id, s.OrderId, s.UserName, s.CarrierId, s.Carrier?.Name,
            s.TrackingNumber, trackingUrl, s.Status, TurkishStatus(s.Status),
            s.ShippingCost, s.RecipientName, s.AddressLine, s.City,
            s.CreatedAt, s.ShippedAt, s.DeliveredAt);
    }

    private static string? BuildTrackingUrl(Shipment s)
    {
        if (string.IsNullOrWhiteSpace(s.TrackingNumber)) return null;
        if (string.IsNullOrWhiteSpace(s.Carrier?.TrackingUrlTemplate)) return null;

        return s.Carrier.TrackingUrlTemplate.Replace("{trackingNumber}", s.TrackingNumber);
    }

    public static string TurkishStatus(ShipmentStatus status) => status switch
    {
        ShipmentStatus.Pending => "Beklemede",
        ShipmentStatus.Preparing => "Hazırlanıyor",
        ShipmentStatus.Shipped => "Kargoya Verildi",
        ShipmentStatus.InTransit => "Yolda",
        ShipmentStatus.Delivered => "Teslim Edildi",
        ShipmentStatus.Returned => "İade Edildi",
        ShipmentStatus.Cancelled => "İptal Edildi",
        _ => status.ToString()
    };
}
