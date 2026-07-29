using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shipping.API.Data;
using Shipping.API.Entities;
using Shipping.API.Models;
using Shipping.API.Services;

namespace Shipping.API.Controllers;

[Route("api/admin/shipping")]
[ApiController]
public class AdminShippingController : ControllerBase
{
    private readonly ShippingDbContext _context;
    private readonly CarrierAdapterFactory _adapters;

    public AdminShippingController(ShippingDbContext context, CarrierAdapterFactory adapters)
    {
        _context = context;
        _adapters = adapters;
    }

    // --- Kargo firmalari ---

    [HttpGet("carriers")]
    public async Task<ActionResult<List<CarrierDto>>> GetCarriers()
    {
        var carriers = await _context.Carriers
            .AsNoTracking()
            .Include(c => c.Rates)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(carriers.Select(MapCarrier).ToList());
    }

    [HttpPost("carriers")]
    public async Task<IActionResult> CreateCarrier([FromBody] SaveCarrierRequest request)
    {
        var code = request.Code.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(code)) return BadRequest("Kargo firması kodu zorunludur.");

        if (await _context.Carriers.AnyAsync(c => c.Code == code))
            return BadRequest("Bu kod zaten kullanılıyor.");

        var carrier = new Carrier { Code = code };
        ApplyCarrier(carrier, request);

        _context.Carriers.Add(carrier);
        await _context.SaveChangesAsync();

