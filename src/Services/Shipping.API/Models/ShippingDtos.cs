using Shipping.API.Entities;

namespace Shipping.API.Models;

public record ShippingQuoteRequest(
    decimal Subtotal,
    int ItemCount = 1,
    decimal? Desi = null,
    string? City = null);

public record ShippingOptionDto(
    Guid CarrierId,
    string CarrierName,
    string CarrierCode,
    string? LogoUrl,
    decimal Price,
    bool IsFree,
    int EstimatedDays,
    string? Note);

public record CarrierDto(
    Guid Id,
    string Name,
    string Code,
    string? LogoUrl,
    string? TrackingUrlTemplate,
    int EstimatedDays,
    bool IsActive,
    List<ShippingRateDto> Rates);

public record SaveCarrierRequest(
    string Name,
    string Code,
    string? LogoUrl,
    string? TrackingUrlTemplate,
    int EstimatedDays,
    bool IsActive);

public record ShippingRateDto(
    Guid Id,
    Guid CarrierId,
    decimal MinDesi,
    decimal MaxDesi,
    decimal MinBasketAmount,
    decimal MaxBasketAmount,
    decimal Price,
    bool IsActive);

public record SaveShippingRateRequest(
    decimal MinDesi,
    decimal MaxDesi,
    decimal MinBasketAmount,
    decimal MaxBasketAmount,
    decimal Price,
    bool IsActive);

public record ShippingSettingsDto(
    decimal FreeShippingThreshold,
    decimal DefaultPrice,
    decimal DefaultDesiPerItem);

public record ShipmentDto(
    Guid Id,
    string OrderId,
    string? UserName,
    Guid? CarrierId,
    string? CarrierName,
    string? TrackingNumber,
    string? TrackingUrl,
    ShipmentStatus Status,
    string StatusName,
    decimal ShippingCost,
    string? RecipientName,
    string? AddressLine,
    string? City,
    DateTime CreatedAt,
    DateTime? ShippedAt,
    DateTime? DeliveredAt);

public record CreateShipmentRequest(
    string OrderId,
    string? UserName,
    Guid? CarrierId,
    decimal ShippingCost,
    string? RecipientName,
    string? AddressLine,
    string? City);

public record UpdateShipmentStatusRequest(ShipmentStatus Status, string? TrackingNumber);
