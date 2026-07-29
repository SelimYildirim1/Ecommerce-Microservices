using Promotion.API.Entities;

namespace Promotion.API.Models;

public record BasketLineDto(
    string ProductId,
    string? CategoryId,
    decimal Price,
    int Quantity);

public record ValidateCouponRequest(
    string Code,
    string? UserName,
    decimal Subtotal,
    List<BasketLineDto>? Items);

public record DiscountResultDto(
    bool Valid,
    string? Code,
    string? Name,
    decimal DiscountAmount,
    string DiscountType,
    bool FreeShipping,
    string Message);

public record ApplicableCampaignsRequest(
    decimal Subtotal,
    List<BasketLineDto>? Items);

public record RedeemCouponRequest(
    string Code,
    string UserName,
    string? OrderId,
    decimal DiscountAmount);

public record CouponDto(
    Guid Id,
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal Value,
    decimal MinBasketAmount,
    decimal MaxDiscountAmount,
    int UsageLimit,
    int PerUserLimit,
    int UsedCount,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive,
    string? CategoryIds,
    string? ProductIds);

public record SaveCouponRequest(
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal Value,
    decimal MinBasketAmount,
    decimal MaxDiscountAmount,
    int UsageLimit,
    int PerUserLimit,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive,
    string? CategoryIds,
    string? ProductIds);

public record CampaignDto(
    Guid Id,
    string Name,
    string? Description,
    DiscountType DiscountType,
    decimal Value,
    decimal MinBasketAmount,
    decimal MaxDiscountAmount,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive,
    string? CategoryIds,
    string? ProductIds,
    int Priority);

public record SaveCampaignRequest(
    string Name,
    string? Description,
    DiscountType DiscountType,
    decimal Value,
    decimal MinBasketAmount,
    decimal MaxDiscountAmount,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive,
    string? CategoryIds,
    string? ProductIds,
    int Priority);
