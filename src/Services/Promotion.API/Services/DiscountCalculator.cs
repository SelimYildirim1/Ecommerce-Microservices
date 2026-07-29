using Promotion.API.Entities;
using Promotion.API.Models;

namespace Promotion.API.Services;

/// <summary>
/// Indirim tutarini hesaplar. Kupon ve kampanya ayni kurallari paylastigi icin
/// ortak bir sozlesme uzerinden calisir.
/// </summary>
public static class DiscountCalculator
{
    public readonly record struct Rule(
        DiscountType DiscountType,
        decimal Value,
        decimal MinBasketAmount,
        decimal MaxDiscountAmount,
        string? CategoryIds,
        string? ProductIds,
        DateTime ValidFrom,
        DateTime ValidTo,
        bool IsActive);

    public static Rule ToRule(Coupon c) => new(
        c.DiscountType, c.Value, c.MinBasketAmount, c.MaxDiscountAmount,
        c.CategoryIds, c.ProductIds, c.ValidFrom, c.ValidTo, c.IsActive);

    public static Rule ToRule(Campaign c) => new(
        c.DiscountType, c.Value, c.MinBasketAmount, c.MaxDiscountAmount,
        c.CategoryIds, c.ProductIds, c.ValidFrom, c.ValidTo, c.IsActive);

    public static bool IsWithinDateRange(Rule rule, DateTime now)
        => rule.IsActive && rule.ValidFrom <= now && rule.ValidTo >= now;

    /// <summary>
    /// Indirimin uygulanacagi tutar. Kategori/urun kisiti varsa yalnizca
    /// eslesen satirlarin toplami, yoksa sepetin tamami.
    /// </summary>
    public static decimal GetEligibleAmount(
        Rule rule, decimal subtotal, IReadOnlyList<BasketLineDto>? items)
    {
        var categoryFilter = SplitIds(rule.CategoryIds);
        var productFilter = SplitIds(rule.ProductIds);

        if (categoryFilter.Count == 0 && productFilter.Count == 0) return subtotal;
        if (items is null || items.Count == 0) return 0;

        return items
            .Where(i =>
                (productFilter.Count > 0 && productFilter.Contains(i.ProductId)) ||
                (categoryFilter.Count > 0 &&
                 i.CategoryId is not null &&
                 categoryFilter.Contains(i.CategoryId)))
            .Sum(i => i.Price * i.Quantity);
    }

    public static decimal Calculate(Rule rule, decimal eligibleAmount)
    {
        if (eligibleAmount <= 0) return 0;

        var discount = rule.DiscountType switch
        {
            DiscountType.Percentage => eligibleAmount * rule.Value / 100m,
            DiscountType.FixedAmount => rule.Value,
            DiscountType.FreeShipping => 0m,
            _ => 0m
        };

        if (rule.MaxDiscountAmount > 0 && discount > rule.MaxDiscountAmount)
            discount = rule.MaxDiscountAmount;

        if (discount > eligibleAmount) discount = eligibleAmount;

        return Math.Round(discount, 2, MidpointRounding.AwayFromZero);
    }

    private static HashSet<string> SplitIds(string? csv)
        => string.IsNullOrWhiteSpace(csv)
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                 .ToHashSet(StringComparer.OrdinalIgnoreCase);
}