        return Ok(new { carrier.Id, carrier.Name });
    }

    [HttpPut("carriers/{id:guid}")]
    public async Task<IActionResult> UpdateCarrier(Guid id, [FromBody] SaveCarrierRequest request)
    {
        var carrier = await _context.Carriers.FindAsync(id);
        if (carrier is null) return NotFound();

        var code = request.Code.Trim().ToLowerInvariant();

        if (await _context.Carriers.AnyAsync(c => c.Id != id && c.Code == code))
            return BadRequest("Bu kod zaten kullanılıyor.");

        carrier.Code = code;
        ApplyCarrier(carrier, request);
        carrier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { carrier.Id });
    }

    [HttpDelete("carriers/{id:guid}")]
    public async Task<IActionResult> DeleteCarrier(Guid id)
    {
        var carrier = await _context.Carriers.FindAsync(id);
        if (carrier is null) return NotFound();

        if (await _context.Shipments.AnyAsync(s => s.CarrierId == id))
            return BadRequest("Gönderisi olan kargo firması silinemez. Pasife alabilirsiniz.");

        _context.Carriers.Remove(carrier);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Fiyat kurallari ---

    [HttpPost("carriers/{carrierId:guid}/rates")]
    public async Task<IActionResult> CreateRate(
        Guid carrierId, [FromBody] SaveShippingRateRequest request)
    {
        if (!await _context.Carriers.AnyAsync(c => c.Id == carrierId))
            return NotFound("Kargo firması bulunamadı.");

        var rate = new ShippingRate { CarrierId = carrierId };
        ApplyRate(rate, request);

        _context.ShippingRates.Add(rate);
        await _context.SaveChangesAsync();

        return Ok(new { rate.Id });
    }

    [HttpPut("rates/{id:guid}")]
    public async Task<IActionResult> UpdateRate(Guid id, [FromBody] SaveShippingRateRequest request)
    {
        var rate = await _context.ShippingRates.FindAsync(id);
        if (rate is null) return NotFound();

        ApplyRate(rate, request);
        rate.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { rate.Id });
    }

    [HttpDelete("rates/{id:guid}")]
    public async Task<IActionResult> DeleteRate(Guid id)
    {
        var rate = await _context.ShippingRates.FindAsync(id);
        if (rate is null) return NotFound();

        _context.ShippingRates.Remove(rate);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Ayarlar ---

    [HttpGet("settings")]
    public async Task<ActionResult<ShippingSettingsDto>> GetSettings()
    {
        var settings = await _context.Settings.AsNoTracking().FirstOrDefaultAsync()
                       ?? new ShippingSettings();

        return Ok(new ShippingSettingsDto(
            settings.FreeShippingThreshold, settings.DefaultPrice, settings.DefaultDesiPerItem));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] ShippingSettingsDto request)
    {
        var settings = await _context.Settings.FirstOrDefaultAsync();

        if (settings is null)
        {
            settings = new ShippingSettings();
            _context.Settings.Add(settings);
        }

        settings.FreeShippingThreshold = request.FreeShippingThreshold;
        settings.DefaultPrice = request.DefaultPrice;
        settings.DefaultDesiPerItem = request.DefaultDesiPerItem;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(request);
    }

    // --- Gonderiler ---

    [HttpGet("shipments")]
    public async Task<ActionResult<List<ShipmentDto>>> GetShipments([FromQuery] string? orderId)
    {
        var query = _context.Shipments.AsNoTracking().Include(s => s.Carrier).AsQueryable();

        if (!string.IsNullOrWhiteSpace(orderId))
            query = query.Where(s => s.OrderId == orderId);

        var shipments = await query.OrderByDescending(s => s.CreatedAt).Take(500).ToListAsync();

        return Ok(shipments.Select(ShipmentMapper.Map).ToList());
    }

    [HttpPost("shipments")]
    public async Task<ActionResult<ShipmentDto>> CreateShipment(
        [FromBody] CreateShipmentRequest request)
    {
        var existing = await _context.Shipments
            .Include(s => s.Carrier)
            .FirstOrDefaultAsync(s => s.OrderId == request.OrderId);

        if (existing is not null) return Ok(ShipmentMapper.Map(existing));

        var shipment = new Shipment
        {
            OrderId = request.OrderId,
            UserName = request.UserName,
            CarrierId = request.CarrierId,
            ShippingCost = request.ShippingCost,
            RecipientName = request.RecipientName,
            AddressLine = request.AddressLine,
            City = request.City
        };

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();

        await _context.Entry(shipment).Reference(s => s.Carrier).LoadAsync();
        return Ok(ShipmentMapper.Map(shipment));
    }

    /// <summary>Kargo firmasindan takip numarasi alir (mock adaptor).</summary>
    [HttpPost("shipments/{id:guid}/dispatch")]
    public async Task<ActionResult<ShipmentDto>> Dispatch(Guid id)
    {
        var shipment = await _context.Shipments
            .Include(s => s.Carrier)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shipment is null) return NotFound();
        if (shipment.CarrierId is null) return BadRequest("Önce kargo firması seçilmelidir.");

        if (string.IsNullOrWhiteSpace(shipment.TrackingNumber))
        {
            var adapter = _adapters.Resolve(shipment.Carrier?.Code);
            shipment.TrackingNumber = await adapter.CreateShipmentAsync(
                shipment.OrderId, shipment.RecipientName, shipment.City);
        }

        shipment.Status = ShipmentStatus.Shipped;
        shipment.ShippedAt = DateTime.UtcNow;
        shipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ShipmentMapper.Map(shipment));
    }

    [HttpPut("shipments/{id:guid}")]
    public async Task<ActionResult<ShipmentDto>> UpdateShipment(
        Guid id, [FromBody] UpdateShipmentStatusRequest request)
    {
        var shipment = await _context.Shipments
            .Include(s => s.Carrier)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shipment is null) return NotFound();

        shipment.Status = request.Status;

        if (!string.IsNullOrWhiteSpace(request.TrackingNumber))
            shipment.TrackingNumber = request.TrackingNumber.Trim();

        if (request.Status == ShipmentStatus.Shipped && shipment.ShippedAt is null)
            shipment.ShippedAt = DateTime.UtcNow;

        if (request.Status == ShipmentStatus.Delivered && shipment.DeliveredAt is null)
            shipment.DeliveredAt = DateTime.UtcNow;

        shipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ShipmentMapper.Map(shipment));
    }

    [HttpPut("shipments/{id:guid}/carrier")]
    public async Task<IActionResult> AssignCarrier(Guid id, [FromBody] AssignCarrierRequest request)
    {
        var shipment = await _context.Shipments.FindAsync(id);
        if (shipment is null) return NotFound();

        if (!await _context.Carriers.AnyAsync(c => c.Id == request.CarrierId))
            return BadRequest("Kargo firması bulunamadı.");

        shipment.CarrierId = request.CarrierId;
        shipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { shipment.Id, shipment.CarrierId });
    }

    private static void ApplyCarrier(Carrier carrier, SaveCarrierRequest r)
    {
        carrier.Name = r.Name;
        carrier.LogoUrl = r.LogoUrl;
        carrier.TrackingUrlTemplate = r.TrackingUrlTemplate;
        carrier.EstimatedDays = r.EstimatedDays;
        carrier.IsActive = r.IsActive;
    }

    private static void ApplyRate(ShippingRate rate, SaveShippingRateRequest r)
    {
        rate.MinDesi = r.MinDesi;
        rate.MaxDesi = r.MaxDesi;
        rate.MinBasketAmount = r.MinBasketAmount;
        rate.MaxBasketAmount = r.MaxBasketAmount;
        rate.Price = r.Price;
        rate.IsActive = r.IsActive;
    }

    private static CarrierDto MapCarrier(Carrier c) => new(
        c.Id, c.Name, c.Code, c.LogoUrl, c.TrackingUrlTemplate, c.EstimatedDays, c.IsActive,
        c.Rates.OrderBy(r => r.MinDesi).Select(r => new ShippingRateDto(
            r.Id, r.CarrierId, r.MinDesi, r.MaxDesi, r.MinBasketAmount,
            r.MaxBasketAmount, r.Price, r.IsActive)).ToList());
}

public record AssignCarrierRequest(Guid CarrierId);
