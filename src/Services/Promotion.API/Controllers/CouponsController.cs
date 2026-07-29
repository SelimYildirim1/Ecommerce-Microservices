using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Promotion.API.Data;
using Promotion.API.Entities;
using Promotion.API.Models;
using Promotion.API.Services;

namespace Promotion.API.Controllers;

/// <summary>Magaza tarafi: kupon dogrulama ve kullanim kaydi.</summary>
[Route("api/coupons")]
[ApiController]
public class CouponsController : ControllerBase
{
    private readonly PromotionDbContext _context;
    private readonly ILogger<CouponsController> _logger;

    public CouponsController(PromotionDbContext context, ILogger<CouponsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("validate")]
    public async Task<ActionResult<DiscountResultDto>> Validate([FromBody] ValidateCouponRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return Ok(Fail("Kupon kodu giriniz."));

        var code = request.Code.Trim().ToUpperInvariant();

        var coupon = await _context.Coupons
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Code.ToUpper() == code);

        if (coupon is null) return Ok(Fail("Kupon kodu bulunamadı."));

        var rule = DiscountCalculator.ToRule(coupon);
        var now = DateTime.UtcNow;

        if (!coupon.IsActive) return Ok(Fail("Bu kupon kullanıma kapalı."));
        if (coupon.ValidFrom > now) return Ok(Fail("Bu kupon henüz geçerli değil."));
        if (coupon.ValidTo < now) return Ok(Fail("Bu kuponun süresi dolmuş."));

        if (coupon.UsageLimit > 0 && coupon.UsedCount >= coupon.UsageLimit)
            return Ok(Fail("Bu kuponun kullanım hakkı dolmuş."));

        if (request.Subtotal < coupon.MinBasketAmount)
            return Ok(Fail(
                $"Bu kupon en az {coupon.MinBasketAmount:N2} TL tutarındaki sepetlerde geçerli."));

        if (coupon.PerUserLimit > 0 && !string.IsNullOrWhiteSpace(request.UserName))
        {
            var userUsage = await _context.CouponUsages
                .CountAsync(u => u.CouponId == coupon.Id && u.UserName == request.UserName);

            if (userUsage >= coupon.PerUserLimit)
                return Ok(Fail("Bu kuponu daha fazla kullanamazsınız."));
        }

        var eligible = DiscountCalculator.GetEligibleAmount(rule, request.Subtotal, request.Items);

        if (eligible <= 0)
            return Ok(Fail("Sepetinizde bu kuponun geçerli olduğu ürün bulunmuyor."));

        var discount = DiscountCalculator.Calculate(rule, eligible);
        var freeShipping = coupon.DiscountType == DiscountType.FreeShipping;

        if (discount <= 0 && !freeShipping)
            return Ok(Fail("Bu kupon sepetinize indirim sağlamıyor."));

        return Ok(new DiscountResultDto(
            true,
            coupon.Code,
            coupon.Description,
            discount,
            coupon.DiscountType.ToString(),
            freeShipping,
            freeShipping ? "Kargo bedava kuponu uygulandı." : "Kupon uygulandı."));
    }

    /// <summary>Siparis olustuktan sonra kuponun kullanildigini kaydeder.</summary>
    [HttpPost("redeem")]
    public async Task<IActionResult> Redeem([FromBody] RedeemCouponRequest request)
    {
        var code = request.Code.Trim().ToUpperInvariant();

        var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Code.ToUpper() == code);
        if (coupon is null) return NotFound("Kupon bulunamadı.");

        // Ayni siparis icin tekrar kayit acilmasin (event yeniden islenebilir)
        if (!string.IsNullOrWhiteSpace(request.OrderId))
        {
            var already = await _context.CouponUsages
                .AnyAsync(u => u.CouponId == coupon.Id && u.OrderId == request.OrderId);

            if (already) return Ok(new { coupon.Code, coupon.UsedCount });
        }

        _context.CouponUsages.Add(new CouponUsage
        {
            CouponId = coupon.Id,
            UserName = request.UserName,
            OrderId = request.OrderId,
            DiscountAmount = request.DiscountAmount
        });

        coupon.UsedCount++;
        coupon.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Kupon kullanıldı: {Code} / {User}", coupon.Code, request.UserName);

        return Ok(new { coupon.Code, coupon.UsedCount });
    }

    /// <summary>Kod gerektirmeyen, sepete otomatik uygulanan en iyi kampanya.</summary>
    [HttpPost("/api/campaigns/applicable")]
    public async Task<ActionResult<DiscountResultDto>> ApplicableCampaign(
        [FromBody] ApplicableCampaignsRequest request)
    {
        var now = DateTime.UtcNow;

        var campaigns = await _context.Campaigns
            .AsNoTracking()
            .Where(c => c.IsActive && c.ValidFrom <= now && c.ValidTo >= now)
            .OrderByDescending(c => c.Priority)
            .ToListAsync();

        DiscountResultDto? best = null;

        foreach (var campaign in campaigns)
        {
            if (request.Subtotal < campaign.MinBasketAmount) continue;

            var rule = DiscountCalculator.ToRule(campaign);
            var eligible = DiscountCalculator.GetEligibleAmount(rule, request.Subtotal, request.Items);
            if (eligible <= 0) continue;

            var discount = DiscountCalculator.Calculate(rule, eligible);
            var freeShipping = campaign.DiscountType == DiscountType.FreeShipping;
            if (discount <= 0 && !freeShipping) continue;

            var candidate = new DiscountResultDto(
                true, null, campaign.Name, discount,
                campaign.DiscountType.ToString(), freeShipping, campaign.Name);

            if (best is null || candidate.DiscountAmount > best.DiscountAmount)
                best = candidate;
        }

        return Ok(best ?? Fail("Uygulanabilir kampanya yok."));
    }

    private static DiscountResultDto Fail(string message)
        => new(false, null, null, 0, DiscountType.FixedAmount.ToString(), false, message);
}
